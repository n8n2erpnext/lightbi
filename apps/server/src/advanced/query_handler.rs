//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

fn validate_filter_condition(
    column_names: &[String],
    filter: &QueryFilterRequest,
) -> Result<(), ApiError> {
    if !column_names.iter().any(|name| name == &filter.column) {
        return Err(ApiError::bad_request(
            "ADVANCED_FILTER_COLUMN_INVALID",
            "Filter column is not present in this result.",
        ));
    }
    if filter.value.len() > 1_000 {
        return Err(ApiError::bad_request(
            "ADVANCED_FILTER_VALUE_TOO_LONG",
            "Filter value cannot exceed 1,000 characters.",
        ));
    }
    Ok(())
}

fn validate_filter_node(
    column_names: &[String],
    node: &QueryFilterNode,
    depth: usize,
    count: &mut usize,
) -> Result<(), ApiError> {
    if depth > 4 {
        return Err(ApiError::bad_request(
            "ADVANCED_FILTER_DEPTH",
            "Filter groups can be nested up to four levels.",
        ));
    }
    match node {
        QueryFilterNode::Condition(filter) => {
            *count += 1;
            if *count > 20 {
                return Err(ApiError::bad_request(
                    "ADVANCED_FILTER_LIMIT",
                    "A query can apply at most 20 result filters.",
                ));
            }
            validate_filter_condition(column_names, filter)
        }
        QueryFilterNode::Group(group) => {
            if group.children.is_empty() {
                return Err(ApiError::bad_request(
                    "ADVANCED_FILTER_EMPTY_GROUP",
                    "Filter groups must contain at least one condition.",
                ));
            }
            for child in &group.children {
                validate_filter_node(column_names, child, depth + 1, count)?;
            }
            Ok(())
        }
    }
}

pub(super) fn validate_filter_tree(
    column_names: &[String],
    tree: &Option<QueryFilterGroup>,
) -> Result<(), ApiError> {
    if let Some(group) = tree {
        let mut count = 0;
        validate_filter_node(
            column_names,
            &QueryFilterNode::Group(group.clone()),
            0,
            &mut count,
        )?;
    }
    Ok(())
}

pub(super) fn normalized_read_query(sql: &str) -> Result<String, ApiError> {
    let trimmed = sql.trim().trim_end_matches(';').trim();
    if trimmed.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_QUERY_EMPTY",
            "Enter a query before running it.",
        ));
    }
    let first = trimmed
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    if first != "SELECT" && first != "WITH" {
        return Err(ApiError::bad_request(
            "ADVANCED_QUERY_READ_ONLY",
            "Advanced preview only permits SELECT or WITH queries.",
        ));
    }
    Ok(trimmed.to_string())
}

pub(crate) async fn execute_query(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ExecuteQueryRequest>,
) -> Result<Json<QueryResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let sql = normalized_read_query(&request.sql)?;
    let limit = request
        .limit
        .unwrap_or(DEFAULT_ROW_LIMIT)
        .clamp(1, MAX_ROW_LIMIT);
    let offset = request.offset.unwrap_or(0).min(MAX_ROW_OFFSET);
    let run_id = request.run_id.trim().to_string();
    if run_id.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_RUN_ID_REQUIRED",
            "runId is required.",
        ));
    }

    let task_run_id = run_id.clone();
    let task = tokio::spawn(async move {
        let filter_tree = request.filter_tree.or_else(|| {
            let filters = request.filters.unwrap_or_default();
            if filters.is_empty() {
                None
            } else {
                Some(QueryFilterGroup {
                    combinator: FilterCombinator::And,
                    children: filters
                        .into_iter()
                        .map(QueryFilterNode::Condition)
                        .collect(),
                })
            }
        });
        match session.backend {
            ConnectionBackend::Postgres(pool) => {
                run_postgres_query(
                    pool,
                    task_run_id,
                    sql,
                    limit,
                    offset,
                    request.sort,
                    filter_tree,
                )
                .await
            }
            ConnectionBackend::MySql(pool) => {
                run_mysql_query(
                    pool,
                    task_run_id,
                    sql,
                    limit,
                    offset,
                    request.sort,
                    filter_tree,
                )
                .await
            }
            ConnectionBackend::Sqlite(pool) => {
                run_sqlite_query(
                    pool,
                    task_run_id,
                    sql,
                    limit,
                    offset,
                    request.sort,
                    filter_tree,
                )
                .await
            }
            ConnectionBackend::SqlServer(connection) => {
                run_sql_server_query(
                    connection,
                    task_run_id,
                    sql,
                    limit,
                    offset,
                    request.sort,
                    filter_tree,
                )
                .await
            }
            ConnectionBackend::Mongo(_) => Err(ApiError::bad_request(
                "ADVANCED_MONGO_REQUEST_REQUIRED",
                "MongoDB uses the document query endpoint.",
            )),
        }
    });
    state.advanced.runs.write().await.insert(
        run_id.clone(),
        ActiveRun {
            connection_id,
            abort_handle: task.abort_handle(),
        },
    );
    let outcome = task.await;
    state.advanced.runs.write().await.remove(&run_id);

    match outcome {
        Ok(result) => result.map(Json),
        Err(error) if error.is_cancelled() => Err(ApiError {
            status: StatusCode::CONFLICT,
            code: "ADVANCED_QUERY_CANCELLED",
            message: "Query was cancelled.".to_string(),
        }),
        Err(error) => Err(ApiError::database(format!("Query task failed: {error}"))),
    }
}

