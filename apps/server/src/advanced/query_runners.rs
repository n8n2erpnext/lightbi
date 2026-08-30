//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

pub(super) async fn run_postgres_query(
    pool: PgPool,
    run_id: String,
    sql: String,
    limit: usize,
    offset: usize,
    sort: Option<QuerySortRequest>,
    filter_tree: Option<QueryFilterGroup>,
) -> Result<QueryResponse, ApiError> {
    let mut tx = pool.begin().await.map_err(|error| {
        ApiError::database(format!("Could not start query transaction: {error}"))
    })?;
    sqlx::query("SET TRANSACTION READ ONLY")
        .execute(&mut *tx)
        .await
        .map_err(|error| {
            ApiError::database(format!("Could not enable read-only transaction: {error}"))
        })?;
    sqlx::query(AssertSqlSafe(format!(
        "SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT_MS}ms'"
    )))
    .execute(&mut *tx)
    .await
    .map_err(|error| ApiError::database(format!("Could not set query timeout: {error}")))?;

    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = (&mut *tx)
        .describe(AssertSqlSafe(describe_sql).into_sql_str())
        .await
        .map_err(|error| {
            ApiError::database(format!("Could not describe PostgreSQL result: {error}"))
        })?;
    let columns: Vec<QueryColumn> = description
        .columns()
        .iter()
        .enumerate()
        .map(|(index, column)| {
            let native_type = column.type_info().name().to_string();
            QueryColumn {
                id: format!("column:{index}:{}", column.name()),
                name: column.name().to_string(),
                logical_type: logical_type(&native_type),
                native_type,
            }
        })
        .collect();
    let names = columns
        .iter()
        .map(|column| column.name.clone())
        .collect::<Vec<_>>();
    validate_filter_tree(&names, &filter_tree)?;
    if let Some(sort) = &sort {
        if !description
            .columns()
            .iter()
            .any(|column| column.name() == sort.column)
        {
            return Err(ApiError::bad_request(
                "ADVANCED_SORT_COLUMN_INVALID",
                "Sort column is not present in this result.",
            ));
        }
    }

    let mut builder =
        QueryBuilder::<Postgres>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    if let Some(group) = &filter_tree {
        builder.push(" WHERE ");
        push_pg_filter_node(&mut builder, &QueryFilterNode::Group(group.clone()));
    }
    if let Some(sort) = sort {
        builder
            .push(" ORDER BY ")
            .push(quote_pg_identifier(&sort.column))
            .push(match sort.direction {
                SortDirection::Asc => " ASC NULLS LAST",
                SortDirection::Desc => " DESC NULLS LAST",
            });
    }
    builder
        .push(" LIMIT ")
        .push_bind((limit + 1) as i64)
        .push(" OFFSET ")
        .push_bind(offset as i64);
    let started_at = Instant::now();
    let mut rows = builder
        .build()
        .fetch_all(&mut *tx)
        .await
        .map_err(|error| ApiError::database(format!("PostgreSQL query failed: {error}")))?;
    tx.rollback().await.ok();

    let truncated = rows.len() > limit;
    rows.truncate(limit);
    let values = rows
        .iter()
        .map(|row| {
            row.columns()
                .iter()
                .enumerate()
                .map(|(index, column)| pg_cell(row, index, column.type_info().name()))
                .collect()
        })
        .collect();

    Ok(QueryResponse {
        run_id,
        columns,
        rows: values,
        page: QueryPage {
            offset,
            limit,
            has_more: truncated,
        },
        truncated,
        warnings: if truncated {
            vec![format!("Result limited to {limit} rows.")]
        } else {
            Vec::new()
        },
        execution_ms: started_at.elapsed().as_millis() as u64,
    })
}

