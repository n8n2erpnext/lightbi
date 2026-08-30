//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

pub(crate) async fn get_schema(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    AxumQuery(query): AxumQuery<SchemaQuery>,
) -> Result<Json<SchemaResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    if !query.refresh {
        if let Some(cached) = state.advanced.schema_cache.read().await.get(&connection_id) {
            if cached.loaded_at.elapsed() < SCHEMA_CACHE_TTL {
                return Ok(Json(SchemaResponse {
                    connection_id: session.id,
                    connection_name: session.name,
                    database: session.database,
                    schemas: cached.schemas.clone(),
                    cached: true,
                    cache_age_ms: cached.loaded_at.elapsed().as_millis() as u64,
                }));
            }
        }
    }

    let discovery_lock = {
        let mut locks = state.advanced.schema_locks.write().await;
        locks
            .entry(connection_id.clone())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    };
    let _guard = discovery_lock.lock().await;
    if !query.refresh {
        if let Some(cached) = state.advanced.schema_cache.read().await.get(&connection_id) {
            if cached.loaded_at.elapsed() < SCHEMA_CACHE_TTL {
                return Ok(Json(SchemaResponse {
                    connection_id: session.id,
                    connection_name: session.name,
                    database: session.database,
                    schemas: cached.schemas.clone(),
                    cached: true,
                    cache_age_ms: cached.loaded_at.elapsed().as_millis() as u64,
                }));
            }
        }
    }

    let schemas = match &session.backend {
        ConnectionBackend::Postgres(pool) => discover_postgres_schema(pool).await?,
        ConnectionBackend::MySql(pool) => discover_mysql_schema(pool, &session.database).await?,
        ConnectionBackend::Sqlite(pool) => discover_sqlite_schema(pool).await?,
        ConnectionBackend::Mongo(client) => {
            discover_mongo_schema(client, &session.database).await?
        }
        ConnectionBackend::SqlServer(connection) => discover_sql_server_schema(connection).await?,
    };
    state.advanced.schema_cache.write().await.insert(
        connection_id,
        CachedSchema {
            schemas: schemas.clone(),
            loaded_at: Instant::now(),
        },
    );

    Ok(Json(SchemaResponse {
        connection_id: session.id,
        connection_name: session.name,
        database: session.database,
        schemas,
        cached: false,
        cache_age_ms: 0,
    }))
}