pub(crate) async fn cancel_run(
    State(state): State<Arc<AppState>>,
    Path(run_id): Path<String>,
) -> StatusCode {
    if let Some(handle) = state.advanced.runs.write().await.remove(&run_id) {
        handle.abort_handle.abort();
        StatusCode::ACCEPTED
    } else {
        StatusCode::NO_CONTENT
    }
}

pub(crate) async fn execute_document_query(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<DocumentQueryRequest>,
) -> Result<Json<QueryResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let ConnectionBackend::Mongo(client) = session.backend else {
        return Err(ApiError::bad_request(
            "ADVANCED_DOCUMENT_QUERY_UNSUPPORTED",
            "Document queries require a MongoDB session.",
        ));
    };
    let collection_name = request.collection.trim();
    if collection_name.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_MONGO_COLLECTION_REQUIRED",
            "Collection is required.",
        ));
    }
    let filter = json_document(request.filter, "filter")?;
    let projection = request
        .projection
        .map(|value| json_document(value, "projection"))
        .transpose()?;
    let sort = request
        .sort
        .map(|value| json_document(value, "sort"))
        .transpose()?;
    let limit = request
        .limit
        .unwrap_or(DEFAULT_ROW_LIMIT)
        .clamp(1, MAX_ROW_LIMIT);
    let offset = request.offset.unwrap_or(0).min(MAX_ROW_OFFSET);
    let run_id = request.run_id.trim().to_string();
    if run_id.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_RUN_ID_REQUIRED",
            "runId is required.",
        ));
    }
    let started_at = Instant::now();
    let collection = client
        .database(&session.database)
        .collection::<Document>(collection_name);
    let mut find = collection
        .find(filter)
        .limit((limit + 1) as i64)
        .skip(offset as u64);
    if let Some(projection) = projection {
        find = find.projection(projection);
    }
    if let Some(sort) = sort {
        find = find.sort(sort);
    }
    let mut cursor = tokio::time::timeout(Duration::from_millis(STATEMENT_TIMEOUT_MS), find)
        .await
        .map_err(|_| ApiError::database("MongoDB query timed out."))?
        .map_err(|error| ApiError::database(format!("MongoDB query failed: {error}")))?;
    let mut documents = Vec::new();
    while documents.len() <= limit {
        let has_next = tokio::time::timeout(
            Duration::from_millis(STATEMENT_TIMEOUT_MS),
            cursor.advance(),
        )
        .await
        .map_err(|_| ApiError::database("MongoDB cursor timed out."))?
        .map_err(|error| ApiError::database(format!("MongoDB cursor failed: {error}")))?;
        if !has_next {
            break;
        }
        documents.push(cursor.deserialize_current().map_err(|error| {
            ApiError::database(format!("Could not decode MongoDB document: {error}"))
        })?);
    }
    let truncated = documents.len() > limit;
    documents.truncate(limit);
    let mut names = Vec::<String>::new();
    for document in &documents {
        for key in document.keys() {
            if !names.contains(key) {
                names.push(key.clone());
            }
        }
    }
    let columns = names
        .iter()
        .enumerate()
        .map(|(index, name)| {
            let native = documents
                .iter()
                .find_map(|document| document.get(name))
                .map(bson_type)
                .unwrap_or("bson");
            QueryColumn {
                id: format!("column:{index}:{name}"),
                name: name.clone(),
                logical_type: logical_type_bson(native),
                native_type: native.to_string(),
            }
        })
        .collect();
    let rows = documents
        .iter()
        .map(|document| {
            names
                .iter()
                .map(|name| document.get(name).map(bson_json).unwrap_or(Value::Null))
                .collect()
        })
        .collect();
    Ok(Json(query_response(
        run_id,
        columns,
        rows,
        offset,
        limit,
        truncated,
        started_at.elapsed(),
    )))
}