pub(super) async fn run_mysql_query(
    pool: MySqlPool,
    run_id: String,
    sql: String,
    limit: usize,
    offset: usize,
    sort: Option<QuerySortRequest>,
    filter_tree: Option<QueryFilterGroup>,
) -> Result<QueryResponse, ApiError> {
    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = pool
        .describe(AssertSqlSafe(describe_sql).into_sql_str())
        .await
        .map_err(|error| {
            ApiError::database(format!("Could not describe MySQL/MariaDB result: {error}"))
        })?;
    let columns: Vec<QueryColumn> = description
        .columns()
        .iter()
        .enumerate()
        .map(|(index, column)| {
            let native_type = column.type_info().name().to_string();
            QueryColumn {
                id: format!("column:{index}:{}", column.name()),
                name: column.name().to_string(),
                logical_type: logical_type_mysql(&native_type),
                native_type,
            }
        })
        .collect();
    let names = columns
        .iter()
        .map(|column| column.name.clone())
        .collect::<Vec<_>>();
    validate_controls(&names, &sort, &filter_tree)?;
    let mut builder =
        QueryBuilder::<MySql>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    if let Some(group) = &filter_tree {
        builder.push(" WHERE ");
        push_mysql_filter_node(&mut builder, &QueryFilterNode::Group(group.clone()));
    }
    if let Some(sort) = sort {
        builder
            .push(" ORDER BY ")
            .push(quote_mysql_identifier(&sort.column))
            .push(match sort.direction {
                SortDirection::Asc => " ASC",
                SortDirection::Desc => " DESC",
            });
    }
    builder
        .push(" LIMIT ")
        .push_bind((limit + 1) as i64)
        .push(" OFFSET ")
        .push_bind(offset as i64);
    let started_at = Instant::now();
    let mut rows = tokio::time::timeout(
        Duration::from_millis(STATEMENT_TIMEOUT_MS),
        builder.build().fetch_all(&pool),
    )
    .await
    .map_err(|_| ApiError::database("MySQL/MariaDB query timed out."))?
    .map_err(|error| ApiError::database(format!("MySQL/MariaDB query failed: {error}")))?;
    let truncated = rows.len() > limit;
    rows.truncate(limit);
    let values = rows
        .iter()
        .map(|row| {
            row.columns()
                .iter()
                .enumerate()
                .map(|(index, column)| mysql_cell(row, index, column.type_info().name()))
                .collect()
        })
        .collect();
    Ok(query_response(
        run_id,
        columns,
        values,
        offset,
        limit,
        truncated,
        started_at.elapsed(),
    ))
}

pub(super) async fn run_sqlite_query(
    pool: SqlitePool,
    run_id: String,
    sql: String,
    limit: usize,
    offset: usize,
    sort: Option<QuerySortRequest>,
    filter_tree: Option<QueryFilterGroup>,
) -> Result<QueryResponse, ApiError> {
    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = pool
        .describe(AssertSqlSafe(describe_sql).into_sql_str())
        .await
        .map_err(|error| {
            ApiError::database(format!("Could not describe SQLite result: {error}"))
        })?;
    let columns: Vec<QueryColumn> = description
        .columns()
        .iter()
        .enumerate()
        .map(|(index, column)| {
            let native_type = column.type_info().name().to_string();
            QueryColumn {
                id: format!("column:{index}:{}", column.name()),
                name: column.name().to_string(),
                logical_type: logical_type_sqlite(&native_type),
                native_type,
            }
        })
        .collect();
    let names = columns
        .iter()
        .map(|column| column.name.clone())
        .collect::<Vec<_>>();
    validate_controls(&names, &sort, &filter_tree)?;
    let mut builder =
        QueryBuilder::<Sqlite>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    if let Some(group) = &filter_tree {
        builder.push(" WHERE ");
        push_sqlite_filter_node(&mut builder, &QueryFilterNode::Group(group.clone()));
    }
    if let Some(sort) = sort {
        builder
            .push(" ORDER BY ")
            .push(quote_sql_identifier(&sort.column))
            .push(match sort.direction {
                SortDirection::Asc => " ASC",
                SortDirection::Desc => " DESC",
            });
    }
    builder
        .push(" LIMIT ")
        .push_bind((limit + 1) as i64)
        .push(" OFFSET ")
        .push_bind(offset as i64);
    let started_at = Instant::now();
    let mut rows = tokio::time::timeout(
        Duration::from_millis(STATEMENT_TIMEOUT_MS),
        builder.build().fetch_all(&pool),
    )
    .await
    .map_err(|_| ApiError::database("SQLite query timed out."))?
    .map_err(|error| ApiError::database(format!("SQLite query failed: {error}")))?;
    let truncated = rows.len() > limit;
    rows.truncate(limit);
    let values = rows
        .iter()
        .map(|row| {
            row.columns()
                .iter()
                .enumerate()
                .map(|(index, column)| sqlite_cell(row, index, column.type_info().name()))
                .collect()
        })
        .collect();
    Ok(query_response(
        run_id,
        columns,
        values,
        offset,
        limit,
        truncated,
        started_at.elapsed(),
    ))
}