pub(super) async fn discover_postgres_schema(pool: &PgPool) -> Result<Vec<SchemaNode>, ApiError> {
    let rows = sqlx::query(
        r#"
        SELECT c.table_schema, c.table_name, t.table_type, c.column_name,
               c.data_type, c.udt_name, c.is_nullable, c.column_default,
               EXISTS (
                 SELECT 1 FROM information_schema.table_constraints tc
                 JOIN information_schema.key_column_usage kcu
                   ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
                 WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = c.table_schema
                   AND tc.table_name = c.table_name AND kcu.column_name = c.column_name
               ) AS primary_key,
               CASE WHEN t.table_type = 'BASE TABLE' THEN pc.reltuples::bigint ELSE NULL END AS estimated_rows,
               CASE WHEN t.table_type = 'BASE TABLE' THEN pg_total_relation_size(pc.oid)::bigint ELSE NULL END AS table_size_bytes,
               obj_description(pc.oid, 'pg_class') AS table_comment,
               col_description(pc.oid, c.ordinal_position::int) AS column_comment
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        LEFT JOIN pg_namespace pn ON pn.nspname = c.table_schema
        LEFT JOIN pg_class pc ON pc.relnamespace = pn.oid AND pc.relname = c.table_name
        WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY c.table_schema, c.table_name, c.ordinal_position
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| ApiError::database(format!("Could not load PostgreSQL schema: {error}")))?;

    let mut schemas: Vec<SchemaNode> = Vec::new();
    for row in rows {
        let schema_name: String = row.get("table_schema");
        let table_name: String = row.get("table_name");
        let schema_index = schemas
            .iter()
            .position(|item| item.name == schema_name)
            .unwrap_or_else(|| {
                schemas.push(SchemaNode {
                    name: schema_name.clone(),
                    tables: Vec::new(),
                    routines: Vec::new(),
                });
                schemas.len() - 1
            });
        let tables = &mut schemas[schema_index].tables;
        let table_index = tables
            .iter()
            .position(|item| item.name == table_name)
            .unwrap_or_else(|| {
                tables.push(TableNode {
                    name: table_name.clone(),
                    kind: row
                        .get::<String, _>("table_type")
                        .to_ascii_lowercase()
                        .replace(' ', "_"),
                    estimated_rows: row.try_get("estimated_rows").ok(),
                    table_size_bytes: row.try_get("table_size_bytes").ok(),
                    comment: row.try_get("table_comment").ok(),
                    ddl: None,
                    writable: row.get::<String, _>("table_type") == "BASE TABLE",
                    columns: Vec::new(),
                    indexes: Vec::new(),
                    foreign_keys: Vec::new(),
                });
                tables.len() - 1
            });
        let data_type: String = row.get("data_type");
        let udt_name: String = row.get("udt_name");
        tables[table_index].columns.push(ColumnNode {
            name: row.get("column_name"),
            native_type: if data_type == "USER-DEFINED" {
                udt_name
            } else {
                data_type
            },
            nullable: row.get::<String, _>("is_nullable") == "YES",
            primary_key: row.get("primary_key"),
            default_value: row.try_get("column_default").ok(),
            comment: row.try_get("column_comment").ok(),
        });
    }

    let index_rows = sqlx::query(
        "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema')",
    ).fetch_all(pool).await.map_err(|error| ApiError::database(format!("Could not load PostgreSQL indexes: {error}")))?;
    for row in index_rows {
        let schema_name: String = row.get("schemaname");
        let table_name: String = row.get("tablename");
        if let Some(table) = table_node_mut(&mut schemas, &schema_name, &table_name) {
            let definition: String = row.get("indexdef");
            table.indexes.push(IndexNode {
                name: row.get("indexname"),
                columns: Vec::new(),
                unique: definition.to_ascii_uppercase().contains("UNIQUE INDEX"),
                definition: Some(definition),
            });
        }
    }

    let fk_rows = sqlx::query(
        r#"SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname AS fk_name,
                  confrelid::regclass::text AS referenced_table, pg_get_constraintdef(con.oid) AS definition
           FROM pg_constraint con
           JOIN pg_class c ON c.oid = con.conrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE con.contype = 'f' AND n.nspname NOT IN ('pg_catalog', 'information_schema')"#,
    ).fetch_all(pool).await.map_err(|error| ApiError::database(format!("Could not load PostgreSQL foreign keys: {error}")))?;
    for row in fk_rows {
        let schema_name: String = row.get("schema_name");
        let table_name: String = row.get("table_name");
        if let Some(table) = table_node_mut(&mut schemas, &schema_name, &table_name) {
            table.foreign_keys.push(ForeignKeyNode {
                name: row.get("fk_name"),
                columns: Vec::new(),
                referenced_table: row.get("referenced_table"),
                referenced_columns: Vec::new(),
                definition: row.try_get("definition").ok(),
            });
        }
    }

    let routine_rows = sqlx::query(
        "SELECT routine_schema, routine_name, routine_type FROM information_schema.routines WHERE routine_schema NOT IN ('pg_catalog', 'information_schema')",
    ).fetch_all(pool).await.map_err(|error| ApiError::database(format!("Could not load PostgreSQL routines: {error}")))?;
    for row in routine_rows {
        let schema_name: String = row.get("routine_schema");
        if let Some(schema) = schemas
            .iter_mut()
            .find(|candidate| candidate.name == schema_name)
        {
            schema.routines.push(RoutineNode {
                name: row.get("routine_name"),
                kind: row.get::<String, _>("routine_type").to_ascii_lowercase(),
                definition: None,
            });
        }
    }

    Ok(schemas)
}

