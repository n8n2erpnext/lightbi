use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};

use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{
    mysql::{MySqlPoolOptions, MySqlRow},
    postgres::{PgPoolOptions, PgRow},
    sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteRow},
    Column, Executor, MySql, MySqlPool, PgPool, Postgres, QueryBuilder, Row, Sqlite, SqlitePool, TypeInfo, ValueRef,
};
use mongodb::{bson::{Bson, Document}, Client as MongoClient};
use tokio::{
    sync::{Mutex, RwLock},
    task::AbortHandle,
};
use uuid::Uuid;

use crate::AppState;

const DEFAULT_ROW_LIMIT: usize = 200;
const MAX_ROW_LIMIT: usize = 1_000;
const MAX_ROW_OFFSET: usize = 10_000_000;
const STATEMENT_TIMEOUT_MS: u64 = 15_000;
const COUNT_TIMEOUT_MS: u64 = 5_000;
const SCHEMA_CACHE_TTL: Duration = Duration::from_secs(60);
const COUNT_CACHE_TTL: Duration = Duration::from_secs(300);

#[derive(Clone)]
pub(crate) struct AdvancedState {
    connections: Arc<RwLock<HashMap<String, ConnectionSession>>>,
    runs: Arc<RwLock<HashMap<String, ActiveRun>>>,
    schema_cache: Arc<RwLock<HashMap<String, CachedSchema>>>,
    schema_locks: Arc<RwLock<HashMap<String, Arc<Mutex<()>>>>>,
    count_cache: Arc<RwLock<HashMap<(String, String, String), CachedCount>>>,
}

struct CachedSchema {
    schemas: Vec<SchemaNode>,
    loaded_at: Instant,
}

struct CachedCount {
    count: i64,
    loaded_at: Instant,
}

struct ActiveRun {
    connection_id: String,
    abort_handle: AbortHandle,
}

#[derive(Clone)]
struct ConnectionSession {
    id: String,
    name: String,
    database: String,
    backend: ConnectionBackend,
}

#[derive(Clone)]
enum ConnectionBackend {
    Postgres(PgPool),
    MySql(MySqlPool),
    Sqlite(SqlitePool),
    Mongo(MongoClient),
}