pub(super) async fn run_sql_server_query(
    connection: SqlServerConnection,
    run_id: String,
    sql: String,
    limit: usize,
    offset: usize,
    sort: Option<QuerySortRequest>,
    filter_tree: Option<QueryFilterGroup>,
) -> Result<QueryResponse, ApiError> {
    let mut client = connect_sql_server(&connection).await?;
    let describe_sql = format!("SELECT TOP (0) * FROM ({sql}) AS [__lightbi_query]");
    let mut describe = client.simple_query(describe_sql).await.map_err(|error| {
        ApiError::database(format!("Could not describe SQL Server result: {error}"))
    })?;
    let metadata = describe
        .columns()
        .await
        .map_err(|error| {
            ApiError::database(format!(
                "Could not read SQL Server result metadata: {error}"
            ))
        })?
        .unwrap_or(&[]);
    let columns = metadata
        .iter()
        .enumerate()
        .map(|(index, column)| {
            let native_type = format!("{:?}", column.column_type());
            QueryColumn {
                id: format!("column:{index}:{}", column.name()),
                name: column.name().to_string(),
                logical_type: logical_type(&native_type),
                native_type,
            }
        })
        .collect::<Vec<_>>();
    let names = columns
        .iter()
        .map(|column| column.name.clone())
        .collect::<Vec<_>>();
    validate_controls(&names, &sort, &filter_tree)?;
    describe.into_first_result().await.map_err(|error| {
        ApiError::database(format!(
            "Could not complete SQL Server result description: {error}"
        ))
    })?;

    let order = if let Some(sort) = sort {
        format!(
            "{} {}",
            quote_sql_server_identifier(&sort.column),
            match sort.direction {
                SortDirection::Asc => "ASC",
                SortDirection::Desc => "DESC",
            },
        )
    } else {
        "(SELECT NULL)".to_string()
    };
    let filter = filter_tree
        .as_ref()
        .map(|group| format!(" WHERE {}", sql_server_filter_group(group)))
        .unwrap_or_default();
    let paged_sql = format!(
        "SELECT * FROM ({sql}) AS [__lightbi_query]{filter} ORDER BY {order} OFFSET {offset} ROWS FETCH NEXT {} ROWS ONLY",
        limit + 1,
    );
    let started_at = Instant::now();
    let mut rows = tokio::time::timeout(Duration::from_millis(STATEMENT_TIMEOUT_MS), async {
        client
            .simple_query(paged_sql)
            .await?
            .into_first_result()
            .await
    })
    .await
    .map_err(|_| ApiError::database("SQL Server query timed out."))?
    .map_err(|error| ApiError::database(format!("SQL Server query failed: {error}")))?;
    let truncated = rows.len() > limit;
    rows.truncate(limit);
    let values = rows
        .iter()
        .map(|row| {
            row.cells()
                .map(|(_, value)| sql_server_cell(value))
                .collect()
        })
        .collect();
    Ok(query_response(
        run_id,
        columns,
        values,
        offset,
        limit,
        truncated,
        started_at.elapsed(),
    ))
}