pub(super) async fn discover_mysql_schema(
    pool: &MySqlPool,
    database: &str,
) -> Result<Vec<SchemaNode>, ApiError> {
    let rows = sqlx::query(
        r#"SELECT c.TABLE_NAME AS table_name, t.TABLE_TYPE AS table_type, c.COLUMN_NAME AS column_name,
                  c.COLUMN_TYPE AS native_type, c.IS_NULLABLE AS is_nullable, c.COLUMN_KEY = 'PRI' AS primary_key,
                  c.COLUMN_DEFAULT AS column_default, c.COLUMN_COMMENT AS column_comment,
                  t.TABLE_ROWS AS estimated_rows, (t.DATA_LENGTH + t.INDEX_LENGTH) AS table_size_bytes, t.TABLE_COMMENT AS table_comment
           FROM information_schema.COLUMNS c
           JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
           WHERE c.TABLE_SCHEMA = ? ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION"#,
    ).bind(database).fetch_all(pool).await
        .map_err(|error| ApiError::database(format!("Could not load MySQL/MariaDB schema: {error}")))?;
    let mut tables = Vec::<TableNode>::new();
    for row in rows {
        let table_name: String = row.get("table_name");
        let index = tables
            .iter()
            .position(|table| table.name == table_name)
            .unwrap_or_else(|| {
                tables.push(TableNode {
                    name: table_name.clone(),
                    kind: row
                        .get::<String, _>("table_type")
                        .to_ascii_lowercase()
                        .replace(' ', "_"),
                    estimated_rows: row
                        .try_get::<u64, _>("estimated_rows")
                        .ok()
                        .and_then(|value| i64::try_from(value).ok()),
                    table_size_bytes: row
                        .try_get::<u64, _>("table_size_bytes")
                        .ok()
                        .and_then(|value| i64::try_from(value).ok()),
                    comment: row.try_get("table_comment").ok(),
                    ddl: None,
                    writable: row
                        .get::<String, _>("table_type")
                        .eq_ignore_ascii_case("BASE TABLE"),
                    columns: Vec::new(),
                    indexes: Vec::new(),
                    foreign_keys: Vec::new(),
                });
                tables.len() - 1
            });
        tables[index].columns.push(ColumnNode {
            name: row.get("column_name"),
            native_type: row.get("native_type"),
            nullable: row.get::<String, _>("is_nullable") == "YES",
            primary_key: row.get::<i64, _>("primary_key") != 0,
            default_value: row.try_get("column_default").ok(),
            comment: row.try_get("column_comment").ok(),
        });
    }
    let mut schema = SchemaNode {
        name: database.to_string(),
        tables,
        routines: Vec::new(),
    };
    let index_rows = sqlx::query(
        "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE",
    ).bind(database).fetch_all(pool).await
        .map_err(|error| ApiError::database(format!("Could not load MySQL/MariaDB indexes: {error}")))?;
    for row in index_rows {
        let table_name: String = row.get("TABLE_NAME");
        if let Some(table) = schema
            .tables
            .iter_mut()
            .find(|candidate| candidate.name == table_name)
        {
            let columns_list: Option<String> = row.try_get("columns_list").ok();
            table.indexes.push(IndexNode {
                name: row.get("INDEX_NAME"),
                columns: columns_list
                    .unwrap_or_default()
                    .split(',')
                    .map(str::to_string)
                    .collect(),
                unique: row.get::<i64, _>("NON_UNIQUE") == 0,
                definition: None,
            });
        }
    }
    let fk_rows = sqlx::query(
        "SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL",
    ).bind(database).fetch_all(pool).await
        .map_err(|error| ApiError::database(format!("Could not load MySQL/MariaDB foreign keys: {error}")))?;
    for row in fk_rows {
        let table_name: String = row.get("TABLE_NAME");
        if let Some(table) = schema
            .tables
            .iter_mut()
            .find(|candidate| candidate.name == table_name)
        {
            table.foreign_keys.push(ForeignKeyNode {
                name: row.get("CONSTRAINT_NAME"),
                columns: vec![row.get("COLUMN_NAME")],
                referenced_table: row.get("REFERENCED_TABLE_NAME"),
                referenced_columns: vec![row.get("REFERENCED_COLUMN_NAME")],
                definition: None,
            });
        }
    }
    let routine_rows = sqlx::query(
        "SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?",
    ).bind(database).fetch_all(pool).await
        .map_err(|error| ApiError::database(format!("Could not load MySQL/MariaDB routines: {error}")))?;
    for row in routine_rows {
        schema.routines.push(RoutineNode {
            name: row.get("ROUTINE_NAME"),
            kind: row.get::<String, _>("ROUTINE_TYPE").to_ascii_lowercase(),
            definition: None,
        });
    }
    Ok(vec![schema])
}