impl AdvancedState {
    pub(crate) fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            runs: Arc::new(RwLock::new(HashMap::new())),
            schema_cache: Arc::new(RwLock::new(HashMap::new())),
            schema_locks: Arc::new(RwLock::new(HashMap::new())),
            count_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateConnectionRequest {
    name: String,
    connection_url: Option<String>,
    profile_id: Option<String>,
    provider: Option<String>,
    database_name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionResponse {
    connection_id: String,
    name: String,
    database: String,
    provider: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SchemaResponse {
    connection_id: String,
    connection_name: String,
    database: String,
    schemas: Vec<SchemaNode>,
    cached: bool,
    cache_age_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SchemaNode {
    name: String,
    tables: Vec<TableNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TableNode {
    name: String,
    kind: String,
    estimated_rows: Option<i64>,
    writable: bool,
    columns: Vec<ColumnNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ColumnNode {
    name: String,
    native_type: String,
    nullable: bool,
    primary_key: bool,
}

#[derive(Debug, Default, Deserialize)]
pub(crate) struct SchemaQuery {
    #[serde(default)]
    refresh: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TableCountQuery {
    schema: String,
    table: String,
    #[serde(default)]
    refresh: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TableCountResponse {
    schema: String,
    table: String,
    exact_rows: i64,
    cached: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExecuteQueryRequest {
    run_id: String,
    sql: String,
    limit: Option<usize>,
    offset: Option<usize>,
    sort: Option<QuerySortRequest>,
    filters: Option<Vec<QueryFilterRequest>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExplainQueryRequest {
    sql: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MutationRequest {
    schema: String,
    table: String,
    rows: Vec<RowMutationRequest>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RowMutationRequest {
    key: HashMap<String, Value>,
    changes: HashMap<String, Value>,
    expected: HashMap<String, Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MutationPreviewResponse {
    statements: Vec<String>,
    row_count: usize,
    can_commit: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MutationCommitResponse {
    updated_rows: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExplainQueryResponse {
    plan: Value,
    execution_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DocumentQueryRequest {
    run_id: String,
    collection: String,
    #[serde(default)]
    filter: Value,
    projection: Option<Value>,
    sort: Option<Value>,
    limit: Option<usize>,
    offset: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QuerySortRequest {
    column: String,
    direction: SortDirection,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryFilterRequest {
    column: String,
    operator: FilterOperator,
    value: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
enum FilterOperator {
    Contains,
    Equals,
    StartsWith,
    EndsWith,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct QueryResponse {
    run_id: String,
    columns: Vec<QueryColumn>,
    rows: Vec<Vec<Value>>,
    page: QueryPage,
    truncated: bool,
    warnings: Vec<String>,
    execution_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QueryColumn {
    id: String,
    name: String,
    logical_type: &'static str,
    native_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QueryPage {
    offset: usize,
    limit: usize,
    has_more: bool,
}

pub(crate) struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl ApiError {
    pub(crate) fn bad_request(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code,
            message: message.into(),
        }
    }

    fn not_found(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            code: "ADVANCED_CONNECTION_NOT_FOUND",
            message: message.into(),
        }
    }

    fn database(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_GATEWAY,
            code: "ADVANCED_DATABASE_ERROR",
            message: message.into(),
        }
    }

    pub(crate) fn storage(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            code: "ADVANCED_STORAGE_ERROR",
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({ "code": self.code, "message": self.message })),
        )
            .into_response()
    }
}

pub(crate) async fn create_connection(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateConnectionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let name = request.name.trim();
    let connection_url_owned = match request.connection_url.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => value.to_string(),
        None => crate::advanced_workspace::resolve_profile_secret(
            &state.context.sqlite_pool,
            request.profile_id.as_deref().ok_or_else(|| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", "Connection URL or profileId is required."))?,
        ).await?,
    };
    let connection_url = connection_url_owned.trim();
    if name.is_empty() || connection_url.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            "Connection name and PostgreSQL URL are required.",
        ));
    }
    let requested_provider = request.provider.as_deref().unwrap_or_default().to_ascii_lowercase();
    let (provider, database, backend) = if connection_url.starts_with("postgres://") || connection_url.starts_with("postgresql://") {
        let pool = PgPoolOptions::new().max_connections(4).acquire_timeout(Duration::from_secs(10)).connect(connection_url).await
            .map_err(|error| ApiError::database(format!("Could not connect to PostgreSQL: {error}")))?;
        let database = sqlx::query_scalar("SELECT current_database()").fetch_one(&pool).await
            .map_err(|error| ApiError::database(format!("Could not identify PostgreSQL database: {error}")))?;
        ("postgresql".to_string(), database, ConnectionBackend::Postgres(pool))
    } else if connection_url.starts_with("mysql://") {
        let pool = MySqlPoolOptions::new().max_connections(4).acquire_timeout(Duration::from_secs(10)).connect(connection_url).await
            .map_err(|error| ApiError::database(format!("Could not connect to MySQL/MariaDB: {error}")))?;
        let database: String = sqlx::query_scalar("SELECT DATABASE()").fetch_one(&pool).await
            .map_err(|error| ApiError::database(format!("Could not identify MySQL/MariaDB database: {error}")))?;
        let provider = if requested_provider == "mariadb" { "mariadb" } else { "mysql" };
        (provider.to_string(), database, ConnectionBackend::MySql(pool))
    } else if connection_url.starts_with("sqlite:") || requested_provider == "sqlite" {
        let normalized = if connection_url.starts_with("sqlite:") { connection_url.to_string() } else { format!("sqlite://{connection_url}") };
        let options: SqliteConnectOptions = normalized.parse().map_err(|error| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", format!("Invalid SQLite URL: {error}")))?;
        let pool = SqlitePoolOptions::new().max_connections(1).acquire_timeout(Duration::from_secs(10)).connect_with(options).await
            .map_err(|error| ApiError::database(format!("Could not connect to SQLite: {error}")))?;
        let database = request.database_name.clone().filter(|value| !value.trim().is_empty()).unwrap_or_else(|| "main".to_string());
        ("sqlite".to_string(), database, ConnectionBackend::Sqlite(pool))
    } else if connection_url.starts_with("mongodb://") || connection_url.starts_with("mongodb+srv://") {
        let client = MongoClient::with_uri_str(connection_url).await
            .map_err(|error| ApiError::database(format!("Could not connect to MongoDB: {error}")))?;
        let database = request.database_name.clone().filter(|value| !value.trim().is_empty())
            .or_else(|| client.default_database().map(|database| database.name().to_string()))
            .ok_or_else(|| ApiError::bad_request("ADVANCED_MONGO_DATABASE_REQUIRED", "MongoDB requires a database name in the URL or form."))?;
        client.database(&database).run_command(mongodb::bson::doc! { "ping": 1 }).await
            .map_err(|error| ApiError::database(format!("Could not ping MongoDB database: {error}")))?;
        ("mongodb".to_string(), database, ConnectionBackend::Mongo(client))
    } else {
        return Err(ApiError::bad_request("ADVANCED_CONNECTION_PROVIDER_UNSUPPORTED", "Use a PostgreSQL, MySQL/MariaDB, SQLite, or MongoDB URL."));
    };

    let id = Uuid::new_v4().to_string();
    let session = ConnectionSession {
        id: id.clone(),
        name: name.to_string(),
        database: database.clone(),
        backend,
    };
    state
        .advanced
        .connections
        .write()
        .await
        .insert(id.clone(), session);

    Ok((
        StatusCode::CREATED,
        Json(ConnectionResponse {
            connection_id: id,
            name: name.to_string(),
            database,
            provider,
        }),
    ))
}

pub(crate) async fn delete_connection(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let session = state
        .advanced
        .connections
        .write()
        .await
        .remove(&connection_id)
        .ok_or_else(|| ApiError::not_found("Connection session was not found."))?;
    state.advanced.runs.write().await.retain(|_, run| {
        if run.connection_id == connection_id {
            run.abort_handle.abort();
            false
        } else {
            true
        }
    });
    state
        .advanced
        .schema_cache
        .write()
        .await
        .remove(&connection_id);
    state
        .advanced
        .schema_locks
        .write()
        .await
        .remove(&connection_id);
    state
        .advanced
        .count_cache
        .write()
        .await
        .retain(|(id, _, _), _| id != &connection_id);
    match session.backend {
        ConnectionBackend::Postgres(pool) => pool.close().await,
        ConnectionBackend::MySql(pool) => pool.close().await,
        ConnectionBackend::Sqlite(pool) => pool.close().await,
        ConnectionBackend::Mongo(_) => {}
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn connection(state: &Arc<AppState>, id: &str) -> Result<ConnectionSession, ApiError> {
    state
        .advanced
        .connections
        .read()
        .await
        .get(id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Connection session expired or was closed."))
}

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
        ConnectionBackend::Mongo(client) => discover_mongo_schema(client, &session.database).await?,
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

async fn discover_postgres_schema(pool: &PgPool) -> Result<Vec<SchemaNode>, ApiError> {
    let rows = sqlx::query(
        r#"
        SELECT c.table_schema, c.table_name, t.table_type, c.column_name,
               c.data_type, c.udt_name, c.is_nullable,
               EXISTS (
                 SELECT 1 FROM information_schema.table_constraints tc
                 JOIN information_schema.key_column_usage kcu
                   ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
                 WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = c.table_schema
                   AND tc.table_name = c.table_name AND kcu.column_name = c.column_name
               ) AS primary_key,
               CASE WHEN t.table_type = 'BASE TABLE' THEN pc.reltuples::bigint ELSE NULL END AS estimated_rows
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
                    writable: row.get::<String, _>("table_type") == "BASE TABLE",
                    columns: Vec::new(),
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
        });
    }

    Ok(schemas)
}

async fn discover_mysql_schema(pool: &MySqlPool, database: &str) -> Result<Vec<SchemaNode>, ApiError> {
    let rows = sqlx::query(
        r#"SELECT c.TABLE_NAME AS table_name, t.TABLE_TYPE AS table_type, c.COLUMN_NAME AS column_name,
                  c.COLUMN_TYPE AS native_type, c.IS_NULLABLE AS is_nullable, c.COLUMN_KEY = 'PRI' AS primary_key,
                  t.TABLE_ROWS AS estimated_rows
           FROM information_schema.COLUMNS c
           JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
           WHERE c.TABLE_SCHEMA = ? ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION"#,
    ).bind(database).fetch_all(pool).await
        .map_err(|error| ApiError::database(format!("Could not load MySQL/MariaDB schema: {error}")))?;
    let mut tables = Vec::<TableNode>::new();
    for row in rows {
        let table_name: String = row.get("table_name");
        let index = tables.iter().position(|table| table.name == table_name).unwrap_or_else(|| {
            tables.push(TableNode {
                name: table_name.clone(),
                kind: row.get::<String, _>("table_type").to_ascii_lowercase().replace(' ', "_"),
                estimated_rows: row.try_get::<u64, _>("estimated_rows").ok().and_then(|value| i64::try_from(value).ok()),
                writable: row.get::<String, _>("table_type").eq_ignore_ascii_case("BASE TABLE"),
                columns: Vec::new(),
            });
            tables.len() - 1
        });
        tables[index].columns.push(ColumnNode {
            name: row.get("column_name"), native_type: row.get("native_type"),
            nullable: row.get::<String, _>("is_nullable") == "YES",
            primary_key: row.get::<i64, _>("primary_key") != 0,
        });
    }
    Ok(vec![SchemaNode { name: database.to_string(), tables }])
}

async fn discover_sqlite_schema(pool: &SqlitePool) -> Result<Vec<SchemaNode>, ApiError> {
    let entities = sqlx::query("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .fetch_all(pool).await.map_err(|error| ApiError::database(format!("Could not load SQLite catalog: {error}")))?;
    let mut tables = Vec::new();
    for entity in entities {
        let name: String = entity.get("name");
        let kind: String = entity.get("type");
        let columns = sqlx::query(&format!("PRAGMA table_info({})", quote_sql_identifier(&name)))
            .fetch_all(pool).await.map_err(|error| ApiError::database(format!("Could not load SQLite columns: {error}")))?
            .into_iter().map(|row| ColumnNode {
                name: row.get("name"), native_type: row.get::<String, _>("type"),
                nullable: row.get::<i64, _>("notnull") == 0,
                primary_key: row.get::<i64, _>("pk") > 0,
            }).collect();
        tables.push(TableNode { name, kind: if kind == "table" { "base_table".into() } else { "view".into() }, estimated_rows: None, writable: kind == "table", columns });
    }
    Ok(vec![SchemaNode { name: "main".to_string(), tables }])
}

async fn discover_mongo_schema(client: &MongoClient, database: &str) -> Result<Vec<SchemaNode>, ApiError> {
    let db = client.database(database);
    let names = db.list_collection_names().await
        .map_err(|error| ApiError::database(format!("Could not list MongoDB collections: {error}")))?;
    let mut tables = Vec::new();
    for name in names {
        let sample = db.collection::<Document>(&name).find_one(Document::new()).await
            .map_err(|error| ApiError::database(format!("Could not sample MongoDB collection {name}: {error}")))?;
        let columns = sample.unwrap_or_default().iter().map(|(key, value)| ColumnNode {
            name: key.clone(), native_type: bson_type(value).to_string(), nullable: true, primary_key: key == "_id",
        }).collect();
        tables.push(TableNode { name, kind: "collection".to_string(), estimated_rows: None, writable: false, columns });
    }
    Ok(vec![SchemaNode { name: database.to_string(), tables }])
}

fn bson_type(value: &Bson) -> &'static str {
    match value {
        Bson::Double(_) => "double", Bson::String(_) => "string", Bson::Array(_) => "array",
        Bson::Document(_) => "document", Bson::Boolean(_) => "boolean", Bson::DateTime(_) => "date",
        Bson::Null => "null", Bson::Int32(_) => "int32", Bson::Int64(_) => "int64",
        Bson::ObjectId(_) => "objectId", _ => "bson",
    }
}

fn quote_sql_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn validate_mutation_request(table: &TableNode, request: &MutationRequest) -> Result<Vec<String>, ApiError> {
    if !table.writable || table.kind != "base_table" {
        return Err(ApiError::bad_request("ADVANCED_MUTATION_TABLE_READ_ONLY", "Only writable base tables can be updated."));
    }
    if request.rows.is_empty() || request.rows.len() > 100 {
        return Err(ApiError::bad_request("ADVANCED_MUTATION_ROW_LIMIT", "A mutation must contain between 1 and 100 rows."));
    }
    let primary_keys = table.columns.iter().filter(|column| column.primary_key).map(|column| column.name.clone()).collect::<Vec<_>>();
    if primary_keys.is_empty() {
        return Err(ApiError::bad_request("ADVANCED_MUTATION_KEY_REQUIRED", "The table has no primary key and cannot be updated safely."));
    }
    for row in &request.rows {
        if row.changes.is_empty() || row.changes.len() > 50 {
            return Err(ApiError::bad_request("ADVANCED_MUTATION_CHANGE_LIMIT", "Each row must change between 1 and 50 columns."));
        }
        if row.key.len() != primary_keys.len() || primary_keys.iter().any(|key| !row.key.contains_key(key)) {
            return Err(ApiError::bad_request("ADVANCED_MUTATION_KEY_INCOMPLETE", "Every primary-key column is required and extra key columns are not allowed."));
        }
        for column in row.changes.keys() {
            if primary_keys.contains(column) {
                return Err(ApiError::bad_request("ADVANCED_MUTATION_PRIMARY_KEY", "Primary-key columns cannot be edited in this phase."));
            }
            if !table.columns.iter().any(|candidate| &candidate.name == column) {
                return Err(ApiError::bad_request("ADVANCED_MUTATION_COLUMN_INVALID", "A changed column is not present in the table."));
            }
            if !row.expected.contains_key(column) {
                return Err(ApiError::bad_request("ADVANCED_MUTATION_EXPECTED_REQUIRED", "Every changed column requires its expected original value."));
            }
        }
    }
    Ok(primary_keys)
}

fn sorted_keys(values: &HashMap<String, Value>) -> Vec<String> {
    let mut keys = values.keys().cloned().collect::<Vec<_>>();
    keys.sort();
    keys
}

fn sqlite_push_value(builder: &mut QueryBuilder<Sqlite>, value: &Value) {
    match value {
        Value::Null => { builder.push("NULL"); }
        Value::Bool(value) => { builder.push_bind(*value); }
        Value::Number(value) if value.is_i64() => { builder.push_bind(value.as_i64().unwrap_or_default()); }
        Value::Number(value) if value.is_u64() => { builder.push_bind(value.as_u64().unwrap_or_default() as i64); }
        Value::Number(value) => { builder.push_bind(value.as_f64().unwrap_or_default()); }
        Value::String(value) => { builder.push_bind(value.clone()); }
        other => { builder.push_bind(other.to_string()); }
    };
}

fn sqlite_push_condition(builder: &mut QueryBuilder<Sqlite>, column: &str, value: &Value) {
    builder.push(quote_sql_identifier(column));
    if value.is_null() { builder.push(" IS NULL"); } else { builder.push(" = "); sqlite_push_value(builder, value); }
}

fn sqlite_mutation_builder<'a>(request: &'a MutationRequest, row: &'a RowMutationRequest) -> QueryBuilder<'a, Sqlite> {
    let mut builder = QueryBuilder::<Sqlite>::new(format!("UPDATE {} SET ", quote_sql_identifier(&request.table)));
    for (index, column) in sorted_keys(&row.changes).iter().enumerate() {
        if index > 0 { builder.push(", "); }
        builder.push(quote_sql_identifier(column)).push(" = ");
        sqlite_push_value(&mut builder, &row.changes[column]);
    }
    builder.push(" WHERE ");
    let mut condition_index = 0;
    for column in sorted_keys(&row.key) {
        if condition_index > 0 { builder.push(" AND "); }
        sqlite_push_condition(&mut builder, &column, &row.key[&column]);
        condition_index += 1;
    }
    for column in sorted_keys(&row.changes) {
        builder.push(" AND ");
        sqlite_push_condition(&mut builder, &column, &row.expected[&column]);
    }
    builder
}

pub(crate) async fn preview_mutation(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<MutationRequest>,
) -> Result<Json<MutationPreviewResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let ConnectionBackend::Sqlite(pool) = session.backend else {
        return Err(ApiError::bad_request("ADVANCED_MUTATION_PROVIDER_UNSUPPORTED", "Source commit is currently enabled for SQLite while other providers complete acceptance."));
    };
    if request.schema != "main" { return Err(ApiError::bad_request("ADVANCED_MUTATION_SCHEMA_INVALID", "SQLite mutations require the main schema.")); }
    let schemas = discover_sqlite_schema(&pool).await?;
    let table = schemas[0].tables.iter().find(|table| table.name == request.table)
        .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
    validate_mutation_request(table, &request)?;
    let statements = request.rows.iter().map(|row| {
        let sets = sorted_keys(&row.changes).into_iter().map(|column| format!("{} = ?", quote_sql_identifier(&column))).collect::<Vec<_>>().join(", ");
        let predicates = sorted_keys(&row.key).into_iter().chain(sorted_keys(&row.changes)).map(|column| format!("{} = ?", quote_sql_identifier(&column))).collect::<Vec<_>>().join(" AND ");
        format!("UPDATE {} SET {sets} WHERE {predicates};", quote_sql_identifier(&request.table))
    }).collect();
    Ok(Json(MutationPreviewResponse { statements, row_count: request.rows.len(), can_commit: true }))
}

pub(crate) async fn commit_mutation(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<MutationRequest>,
) -> Result<Json<MutationCommitResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let ConnectionBackend::Sqlite(pool) = session.backend else {
        return Err(ApiError::bad_request("ADVANCED_MUTATION_PROVIDER_UNSUPPORTED", "Source commit is currently enabled for SQLite while other providers complete acceptance."));
    };
    if request.schema != "main" { return Err(ApiError::bad_request("ADVANCED_MUTATION_SCHEMA_INVALID", "SQLite mutations require the main schema.")); }
    let schemas = discover_sqlite_schema(&pool).await?;
    let table = schemas[0].tables.iter().find(|table| table.name == request.table)
        .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
    validate_mutation_request(table, &request)?;
    let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start mutation transaction: {error}")))?;
    let mut updated_rows = 0;
    for row in &request.rows {
        let result = sqlite_mutation_builder(&request, row).build().execute(&mut *tx).await
            .map_err(|error| ApiError::database(format!("SQLite mutation failed and was rolled back: {error}")))?;
        if result.rows_affected() != 1 {
            tx.rollback().await.ok();
            return Err(ApiError { status: StatusCode::CONFLICT, code: "ADVANCED_MUTATION_CONFLICT", message: "A row changed or disappeared after it was loaded; the entire mutation was rolled back.".to_string() });
        }
        updated_rows += 1;
    }
    tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit mutation transaction: {error}")))?;
    state.advanced.schema_cache.write().await.remove(&connection_id);
    state.advanced.count_cache.write().await.retain(|(id, _, _), _| id != &connection_id);
    Ok(Json(MutationCommitResponse { updated_rows }))
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
            if !exists { return Err(ApiError::bad_request("ADVANCED_COUNT_ENTITY_INVALID", "Table is not present in the current schema catalog.")); }
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start count transaction: {error}")))?;
            sqlx::query("SET TRANSACTION READ ONLY").execute(&mut *tx).await.map_err(|error| ApiError::database(format!("Could not enable read-only count: {error}")))?;
            sqlx::query(&format!("SET LOCAL statement_timeout = '{COUNT_TIMEOUT_MS}ms'")).execute(&mut *tx).await.map_err(|error| ApiError::database(format!("Could not set count timeout: {error}")))?;
            let count: i64 = sqlx::query_scalar(&format!("SELECT COUNT(*)::bigint FROM {}.{}", quote_pg_identifier(&schema), quote_pg_identifier(&table)))
                .fetch_one(&mut *tx).await.map_err(|error| ApiError::database(format!("Exact row count failed or timed out: {error}")))?;
            tx.rollback().await.ok(); count
        }
        ConnectionBackend::MySql(pool) => {
            let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?")
                .bind(&schema).bind(&table).fetch_one(pool).await.map_err(|error| ApiError::database(format!("Could not validate table: {error}")))?;
            if exists == 0 { return Err(ApiError::bad_request("ADVANCED_COUNT_ENTITY_INVALID", "Table is not present in the current schema catalog.")); }
            let count: i64 = tokio::time::timeout(Duration::from_millis(COUNT_TIMEOUT_MS), sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {}", quote_mysql_identifier(&table))).fetch_one(pool)).await
                .map_err(|_| ApiError::database("MySQL/MariaDB exact count timed out."))?
                .map_err(|error| ApiError::database(format!("Exact row count failed: {error}")))?;
            count
        }
        ConnectionBackend::Sqlite(pool) => tokio::time::timeout(Duration::from_millis(COUNT_TIMEOUT_MS), sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {}", quote_sql_identifier(&table))).fetch_one(pool)).await
            .map_err(|_| ApiError::database("SQLite exact count timed out."))?
            .map_err(|error| ApiError::database(format!("Exact row count failed: {error}")))?,
        ConnectionBackend::Mongo(client) => {
            let count = tokio::time::timeout(Duration::from_millis(COUNT_TIMEOUT_MS), client.database(&session.database).collection::<Document>(&table).count_documents(Document::new())).await
                .map_err(|_| ApiError::database("MongoDB exact count timed out."))?
                .map_err(|error| ApiError::database(format!("Exact document count failed: {error}")))?;
            i64::try_from(count).unwrap_or(i64::MAX)
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

fn quote_pg_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn quote_mysql_identifier(value: &str) -> String {
    format!("`{}`", value.replace('`', "``"))
}

fn normalized_read_query(sql: &str) -> Result<String, ApiError> {
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
        let filters = request.filters.unwrap_or_default();
        match session.backend {
            ConnectionBackend::Postgres(pool) => run_postgres_query(pool, task_run_id, sql, limit, offset, request.sort, filters).await,
            ConnectionBackend::MySql(pool) => run_mysql_query(pool, task_run_id, sql, limit, offset, request.sort, filters).await,
            ConnectionBackend::Sqlite(pool) => run_sqlite_query(pool, task_run_id, sql, limit, offset, request.sort, filters).await,
            ConnectionBackend::Mongo(_) => Err(ApiError::bad_request("ADVANCED_MONGO_REQUEST_REQUIRED", "MongoDB uses the document query endpoint.")),
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
        return Err(ApiError::bad_request("ADVANCED_DOCUMENT_QUERY_UNSUPPORTED", "Document queries require a MongoDB session."));
    };
    let collection_name = request.collection.trim();
    if collection_name.is_empty() { return Err(ApiError::bad_request("ADVANCED_MONGO_COLLECTION_REQUIRED", "Collection is required.")); }
    let filter = json_document(request.filter, "filter")?;
    let projection = request.projection.map(|value| json_document(value, "projection")).transpose()?;
    let sort = request.sort.map(|value| json_document(value, "sort")).transpose()?;
    let limit = request.limit.unwrap_or(DEFAULT_ROW_LIMIT).clamp(1, MAX_ROW_LIMIT);
    let offset = request.offset.unwrap_or(0).min(MAX_ROW_OFFSET);
    let run_id = request.run_id.trim().to_string();
    if run_id.is_empty() { return Err(ApiError::bad_request("ADVANCED_RUN_ID_REQUIRED", "runId is required.")); }
    let started_at = Instant::now();
    let collection = client.database(&session.database).collection::<Document>(collection_name);
    let mut find = collection.find(filter).limit((limit + 1) as i64).skip(offset as u64);
    if let Some(projection) = projection { find = find.projection(projection); }
    if let Some(sort) = sort { find = find.sort(sort); }
    let mut cursor = tokio::time::timeout(Duration::from_millis(STATEMENT_TIMEOUT_MS), find)
        .await.map_err(|_| ApiError::database("MongoDB query timed out."))?
        .map_err(|error| ApiError::database(format!("MongoDB query failed: {error}")))?;
    let mut documents = Vec::new();
    while documents.len() <= limit {
        let has_next = tokio::time::timeout(Duration::from_millis(STATEMENT_TIMEOUT_MS), cursor.advance()).await
            .map_err(|_| ApiError::database("MongoDB cursor timed out."))?
            .map_err(|error| ApiError::database(format!("MongoDB cursor failed: {error}")))?;
        if !has_next { break; }
        documents.push(cursor.deserialize_current().map_err(|error| ApiError::database(format!("Could not decode MongoDB document: {error}")))?);
    }
    let truncated = documents.len() > limit; documents.truncate(limit);
    let mut names = Vec::<String>::new();
    for document in &documents { for key in document.keys() { if !names.contains(key) { names.push(key.clone()); } } }
    let columns = names.iter().enumerate().map(|(index, name)| {
        let native = documents.iter().find_map(|document| document.get(name)).map(bson_type).unwrap_or("bson");
        QueryColumn { id: format!("column:{index}:{name}"), name: name.clone(), logical_type: logical_type_bson(native), native_type: native.to_string() }
    }).collect();
    let rows = documents.iter().map(|document| names.iter().map(|name| document.get(name).map(bson_json).unwrap_or(Value::Null)).collect()).collect();
    Ok(Json(query_response(run_id, columns, rows, offset, limit, truncated, started_at.elapsed())))
}

fn json_document(value: Value, label: &str) -> Result<Document, ApiError> {
    if value.is_null() { return Ok(Document::new()); }
    serde_json::from_value(value).map_err(|error| ApiError::bad_request("ADVANCED_MONGO_DOCUMENT_INVALID", format!("MongoDB {label} must be a JSON object: {error}")))
}

fn logical_type_bson(native: &str) -> &'static str {
    match native { "double" | "int32" | "int64" => "number", "boolean" => "boolean", "date" => "date", _ => "string" }
}

fn bson_json(value: &Bson) -> Value {
    match value {
        Bson::Double(value) => json!(value), Bson::String(value) => Value::String(value.clone()), Bson::Boolean(value) => Value::Bool(*value),
        Bson::Int32(value) => json!(value), Bson::Int64(value) => Value::String(value.to_string()), Bson::DateTime(value) => Value::String(value.to_string()),
        Bson::ObjectId(value) => Value::String(value.to_hex()), Bson::Null => Value::Null,
        Bson::Array(values) => Value::Array(values.iter().map(bson_json).collect()),
        Bson::Document(document) => Value::Object(document.iter().map(|(key, value)| (key.clone(), bson_json(value))).collect()),
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
        return Err(ApiError::bad_request("ADVANCED_EXPLAIN_UNSUPPORTED", "Query plan is currently available for PostgreSQL sessions."));
    };
    let mut tx = pool.begin().await
        .map_err(|error| ApiError::database(format!("Could not start explain transaction: {error}")))?;
    sqlx::query("SET TRANSACTION READ ONLY").execute(&mut *tx).await
        .map_err(|error| ApiError::database(format!("Could not enable read-only explain: {error}")))?;
    sqlx::query(&format!("SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT_MS}ms'"))
        .execute(&mut *tx).await
        .map_err(|error| ApiError::database(format!("Could not set explain timeout: {error}")))?;
    let started_at = Instant::now();
    let plan: Value = sqlx::query_scalar(&format!("EXPLAIN (FORMAT JSON, COSTS TRUE, VERBOSE FALSE) {sql}"))
        .fetch_one(&mut *tx).await
        .map_err(|error| ApiError::database(format!("PostgreSQL explain failed: {error}")))?;
    tx.rollback().await.ok();
    Ok(Json(ExplainQueryResponse { plan, execution_ms: started_at.elapsed().as_millis() as u64 }))
}

async fn run_postgres_query(
    pool: PgPool,
    run_id: String,
    sql: String,
    limit: usize,
    offset: usize,
    sort: Option<QuerySortRequest>,
    filters: Vec<QueryFilterRequest>,
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
    sqlx::query(&format!(
        "SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT_MS}ms'"
    ))
    .execute(&mut *tx)
    .await
    .map_err(|error| ApiError::database(format!("Could not set query timeout: {error}")))?;

    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = (&mut *tx).describe(&describe_sql).await.map_err(|error| {
        ApiError::database(format!("Could not describe PostgreSQL result: {error}"))
    })?;
    let columns = description
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
    if filters.len() > 5 {
        return Err(ApiError::bad_request(
            "ADVANCED_FILTER_LIMIT",
            "A query can apply at most five result filters.",
        ));
    }
    for filter in &filters {
        if !description
            .columns()
            .iter()
            .any(|column| column.name() == filter.column)
        {
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
    }
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
    for (index, filter) in filters.iter().enumerate() {
        builder.push(if index == 0 { " WHERE " } else { " AND " });
        builder
            .push("CAST(")
            .push(quote_pg_identifier(&filter.column))
            .push(" AS TEXT)");
        match filter.operator {
            FilterOperator::Contains => {
                builder
                    .push(" ILIKE ")
                    .push_bind(format!("%{}%", filter.value));
            }
            FilterOperator::Equals => {
                builder.push(" = ").push_bind(&filter.value);
            }
            FilterOperator::StartsWith => {
                builder
                    .push(" ILIKE ")
                    .push_bind(format!("{}%", filter.value));
            }
            FilterOperator::EndsWith => {
                builder
                    .push(" ILIKE ")
                    .push_bind(format!("%{}", filter.value));
            }
        };
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

fn validate_controls(column_names: &[String], sort: &Option<QuerySortRequest>, filters: &[QueryFilterRequest]) -> Result<(), ApiError> {
    if filters.len() > 5 { return Err(ApiError::bad_request("ADVANCED_FILTER_LIMIT", "A query can apply at most five result filters.")); }
    for filter in filters {
        if !column_names.iter().any(|name| name == &filter.column) { return Err(ApiError::bad_request("ADVANCED_FILTER_COLUMN_INVALID", "Filter column is not present in this result.")); }
        if filter.value.len() > 1_000 { return Err(ApiError::bad_request("ADVANCED_FILTER_VALUE_TOO_LONG", "Filter value cannot exceed 1,000 characters.")); }
    }
    if let Some(sort) = sort {
        if !column_names.iter().any(|name| name == &sort.column) { return Err(ApiError::bad_request("ADVANCED_SORT_COLUMN_INVALID", "Sort column is not present in this result.")); }
    }
    Ok(())
}

async fn run_mysql_query(
    pool: MySqlPool, run_id: String, sql: String, limit: usize, offset: usize,
    sort: Option<QuerySortRequest>, filters: Vec<QueryFilterRequest>,
) -> Result<QueryResponse, ApiError> {
    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = pool.describe(&describe_sql).await.map_err(|error| ApiError::database(format!("Could not describe MySQL/MariaDB result: {error}")))?;
    let columns: Vec<QueryColumn> = description.columns().iter().enumerate().map(|(index, column)| {
        let native_type = column.type_info().name().to_string();
        QueryColumn { id: format!("column:{index}:{}", column.name()), name: column.name().to_string(), logical_type: logical_type_mysql(&native_type), native_type }
    }).collect();
    let names = columns.iter().map(|column| column.name.clone()).collect::<Vec<_>>();
    validate_controls(&names, &sort, &filters)?;
    let mut builder = QueryBuilder::<MySql>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    for (index, filter) in filters.iter().enumerate() {
        builder.push(if index == 0 { " WHERE " } else { " AND " }).push("CAST(").push(quote_mysql_identifier(&filter.column)).push(" AS CHAR)");
        match filter.operator {
            FilterOperator::Contains => { builder.push(" LIKE ").push_bind(format!("%{}%", filter.value)); }
            FilterOperator::Equals => { builder.push(" = ").push_bind(&filter.value); }
            FilterOperator::StartsWith => { builder.push(" LIKE ").push_bind(format!("{}%", filter.value)); }
            FilterOperator::EndsWith => { builder.push(" LIKE ").push_bind(format!("%{}", filter.value)); }
        }
    }
    if let Some(sort) = sort { builder.push(" ORDER BY ").push(quote_mysql_identifier(&sort.column)).push(match sort.direction { SortDirection::Asc => " ASC", SortDirection::Desc => " DESC" }); }
    builder.push(" LIMIT ").push_bind((limit + 1) as i64).push(" OFFSET ").push_bind(offset as i64);
    let started_at = Instant::now();
    let mut rows = tokio::time::timeout(Duration::from_millis(STATEMENT_TIMEOUT_MS), builder.build().fetch_all(&pool)).await
        .map_err(|_| ApiError::database("MySQL/MariaDB query timed out."))?
        .map_err(|error| ApiError::database(format!("MySQL/MariaDB query failed: {error}")))?;
    let truncated = rows.len() > limit; rows.truncate(limit);
    let values = rows.iter().map(|row| row.columns().iter().enumerate().map(|(index, column)| mysql_cell(row, index, column.type_info().name())).collect()).collect();
    Ok(query_response(run_id, columns, values, offset, limit, truncated, started_at.elapsed()))
}

async fn run_sqlite_query(
    pool: SqlitePool, run_id: String, sql: String, limit: usize, offset: usize,
    sort: Option<QuerySortRequest>, filters: Vec<QueryFilterRequest>,
) -> Result<QueryResponse, ApiError> {
    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = pool.describe(&describe_sql).await.map_err(|error| ApiError::database(format!("Could not describe SQLite result: {error}")))?;
    let columns: Vec<QueryColumn> = description.columns().iter().enumerate().map(|(index, column)| {
        let native_type = column.type_info().name().to_string();
        QueryColumn { id: format!("column:{index}:{}", column.name()), name: column.name().to_string(), logical_type: logical_type_sqlite(&native_type), native_type }
    }).collect();
    let names = columns.iter().map(|column| column.name.clone()).collect::<Vec<_>>();
    validate_controls(&names, &sort, &filters)?;
    let mut builder = QueryBuilder::<Sqlite>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    for (index, filter) in filters.iter().enumerate() {
        builder.push(if index == 0 { " WHERE " } else { " AND " }).push("CAST(").push(quote_sql_identifier(&filter.column)).push(" AS TEXT)");
        match filter.operator {
            FilterOperator::Contains => { builder.push(" LIKE ").push_bind(format!("%{}%", filter.value)); }
            FilterOperator::Equals => { builder.push(" = ").push_bind(&filter.value); }
            FilterOperator::StartsWith => { builder.push(" LIKE ").push_bind(format!("{}%", filter.value)); }
            FilterOperator::EndsWith => { builder.push(" LIKE ").push_bind(format!("%{}", filter.value)); }
        }
    }
    if let Some(sort) = sort { builder.push(" ORDER BY ").push(quote_sql_identifier(&sort.column)).push(match sort.direction { SortDirection::Asc => " ASC", SortDirection::Desc => " DESC" }); }
    builder.push(" LIMIT ").push_bind((limit + 1) as i64).push(" OFFSET ").push_bind(offset as i64);
    let started_at = Instant::now();
    let mut rows = tokio::time::timeout(Duration::from_millis(STATEMENT_TIMEOUT_MS), builder.build().fetch_all(&pool)).await
        .map_err(|_| ApiError::database("SQLite query timed out."))?
        .map_err(|error| ApiError::database(format!("SQLite query failed: {error}")))?;
    let truncated = rows.len() > limit; rows.truncate(limit);
    let values = rows.iter().map(|row| row.columns().iter().enumerate().map(|(index, column)| sqlite_cell(row, index, column.type_info().name())).collect()).collect();
    Ok(query_response(run_id, columns, values, offset, limit, truncated, started_at.elapsed()))
}

fn query_response(run_id: String, columns: Vec<QueryColumn>, rows: Vec<Vec<Value>>, offset: usize, limit: usize, truncated: bool, elapsed: Duration) -> QueryResponse {
    QueryResponse { run_id, columns, rows, page: QueryPage { offset, limit, has_more: truncated }, truncated,
        warnings: if truncated { vec![format!("Result limited to {limit} rows.")] } else { Vec::new() }, execution_ms: elapsed.as_millis() as u64 }
}

fn logical_type_mysql(native: &str) -> &'static str {
    let native = native.to_ascii_uppercase();
    if native.contains("INT") || native.contains("DECIMAL") || native.contains("FLOAT") || native.contains("DOUBLE") { "number" }
    else if native.contains("DATE") || native.contains("TIME") || native.contains("YEAR") { "date" }
    else if native.contains("BOOL") || native == "TINYINT" { "boolean" } else { "string" }
}

fn logical_type_sqlite(native: &str) -> &'static str {
    match native.to_ascii_uppercase().as_str() { "INTEGER" | "REAL" | "NUMERIC" => "number", "BOOLEAN" => "boolean", "DATE" | "DATETIME" => "date", _ => "string" }
}

fn mysql_cell(row: &MySqlRow, index: usize, native: &str) -> Value {
    if row.try_get_raw(index).map(|value| value.is_null()).unwrap_or(true) { return Value::Null; }
    let upper = native.to_ascii_uppercase();
    if upper.contains("INT") { return row.try_get::<i64, _>(index).map(|value| Value::String(value.to_string())).unwrap_or_else(|_| Value::String("[unsupported value]".into())); }
    if upper.contains("FLOAT") || upper.contains("DOUBLE") { return row.try_get::<f64, _>(index).map(|value| json!(value)).unwrap_or(Value::Null); }
    if upper.contains("DECIMAL") { return row.try_get::<Decimal, _>(index).map(|value| Value::String(value.to_string())).unwrap_or(Value::Null); }
    row.try_get::<String, _>(index).map(Value::String).unwrap_or_else(|_| Value::String("[unsupported value]".into()))
}

fn sqlite_cell(row: &SqliteRow, index: usize, native: &str) -> Value {
    if row.try_get_raw(index).map(|value| value.is_null()).unwrap_or(true) { return Value::Null; }
    match native.to_ascii_uppercase().as_str() {
        "INTEGER" => row.try_get::<i64, _>(index).map(|value| Value::String(value.to_string())).unwrap_or(Value::Null),
        "REAL" => row.try_get::<f64, _>(index).map(|value| json!(value)).unwrap_or(Value::Null),
        "BOOLEAN" => row.try_get::<bool, _>(index).map(Value::Bool).unwrap_or(Value::Null),
        "BLOB" => row.try_get::<Vec<u8>, _>(index).map(|value| Value::String(format!("[binary: {} bytes]", value.len()))).unwrap_or(Value::Null),
        _ => row.try_get::<String, _>(index).map(Value::String).unwrap_or_else(|_| Value::String("[unsupported value]".into())),
    }
}

fn logical_type(native: &str) -> &'static str {
    match native {
        "BOOL" => "boolean",
        "INT2" | "INT4" | "FLOAT4" | "FLOAT8" | "OID" => "number",
        "DATE" | "TIME" | "TIMETZ" | "TIMESTAMP" | "TIMESTAMPTZ" => "date",
        _ => "string",
    }
}

fn pg_cell(row: &PgRow, index: usize, native: &str) -> Value {
    if row
        .try_get_raw(index)
        .map(|value| value.is_null())
        .unwrap_or(true)
    {
        return Value::Null;
    }
    match native {
        "BOOL" => row.try_get::<bool, _>(index).map(Value::Bool),
        "INT2" => row.try_get::<i16, _>(index).map(|value| json!(value)),
        "INT4" => row.try_get::<i32, _>(index).map(|value| json!(value)),
        "INT8" => row
            .try_get::<i64, _>(index)
            .map(|value| Value::String(value.to_string())),
        "FLOAT4" => row.try_get::<f32, _>(index).map(|value| json!(value)),
        "FLOAT8" => row.try_get::<f64, _>(index).map(|value| json!(value)),
        "NUMERIC" => row
            .try_get::<Decimal, _>(index)
            .map(|value| Value::String(value.to_string())),
        "DATE" => row
            .try_get::<NaiveDate, _>(index)
            .map(|value| Value::String(value.to_string())),
        "TIME" => row
            .try_get::<NaiveTime, _>(index)
            .map(|value| Value::String(value.to_string())),
        "TIMESTAMP" => row
            .try_get::<NaiveDateTime, _>(index)
            .map(|value| Value::String(value.to_string())),
        "TIMESTAMPTZ" => row
            .try_get::<DateTime<Utc>, _>(index)
            .map(|value| Value::String(value.to_rfc3339())),
        "UUID" => row
            .try_get::<Uuid, _>(index)
            .map(|value| Value::String(value.to_string())),
        "JSON" | "JSONB" => row
            .try_get::<Value, _>(index)
            .map(|value| Value::String(value.to_string())),
        "BYTEA" => row
            .try_get::<Vec<u8>, _>(index)
            .map(|value| Value::String(format!("[binary: {} bytes]", value.len()))),
        "OID" => row.try_get::<i32, _>(index).map(|value| json!(value)),
        _ => row.try_get::<String, _>(index).map(Value::String),
    }
    .unwrap_or_else(|_| Value::String("[unsupported value]".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_select_and_cte_queries() {
        assert!(normalized_read_query(" SELECT 1; ").is_ok());
        assert!(normalized_read_query("WITH rows AS (SELECT 1) SELECT * FROM rows").is_ok());
    }

    #[test]
    fn rejects_mutating_and_empty_queries() {
        assert!(normalized_read_query("UPDATE users SET admin = true").is_err());
        assert!(normalized_read_query("  ").is_err());
    }

    #[test]
    fn preserves_high_precision_types_as_strings() {
        assert_eq!(logical_type("INT8"), "string");
        assert_eq!(logical_type("NUMERIC"), "string");
    }

    #[test]
    fn quotes_postgres_identifiers_without_executing_input() {
        assert_eq!(quote_pg_identifier("normal"), "\"normal\"");
        assert_eq!(quote_pg_identifier("odd\"name"), "\"odd\"\"name\"");
    }

    #[test]
    fn deserializes_bounded_filter_operators() {
        let request: ExecuteQueryRequest = serde_json::from_value(json!({
            "runId": "run-1",
            "sql": "SELECT name FROM users",
            "filters": [{ "column": "name", "operator": "starts_with", "value": "A" }]
        }))
        .expect("filter request should deserialize");
        let filter = request.filters.expect("filter should exist").remove(0);
        assert!(matches!(filter.operator, FilterOperator::StartsWith));
    }

    #[tokio::test]
    async fn sqlite_mutation_requires_primary_key_and_expected_value() {
        let pool = SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.expect("sqlite pool");
        sqlx::query("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL)").execute(&pool).await.expect("create table");
        sqlx::query("INSERT INTO people (id, name) VALUES (1, 'Alice')").execute(&pool).await.expect("insert row");
        let request = MutationRequest {
            schema: "main".into(), table: "people".into(),
            rows: vec![RowMutationRequest {
                key: HashMap::from([("id".into(), json!(1))]),
                changes: HashMap::from([("name".into(), json!("Alicia"))]),
                expected: HashMap::from([("name".into(), json!("Alice"))]),
            }],
        };
        let schemas = discover_sqlite_schema(&pool).await.unwrap_or_else(|error| panic!("discover schema: {}", error.message));
        let table = schemas[0].tables.iter().find(|table| table.name == "people").expect("people table");
        assert!(table.writable);
        assert!(table.columns.iter().any(|column| column.name == "id" && column.primary_key));
        validate_mutation_request(table, &request).unwrap_or_else(|error| panic!("valid mutation: {}", error.message));
        let result = sqlite_mutation_builder(&request, &request.rows[0]).build().execute(&pool).await.expect("update row");
        assert_eq!(result.rows_affected(), 1);
        let name: String = sqlx::query_scalar("SELECT name FROM people WHERE id = 1").fetch_one(&pool).await.expect("read row");
        assert_eq!(name, "Alicia");
        let conflict = sqlite_mutation_builder(&request, &request.rows[0]).build().execute(&pool).await.expect("stale update");
        assert_eq!(conflict.rows_affected(), 0);
    }

    #[tokio::test]
    async fn sqlite_mutation_rolls_back_the_entire_batch_on_conflict() {
        let pool = SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.expect("sqlite pool");
        sqlx::query("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL)").execute(&pool).await.expect("create table");
        sqlx::query("INSERT INTO people (id, name) VALUES (1, 'Alice'), (2, 'Bob')").execute(&pool).await.expect("insert rows");
        let request = MutationRequest {
            schema: "main".into(), table: "people".into(),
            rows: vec![
                RowMutationRequest {
                    key: HashMap::from([("id".into(), json!(1))]),
                    changes: HashMap::from([("name".into(), json!("Alicia"))]),
                    expected: HashMap::from([("name".into(), json!("Alice"))]),
                },
                RowMutationRequest {
                    key: HashMap::from([("id".into(), json!(2))]),
                    changes: HashMap::from([("name".into(), json!("Robert"))]),
                    expected: HashMap::from([("name".into(), json!("Stale Bob"))]),
                },
            ],
        };
        let mut transaction = pool.begin().await.expect("begin transaction");
        let first = sqlite_mutation_builder(&request, &request.rows[0]).build().execute(&mut *transaction).await.expect("first update");
        let conflict = sqlite_mutation_builder(&request, &request.rows[1]).build().execute(&mut *transaction).await.expect("stale update");
        assert_eq!(first.rows_affected(), 1);
        assert_eq!(conflict.rows_affected(), 0);
        transaction.rollback().await.expect("rollback transaction");
        let names: Vec<String> = sqlx::query_scalar("SELECT name FROM people ORDER BY id").fetch_all(&pool).await.expect("read rows");
        assert_eq!(names, vec!["Alice", "Bob"]);
    }
}