fn json_document(value: Value, label: &str) -> Result<Document, ApiError> {
    if value.is_null() {
        return Ok(Document::new());
    }
    serde_json::from_value(value).map_err(|error| {
        ApiError::bad_request(
            "ADVANCED_MONGO_DOCUMENT_INVALID",
            format!("MongoDB {label} must be a JSON object: {error}"),
        )
    })
}

fn logical_type_bson(native: &str) -> &'static str {
    match native {
        "double" | "int32" | "int64" => "number",
        "boolean" => "boolean",
        "date" => "date",
        _ => "string",
    }
}

fn bson_json(value: &Bson) -> Value {
    match value {
        Bson::Double(value) => json!(value),
        Bson::String(value) => Value::String(value.clone()),
        Bson::Boolean(value) => Value::Bool(*value),
        Bson::Int32(value) => json!(value),
        Bson::Int64(value) => Value::String(value.to_string()),
        Bson::DateTime(value) => Value::String(value.to_string()),
        Bson::ObjectId(value) => Value::String(value.to_hex()),
        Bson::Null => Value::Null,
        Bson::Array(values) => Value::Array(values.iter().map(bson_json).collect()),
        Bson::Document(document) => Value::Object(
            document
                .iter()
                .map(|(key, value)| (key.clone(), bson_json(value)))
                .collect(),
        ),
        other => Value::String(other.to_string()),
    }
}

pub(crate) async fn explain_query(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ExplainQueryRequest>,
) -> Result<Json<ExplainQueryResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let sql = normalized_read_query(&request.sql)?;
    let ConnectionBackend::Postgres(pool) = session.backend else {
        return Err(ApiError::bad_request(
            "ADVANCED_EXPLAIN_UNSUPPORTED",
            "Query plan is currently available for PostgreSQL sessions.",
        ));
    };
    let mut tx = pool.begin().await.map_err(|error| {
        ApiError::database(format!("Could not start explain transaction: {error}"))
    })?;
    sqlx::query("SET TRANSACTION READ ONLY")
        .execute(&mut *tx)
        .await
        .map_err(|error| {
            ApiError::database(format!("Could not enable read-only explain: {error}"))
        })?;
    sqlx::query(AssertSqlSafe(format!(
        "SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT_MS}ms'"
    )))
    .execute(&mut *tx)
    .await
    .map_err(|error| ApiError::database(format!("Could not set explain timeout: {error}")))?;
    let started_at = Instant::now();
    let plan: Value = sqlx::query_scalar(AssertSqlSafe(format!(
        "EXPLAIN (FORMAT JSON, COSTS TRUE, VERBOSE FALSE) {sql}"
    )))
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| ApiError::database(format!("PostgreSQL explain failed: {error}")))?;
    tx.rollback().await.ok();
    Ok(Json(ExplainQueryResponse {
        plan,
        execution_ms: started_at.elapsed().as_millis() as u64,
    }))
}

pub(super) fn validate_controls(
    column_names: &[String],
    sort: &Option<QuerySortRequest>,
    filter_tree: &Option<QueryFilterGroup>,
) -> Result<(), ApiError> {
    validate_filter_tree(column_names, filter_tree)?;
    if let Some(sort) = sort {
        if !column_names.iter().any(|name| name == &sort.column) {
            return Err(ApiError::bad_request(
                "ADVANCED_SORT_COLUMN_INVALID",
                "Sort column is not present in this result.",
            ));
        }
    }
    Ok(())
}

pub(super) fn query_response(
    run_id: String,
    columns: Vec<QueryColumn>,
    rows: Vec<Vec<Value>>,
    offset: usize,
    limit: usize,
    truncated: bool,
    elapsed: Duration,
) -> QueryResponse {
    QueryResponse {
        run_id,
        columns,
        rows,
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
        execution_ms: elapsed.as_millis() as u64,
    }
}