pub(super) async fn discover_sqlite_schema(pool: &SqlitePool) -> Result<Vec<SchemaNode>, ApiError> {
    let entities = sqlx::query("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .fetch_all(pool).await.map_err(|error| ApiError::database(format!("Could not load SQLite catalog: {error}")))?;
    let mut tables = Vec::new();
    for entity in entities {
        let name: String = entity.get("name");
        let kind: String = entity.get("type");
        let columns = sqlx::query(AssertSqlSafe(format!(
            "PRAGMA table_info({})",
            quote_sql_identifier(&name)
        )))
        .fetch_all(pool)
        .await
        .map_err(|error| ApiError::database(format!("Could not load SQLite columns: {error}")))?
        .into_iter()
        .map(|row| ColumnNode {
            name: row.get("name"),
            native_type: row.get::<String, _>("type"),
            nullable: row.get::<i64, _>("notnull") == 0,
            primary_key: row.get::<i64, _>("pk") > 0,
            default_value: row.try_get("dflt_value").ok(),
            comment: None,
        })
        .collect();
        let ddl = sqlx::query_scalar::<_, String>("SELECT sql FROM sqlite_master WHERE name = ?")
            .bind(&name)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();
        let mut table = TableNode {
            name,
            kind: if kind == "table" {
                "base_table".into()
            } else {
                "view".into()
            },
            estimated_rows: None,
            table_size_bytes: None,
            comment: None,
            ddl,
            writable: kind == "table",
            columns,
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
        };
        let index_rows = sqlx::query(AssertSqlSafe(format!(
            "PRAGMA index_list({})",
            quote_sql_identifier(&table.name)
        )))
        .fetch_all(pool)
        .await
        .unwrap_or_default();
        for index_row in index_rows {
            let index_name: String = index_row.get("name");
            let unique = index_row.get::<i64, _>("unique") != 0;
            let column_rows = sqlx::query(AssertSqlSafe(format!(
                "PRAGMA index_info({})",
                quote_sql_identifier(&index_name)
            )))
            .fetch_all(pool)
            .await
            .unwrap_or_default();
            table.indexes.push(IndexNode {
                name: index_name,
                columns: column_rows.into_iter().map(|row| row.get("name")).collect(),
                unique,
                definition: None,
            });
        }
        let fk_rows = sqlx::query(AssertSqlSafe(format!(
            "PRAGMA foreign_key_list({})",
            quote_sql_identifier(&table.name)
        )))
        .fetch_all(pool)
        .await
        .unwrap_or_default();
        for fk_row in fk_rows {
            table.foreign_keys.push(ForeignKeyNode {
                name: format!("fk_{}_{}", table.name, fk_row.get::<i64, _>("id")),
                columns: vec![fk_row.get("from")],
                referenced_table: fk_row.get("table"),
                referenced_columns: vec![fk_row.get("to")],
                definition: None,
            });
        }
        tables.push(table);
    }
    Ok(vec![SchemaNode {
        name: "main".to_string(),
        tables,
        routines: Vec::new(),
    }])
}

pub(super) async fn discover_mongo_schema(
    client: &MongoClient,
    database: &str,
) -> Result<Vec<SchemaNode>, ApiError> {
    let db = client.database(database);
    let names = db.list_collection_names().await.map_err(|error| {
        ApiError::database(format!("Could not list MongoDB collections: {error}"))
    })?;
    let mut tables = Vec::new();
    for name in names {
        let sample = db
            .collection::<Document>(&name)
            .find_one(Document::new())
            .await
            .map_err(|error| {
                ApiError::database(format!(
                    "Could not sample MongoDB collection {name}: {error}"
                ))
            })?;
        let columns = sample
            .unwrap_or_default()
            .iter()
            .map(|(key, value)| ColumnNode {
                name: key.clone(),
                native_type: bson_type(value).to_string(),
                nullable: true,
                primary_key: key == "_id",
                default_value: None,
                comment: None,
            })
            .collect();
        tables.push(TableNode {
            name,
            kind: "collection".to_string(),
            estimated_rows: None,
            table_size_bytes: None,
            comment: None,
            ddl: None,
            writable: false,
            columns,
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
        });
    }
    Ok(vec![SchemaNode {
        name: database.to_string(),
        tables,
        routines: Vec::new(),
    }])
}

pub(super) async fn discover_sql_server_schema(
    connection: &SqlServerConnection,
) -> Result<Vec<SchemaNode>, ApiError> {
    let mut client = connect_sql_server(connection).await?;
    let rows = client
        .simple_query(
            r#"SELECT c.TABLE_SCHEMA, c.TABLE_NAME, t.TABLE_TYPE, c.COLUMN_NAME,
                      c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT,
                      CASE WHEN EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                          ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                         AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
                         AND kcu.TABLE_NAME = tc.TABLE_NAME
                        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                          AND tc.TABLE_SCHEMA = c.TABLE_SCHEMA
                          AND tc.TABLE_NAME = c.TABLE_NAME
                          AND kcu.COLUMN_NAME = c.COLUMN_NAME
                      ) THEN 1 ELSE 0 END AS primary_key
               FROM INFORMATION_SCHEMA.COLUMNS c
               JOIN INFORMATION_SCHEMA.TABLES t
                 ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
               WHERE c.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
               ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION"#,
        )
        .await
        .map_err(|error| ApiError::database(format!("Could not load SQL Server schema: {error}")))?
        .into_first_result()
        .await
        .map_err(|error| {
            ApiError::database(format!("Could not read SQL Server schema: {error}"))
        })?;

    let mut schemas = Vec::<SchemaNode>::new();
    for row in rows {
        let schema_name = row
            .get::<&str, _>("TABLE_SCHEMA")
            .unwrap_or_default()
            .to_string();
        let table_name = row
            .get::<&str, _>("TABLE_NAME")
            .unwrap_or_default()
            .to_string();
        let schema_index = schemas
            .iter()
            .position(|item| item.name == schema_name)
            .unwrap_or_else(|| {
                schemas.push(SchemaNode {
                    name: schema_name.clone(),
                    tables: Vec::new(),
                    routines: Vec::new(),
                });
                schemas.len() - 1
            });
        let tables = &mut schemas[schema_index].tables;
        let table_type = row.get::<&str, _>("TABLE_TYPE").unwrap_or("BASE TABLE");
        let table_index = tables
            .iter()
            .position(|item| item.name == table_name)
            .unwrap_or_else(|| {
                tables.push(TableNode {
                    name: table_name.clone(),
                    kind: table_type.to_ascii_lowercase().replace(' ', "_"),
                    estimated_rows: None,
                    table_size_bytes: None,
                    comment: None,
                    ddl: None,
                    writable: false,
                    columns: Vec::new(),
                    indexes: Vec::new(),
                    foreign_keys: Vec::new(),
                });
                tables.len() - 1
            });
        tables[table_index].columns.push(ColumnNode {
            name: row
                .get::<&str, _>("COLUMN_NAME")
                .unwrap_or_default()
                .to_string(),
            native_type: row
                .get::<&str, _>("DATA_TYPE")
                .unwrap_or("unknown")
                .to_string(),
            nullable: row.get::<&str, _>("IS_NULLABLE").unwrap_or("YES") == "YES",
            primary_key: row.get::<i32, _>("primary_key").unwrap_or(0) != 0,
            default_value: row.get::<&str, _>("COLUMN_DEFAULT").map(str::to_string),
            comment: None,
        });
    }
    Ok(schemas)
}

pub(crate) async fn get_table_count(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    AxumQuery(query): AxumQuery<TableCountQuery>,
) -> Result<Json<TableCountResponse>, ApiError> {
    let schema = query.schema.trim().to_string();
    let table = query.table.trim().to_string();
    if schema.is_empty() || table.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_COUNT_ENTITY_REQUIRED",
            "Schema and table are required.",
        ));
    }
    let cache_key = (connection_id.clone(), schema.clone(), table.clone());
    if !query.refresh {
        if let Some(cached) = state.advanced.count_cache.read().await.get(&cache_key) {
            if cached.loaded_at.elapsed() < COUNT_CACHE_TTL {
                return Ok(Json(TableCountResponse {
                    schema,
                    table,
                    exact_rows: cached.count,
                    cached: true,
                }));
            }
        }
    }

    let session = connection(&state, &connection_id).await?;
    let count = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let exists: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)")
                .bind(&schema).bind(&table).fetch_one(pool).await
                .map_err(|error| ApiError::database(format!("Could not validate table for count: {error}")))?;
            if !exists {
                return Err(ApiError::bad_request(
                    "ADVANCED_COUNT_ENTITY_INVALID",
                    "Table is not present in the current schema catalog.",
                ));
            }
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!("Could not start count transaction: {error}"))
            })?;
            sqlx::query("SET TRANSACTION READ ONLY")
                .execute(&mut *tx)
                .await
                .map_err(|error| {
                    ApiError::database(format!("Could not enable read-only count: {error}"))
                })?;
            sqlx::query(AssertSqlSafe(format!(
                "SET LOCAL statement_timeout = '{COUNT_TIMEOUT_MS}ms'"
            )))
            .execute(&mut *tx)
            .await
            .map_err(|error| ApiError::database(format!("Could not set count timeout: {error}")))?;
            let count: i64 = sqlx::query_scalar(AssertSqlSafe(format!(
                "SELECT COUNT(*)::bigint FROM {}.{}",
                quote_pg_identifier(&schema),
                quote_pg_identifier(&table)
            )))
            .fetch_one(&mut *tx)
            .await
            .map_err(|error| {
                ApiError::database(format!("Exact row count failed or timed out: {error}"))
            })?;
            tx.rollback().await.ok();
            count
        }
        ConnectionBackend::MySql(pool) => {
            let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?")
                .bind(&schema).bind(&table).fetch_one(pool).await.map_err(|error| ApiError::database(format!("Could not validate table: {error}")))?;
            if exists == 0 {
                return Err(ApiError::bad_request(
                    "ADVANCED_COUNT_ENTITY_INVALID",
                    "Table is not present in the current schema catalog.",
                ));
            }
            let count: i64 = tokio::time::timeout(
                Duration::from_millis(COUNT_TIMEOUT_MS),
                sqlx::query_scalar(AssertSqlSafe(format!(
                    "SELECT COUNT(*) FROM {}",
                    quote_mysql_identifier(&table)
                )))
                .fetch_one(pool),
            )
            .await
            .map_err(|_| ApiError::database("MySQL/MariaDB exact count timed out."))?
            .map_err(|error| ApiError::database(format!("Exact row count failed: {error}")))?;
            count
        }
        ConnectionBackend::Sqlite(pool) => tokio::time::timeout(
            Duration::from_millis(COUNT_TIMEOUT_MS),
            sqlx::query_scalar(AssertSqlSafe(format!(
                "SELECT COUNT(*) FROM {}",
                quote_sql_identifier(&table)
            )))
            .fetch_one(pool),
        )
        .await
        .map_err(|_| ApiError::database("SQLite exact count timed out."))?
        .map_err(|error| ApiError::database(format!("Exact row count failed: {error}")))?,
        ConnectionBackend::Mongo(client) => {
            let count = tokio::time::timeout(
                Duration::from_millis(COUNT_TIMEOUT_MS),
                client
                    .database(&session.database)
                    .collection::<Document>(&table)
                    .count_documents(Document::new()),
            )
            .await
            .map_err(|_| ApiError::database("MongoDB exact count timed out."))?
            .map_err(|error| ApiError::database(format!("Exact document count failed: {error}")))?;
            i64::try_from(count).unwrap_or(i64::MAX)
        }
        ConnectionBackend::SqlServer(connection) => {
            let mut client = connect_sql_server(connection).await?;
            let exists = client
                .query(
                    "SELECT COUNT_BIG(*) AS entity_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @P1 AND TABLE_NAME = @P2",
                    &[&schema, &table],
                )
                .await
                .map_err(|error| ApiError::database(format!("Could not validate SQL Server table: {error}")))?
                .into_row()
                .await
                .map_err(|error| ApiError::database(format!("Could not read SQL Server table validation: {error}")))?
                .and_then(|row| row.get::<i64, _>("entity_count"))
                .unwrap_or(0);
            if exists == 0 {
                return Err(ApiError::bad_request(
                    "ADVANCED_COUNT_ENTITY_INVALID",
                    "Table is not present in the current SQL Server catalog.",
                ));
            }
            let sql = format!(
                "SELECT COUNT_BIG(*) AS exact_rows FROM {}.{}",
                quote_sql_server_identifier(&schema),
                quote_sql_server_identifier(&table),
            );
            tokio::time::timeout(Duration::from_millis(COUNT_TIMEOUT_MS), async {
                client.simple_query(sql).await?.into_row().await
            })
            .await
            .map_err(|_| ApiError::database("SQL Server exact count timed out."))?
            .map_err(|error| ApiError::database(format!("SQL Server exact count failed: {error}")))?
            .and_then(|row| row.get::<i64, _>("exact_rows"))
            .unwrap_or(0)
        }
    };

    state.advanced.count_cache.write().await.insert(
        cache_key,
        CachedCount {
            count,
            loaded_at: Instant::now(),
        },
    );
    Ok(Json(TableCountResponse {
        schema,
        table,
        exact_rows: count,
        cached: false,
    }))
}
