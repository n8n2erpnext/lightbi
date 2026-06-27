use std::{
    collections::HashMap,
    net::TcpListener,
    sync::Arc,
    time::{Duration, Instant},
};

use axum::{
    extract::{Multipart, Path, Query as AxumQuery, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use lightbi_export::excel::ExcelGenerator;
use lightbi_runtime_backend::model::{ColumnDef, ExecutionMetadata, ResultSet};
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
    process::{Child, Command},
    sync::{Mutex, RwLock},
    task::AbortHandle,
};
use url::Url;
use uuid::Uuid;

use crate::AppState;

const DEFAULT_ROW_LIMIT: usize = 200;
const MAX_ROW_LIMIT: usize = 1_000;
const MAX_ROW_OFFSET: usize = 10_000_000;
const STATEMENT_TIMEOUT_MS: u64 = 15_000;
const COUNT_TIMEOUT_MS: u64 = 5_000;
const SCHEMA_CACHE_TTL: Duration = Duration::from_secs(60);
const COUNT_CACHE_TTL: Duration = Duration::from_secs(300);
const EXPORT_PAGE_SIZE: usize = 1_000;
const MAX_EXPORT_ROWS: usize = 250_000;
const MAX_IMPORT_ROWS: usize = 100_000;

#[derive(Clone)]
pub(crate) struct AdvancedState {
    connections: Arc<RwLock<HashMap<String, ConnectionSession>>>,
    runs: Arc<RwLock<HashMap<String, ActiveRun>>>,
    schema_cache: Arc<RwLock<HashMap<String, CachedSchema>>>,
    schema_locks: Arc<RwLock<HashMap<String, Arc<Mutex<()>>>>>,
    count_cache: Arc<RwLock<HashMap<(String, String, String), CachedCount>>>,
    export_jobs: Arc<RwLock<HashMap<String, ExportJob>>>,
    import_jobs: Arc<RwLock<HashMap<String, ImportJob>>>,
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

struct ExportJob {
    status: ExportJobStatus,
    format: String,
    rows: usize,
    file_name: String,
    content_type: String,
    data: Option<Vec<u8>>,
    error: Option<String>,
    abort_handle: Option<AbortHandle>,
}

struct ImportJob {
    status: ExportJobStatus,
    statement_count: usize,
    executed_statements: usize,
    skipped_statements: usize,
    error: Option<String>,
    abort_handle: Option<AbortHandle>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ExportJobStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone)]
struct ConnectionSession {
    id: String,
    name: String,
    database: String,
    backend: ConnectionBackend,
    ssh_tunnel: Option<Arc<Mutex<Child>>>,
    safe_mode: String,
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
            export_jobs: Arc::new(RwLock::new(HashMap::new())),
            import_jobs: Arc::new(RwLock::new(HashMap::new())),
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
    tls_mode: Option<String>,
    ssh_host: Option<String>,
    ssh_port: Option<u16>,
    ssh_user: Option<String>,
    safe_mode: Option<String>,
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
    routines: Vec<RoutineNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TableNode {
    name: String,
    kind: String,
    estimated_rows: Option<i64>,
    table_size_bytes: Option<i64>,
    comment: Option<String>,
    ddl: Option<String>,
    writable: bool,
    columns: Vec<ColumnNode>,
    indexes: Vec<IndexNode>,
    foreign_keys: Vec<ForeignKeyNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ColumnNode {
    name: String,
    native_type: String,
    nullable: bool,
    primary_key: bool,
    default_value: Option<String>,
    comment: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct IndexNode {
    name: String,
    columns: Vec<String>,
    unique: bool,
    definition: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForeignKeyNode {
    name: String,
    columns: Vec<String>,
    referenced_table: String,
    referenced_columns: Vec<String>,
    definition: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RoutineNode {
    name: String,
    kind: String,
    definition: Option<String>,
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
    filter_tree: Option<QueryFilterGroup>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExportRequest {
    sql: String,
    format: String,
    file_name: Option<String>,
    table_name: Option<String>,
    sort: Option<QuerySortRequest>,
    filters: Option<Vec<QueryFilterRequest>>,
    filter_tree: Option<QueryFilterGroup>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExportStartResponse {
    job_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExportJobResponse {
    job_id: String,
    status: String,
    format: String,
    rows: usize,
    file_name: String,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImportStartResponse {
    job_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImportJobResponse {
    job_id: String,
    status: String,
    statement_count: usize,
    executed_statements: usize,
    skipped_statements: usize,
    error: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ImportErrorMode {
    StopRollback,
    StopCommit,
    SkipContinue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExplainQueryRequest {
    sql: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ScriptRequest {
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
    #[serde(default)]
    action: MutationAction,
    key: HashMap<String, Value>,
    changes: HashMap<String, Value>,
    expected: HashMap<String, Value>,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum MutationAction {
    Update,
    Insert,
    Delete,
}

impl Default for MutationAction {
    fn default() -> Self {
        Self::Update
    }
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
pub(crate) struct ScriptPreviewResponse {
    statements: Vec<String>,
    statement_count: usize,
    can_commit: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ScriptCommitResponse {
    executed_statements: usize,
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QuerySortRequest {
    column: String,
    direction: SortDirection,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryFilterRequest {
    column: String,
    operator: FilterOperator,
    #[serde(default)]
    value: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
enum FilterOperator {
    Contains,
    NotContains,
    Equals,
    NotEquals,
    StartsWith,
    EndsWith,
    GreaterThan,
    GreaterOrEqual,
    LessThan,
    LessOrEqual,
    IsBlank,
    IsNotBlank,
    In,
    NotIn,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
enum FilterCombinator {
    And,
    Or,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum QueryFilterNode {
    Condition(QueryFilterRequest),
    Group(QueryFilterGroup),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryFilterGroup {
    combinator: FilterCombinator,
    children: Vec<QueryFilterNode>,
}

fn validate_filter_condition(column_names: &[String], filter: &QueryFilterRequest) -> Result<(), ApiError> {
    if !column_names.iter().any(|name| name == &filter.column) {
        return Err(ApiError::bad_request("ADVANCED_FILTER_COLUMN_INVALID", "Filter column is not present in this result."));
    }
    if filter.value.len() > 1_000 {
        return Err(ApiError::bad_request("ADVANCED_FILTER_VALUE_TOO_LONG", "Filter value cannot exceed 1,000 characters."));
    }
    Ok(())
}

fn validate_filter_node(column_names: &[String], node: &QueryFilterNode, depth: usize, count: &mut usize) -> Result<(), ApiError> {
    if depth > 4 {
        return Err(ApiError::bad_request("ADVANCED_FILTER_DEPTH", "Filter groups can be nested up to four levels."));
    }
    match node {
        QueryFilterNode::Condition(filter) => {
            *count += 1;
            if *count > 20 {
                return Err(ApiError::bad_request("ADVANCED_FILTER_LIMIT", "A query can apply at most 20 result filters."));
            }
            validate_filter_condition(column_names, filter)
        }
        QueryFilterNode::Group(group) => {
            if group.children.is_empty() {
                return Err(ApiError::bad_request("ADVANCED_FILTER_EMPTY_GROUP", "Filter groups must contain at least one condition."));
            }
            for child in &group.children {
                validate_filter_node(column_names, child, depth + 1, count)?;
            }
            Ok(())
        }
    }
}

fn validate_filter_tree(column_names: &[String], tree: &Option<QueryFilterGroup>) -> Result<(), ApiError> {
    if let Some(group) = tree {
        let mut count = 0;
        validate_filter_node(column_names, &QueryFilterNode::Group(group.clone()), 0, &mut count)?;
    }
    Ok(())
}

fn table_node_mut<'a>(schemas: &'a mut [SchemaNode], schema: &str, table: &str) -> Option<&'a mut TableNode> {
    schemas.iter_mut()
        .find(|candidate| candidate.name == schema)
        .and_then(|schema_node| schema_node.tables.iter_mut().find(|candidate| candidate.name == table))
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

fn free_local_port() -> Result<u16, ApiError> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| ApiError::database(format!("Could not allocate local tunnel port: {error}")))?;
    let port = listener.local_addr()
        .map_err(|error| ApiError::database(format!("Could not inspect local tunnel port: {error}")))?
        .port();
    drop(listener);
    Ok(port)
}

async fn maybe_open_ssh_tunnel(url: &str, request: &CreateConnectionRequest) -> Result<(String, Option<Arc<Mutex<Child>>>), ApiError> {
    let Some(ssh_host) = request.ssh_host.as_deref().map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok((url.to_string(), None));
    };
    let ssh_user = request.ssh_user.as_deref().map(str::trim).filter(|value| !value.is_empty())
        .ok_or_else(|| ApiError::bad_request("ADVANCED_SSH_PROFILE_INVALID", "SSH user is required when an SSH host is configured."))?;
    let mut parsed = Url::parse(url).map_err(|error| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", format!("Invalid connection URL for SSH tunnel: {error}")))?;
    let remote_host = parsed.host_str().ok_or_else(|| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", "Connection URL must include a database host for SSH tunnel."))?.to_string();
    let remote_port = parsed.port_or_known_default().ok_or_else(|| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", "Connection URL must include or imply a database port for SSH tunnel."))?;
    let local_port = free_local_port()?;
    let ssh_target = format!("{ssh_user}@{ssh_host}");
    let local_forward = format!("127.0.0.1:{local_port}:{remote_host}:{remote_port}");
    let mut child = Command::new("ssh")
        .arg("-N")
        .arg("-L").arg(local_forward)
        .arg("-p").arg(request.ssh_port.unwrap_or(22).to_string())
        .arg("-o").arg("ExitOnForwardFailure=yes")
        .arg("-o").arg("ServerAliveInterval=30")
        .arg(ssh_target)
        .spawn()
        .map_err(|error| ApiError::database(format!("Could not start SSH tunnel: {error}")))?;
    tokio::time::sleep(Duration::from_millis(700)).await;
    if let Some(status) = child.try_wait().map_err(|error| ApiError::database(format!("Could not inspect SSH tunnel: {error}")))? {
        return Err(ApiError::database(format!("SSH tunnel exited before connection was opened: {status}")));
    }
    parsed.set_host(Some("127.0.0.1")).map_err(|_| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", "Could not rewrite connection URL for SSH tunnel."))?;
    parsed.set_port(Some(local_port)).map_err(|_| ApiError::bad_request("ADVANCED_CONNECTION_INVALID", "Could not rewrite connection port for SSH tunnel."))?;
    Ok((parsed.to_string(), Some(Arc::new(Mutex::new(child)))))
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
    let raw_connection_url = connection_url_owned.trim();
    if name.is_empty() || raw_connection_url.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            "Connection name and PostgreSQL URL are required.",
        ));
    }
    let requested_provider = request.provider.as_deref().unwrap_or_default().to_ascii_lowercase();
    let tls_mode = request.tls_mode.as_deref().unwrap_or("driver-default");
    if !["driver-default", "require", "verify-full"].contains(&tls_mode) {
        return Err(ApiError::bad_request("ADVANCED_TLS_MODE_INVALID", "TLS mode must be driver-default, require, or verify-full."));
    }
    let safe_mode = request.safe_mode.as_deref().unwrap_or("confirm_writes");
    if !["off", "confirm_writes", "read_only"].contains(&safe_mode) {
        return Err(ApiError::bad_request("ADVANCED_SAFE_MODE_INVALID", "Safe mode must be off, confirm_writes, or read_only."));
    }
    let tls_url = crate::advanced_workspace::apply_tls_policy(raw_connection_url, &requested_provider, tls_mode);
    let (connection_url, ssh_tunnel) = maybe_open_ssh_tunnel(&tls_url, &request).await?;
    let connection_url = connection_url.as_str();
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
        ssh_tunnel,
        safe_mode: safe_mode.to_string(),
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
    if let Some(tunnel) = session.ssh_tunnel {
        let mut child = tunnel.lock().await;
        let _ = child.kill().await;
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
        if let Some(schema) = schemas.iter_mut().find(|candidate| candidate.name == schema_name) {
            schema.routines.push(RoutineNode {
                name: row.get("routine_name"),
                kind: row.get::<String, _>("routine_type").to_ascii_lowercase(),
                definition: None,
            });
        }
    }

    Ok(schemas)
}

async fn discover_mysql_schema(pool: &MySqlPool, database: &str) -> Result<Vec<SchemaNode>, ApiError> {
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
        let index = tables.iter().position(|table| table.name == table_name).unwrap_or_else(|| {
            tables.push(TableNode {
                name: table_name.clone(),
                kind: row.get::<String, _>("table_type").to_ascii_lowercase().replace(' ', "_"),
                estimated_rows: row.try_get::<u64, _>("estimated_rows").ok().and_then(|value| i64::try_from(value).ok()),
                table_size_bytes: row.try_get::<u64, _>("table_size_bytes").ok().and_then(|value| i64::try_from(value).ok()),
                comment: row.try_get("table_comment").ok(),
                ddl: None,
                writable: row.get::<String, _>("table_type").eq_ignore_ascii_case("BASE TABLE"),
                columns: Vec::new(),
                indexes: Vec::new(),
                foreign_keys: Vec::new(),
            });
            tables.len() - 1
        });
        tables[index].columns.push(ColumnNode {
            name: row.get("column_name"), native_type: row.get("native_type"),
            nullable: row.get::<String, _>("is_nullable") == "YES",
            primary_key: row.get::<i64, _>("primary_key") != 0,
            default_value: row.try_get("column_default").ok(),
            comment: row.try_get("column_comment").ok(),
        });
    }
    let mut schema = SchemaNode { name: database.to_string(), tables, routines: Vec::new() };
    let index_rows = sqlx::query(
        "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE",
    ).bind(database).fetch_all(pool).await
        .map_err(|error| ApiError::database(format!("Could not load MySQL/MariaDB indexes: {error}")))?;
    for row in index_rows {
        let table_name: String = row.get("TABLE_NAME");
        if let Some(table) = schema.tables.iter_mut().find(|candidate| candidate.name == table_name) {
            let columns_list: Option<String> = row.try_get("columns_list").ok();
            table.indexes.push(IndexNode {
                name: row.get("INDEX_NAME"),
                columns: columns_list.unwrap_or_default().split(',').map(str::to_string).collect(),
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
        if let Some(table) = schema.tables.iter_mut().find(|candidate| candidate.name == table_name) {
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
                default_value: row.try_get("dflt_value").ok(),
                comment: None,
            }).collect();
        let ddl = sqlx::query_scalar::<_, String>("SELECT sql FROM sqlite_master WHERE name = ?")
            .bind(&name).fetch_optional(pool).await.ok().flatten();
        let mut table = TableNode {
            name, kind: if kind == "table" { "base_table".into() } else { "view".into() },
            estimated_rows: None, table_size_bytes: None, comment: None, ddl,
            writable: kind == "table", columns, indexes: Vec::new(), foreign_keys: Vec::new(),
        };
        let index_rows = sqlx::query(&format!("PRAGMA index_list({})", quote_sql_identifier(&table.name)))
            .fetch_all(pool).await.unwrap_or_default();
        for index_row in index_rows {
            let index_name: String = index_row.get("name");
            let unique = index_row.get::<i64, _>("unique") != 0;
            let column_rows = sqlx::query(&format!("PRAGMA index_info({})", quote_sql_identifier(&index_name)))
                .fetch_all(pool).await.unwrap_or_default();
            table.indexes.push(IndexNode {
                name: index_name,
                columns: column_rows.into_iter().map(|row| row.get("name")).collect(),
                unique,
                definition: None,
            });
        }
        let fk_rows = sqlx::query(&format!("PRAGMA foreign_key_list({})", quote_sql_identifier(&table.name)))
            .fetch_all(pool).await.unwrap_or_default();
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
    Ok(vec![SchemaNode { name: "main".to_string(), tables, routines: Vec::new() }])
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
            default_value: None, comment: None,
        }).collect();
        tables.push(TableNode {
            name, kind: "collection".to_string(), estimated_rows: None, table_size_bytes: None, comment: None, ddl: None,
            writable: false, columns, indexes: Vec::new(), foreign_keys: Vec::new(),
        });
    }
    Ok(vec![SchemaNode { name: database.to_string(), tables, routines: Vec::new() }])
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
        match row.action {
            MutationAction::Insert => {
                if row.changes.is_empty() || row.changes.len() > 100 {
                    return Err(ApiError::bad_request("ADVANCED_MUTATION_CHANGE_LIMIT", "Inserted rows must contain between 1 and 100 columns."));
                }
            }
            MutationAction::Update => {
                if row.changes.is_empty() || row.changes.len() > 50 {
                    return Err(ApiError::bad_request("ADVANCED_MUTATION_CHANGE_LIMIT", "Each row must change between 1 and 50 columns."));
                }
                if row.key.len() != primary_keys.len() || primary_keys.iter().any(|key| !row.key.contains_key(key)) {
                    return Err(ApiError::bad_request("ADVANCED_MUTATION_KEY_INCOMPLETE", "Every primary-key column is required and extra key columns are not allowed."));
                }
            }
            MutationAction::Delete => {
                if row.key.len() != primary_keys.len() || primary_keys.iter().any(|key| !row.key.contains_key(key)) {
                    return Err(ApiError::bad_request("ADVANCED_MUTATION_KEY_INCOMPLETE", "Every primary-key column is required and extra key columns are not allowed."));
                }
            }
        }
        for column in row.changes.keys() {
            if row.action == MutationAction::Update && primary_keys.contains(column) {
                return Err(ApiError::bad_request("ADVANCED_MUTATION_PRIMARY_KEY", "Primary-key columns cannot be edited in this phase."));
            }
            if !table.columns.iter().any(|candidate| &candidate.name == column) {
                return Err(ApiError::bad_request("ADVANCED_MUTATION_COLUMN_INVALID", "A changed column is not present in the table."));
            }
            if row.action == MutationAction::Update && !row.expected.contains_key(column) {
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

fn mutation_scalar(value: &Value) -> String {
    match value {
        Value::String(value) => value.clone(),
        other => other.to_string(),
    }
}

fn postgres_cast_type(column: &ColumnNode) -> Result<&'static str, ApiError> {
    match column.native_type.to_ascii_lowercase().as_str() {
        "smallint" => Ok("smallint"),
        "integer" => Ok("integer"),
        "bigint" => Ok("bigint"),
        "decimal" => Ok("decimal"),
        "numeric" => Ok("numeric"),
        "real" => Ok("real"),
        "double precision" => Ok("double precision"),
        "smallserial" => Ok("smallint"),
        "serial" => Ok("integer"),
        "bigserial" => Ok("bigint"),
        "boolean" => Ok("boolean"),
        "text" => Ok("text"),
        "character" => Ok("character"),
        "character varying" => Ok("character varying"),
        "date" => Ok("date"),
        "time without time zone" => Ok("time without time zone"),
        "time with time zone" => Ok("time with time zone"),
        "timestamp without time zone" => Ok("timestamp without time zone"),
        "timestamp with time zone" => Ok("timestamp with time zone"),
        "uuid" => Ok("uuid"),
        "json" => Ok("json"),
        "jsonb" => Ok("jsonb"),
        _ => Err(ApiError::bad_request(
            "ADVANCED_MUTATION_TYPE_UNSUPPORTED",
            "A changed or key column uses a PostgreSQL type that is not enabled for safe source commit.",
        )),
    }
}

fn mutation_column<'a>(table: &'a TableNode, name: &str) -> Result<&'a ColumnNode, ApiError> {
    table.columns.iter().find(|column| column.name == name).ok_or_else(|| {
        ApiError::bad_request("ADVANCED_MUTATION_COLUMN_INVALID", "A mutation column is not present in the table.")
    })
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
    if row.action == MutationAction::Insert {
        let columns = sorted_keys(&row.changes);
        let mut builder = QueryBuilder::<Sqlite>::new(format!("INSERT INTO {} (", quote_sql_identifier(&request.table)));
        for (index, column) in columns.iter().enumerate() {
            if index > 0 { builder.push(", "); }
            builder.push(quote_sql_identifier(column));
        }
        builder.push(") VALUES (");
        for (index, column) in columns.iter().enumerate() {
            if index > 0 { builder.push(", "); }
            sqlite_push_value(&mut builder, &row.changes[column]);
        }
        builder.push(")");
        return builder;
    }
    if row.action == MutationAction::Delete {
        let mut builder = QueryBuilder::<Sqlite>::new(format!("DELETE FROM {} WHERE ", quote_sql_identifier(&request.table)));
        for (index, column) in sorted_keys(&row.key).iter().enumerate() {
            if index > 0 { builder.push(" AND "); }
            sqlite_push_condition(&mut builder, column, &row.key[column]);
        }
        return builder;
    }
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

fn postgres_push_value(builder: &mut QueryBuilder<Postgres>, column: &ColumnNode, value: &Value) -> Result<(), ApiError> {
    if value.is_null() {
        builder.push("NULL");
    } else {
        let cast_type = postgres_cast_type(column)?;
        builder.push("CAST(").push_bind(mutation_scalar(value)).push(" AS ").push(cast_type).push(")");
    }
    Ok(())
}

fn postgres_push_condition(builder: &mut QueryBuilder<Postgres>, table: &TableNode, column: &str, value: &Value) -> Result<(), ApiError> {
    builder.push(quote_sql_identifier(column));
    if value.is_null() {
        builder.push(" IS NULL");
    } else {
        builder.push(" = ");
        postgres_push_value(builder, mutation_column(table, column)?, value)?;
    }
    Ok(())
}

fn postgres_mutation_builder<'a>(request: &'a MutationRequest, row: &'a RowMutationRequest, table: &TableNode) -> Result<QueryBuilder<'a, Postgres>, ApiError> {
    if row.action == MutationAction::Insert {
        let columns = sorted_keys(&row.changes);
        let mut builder = QueryBuilder::<Postgres>::new(format!(
            "INSERT INTO {}.{} (", quote_sql_identifier(&request.schema), quote_sql_identifier(&request.table)
        ));
        for (index, column) in columns.iter().enumerate() {
            if index > 0 { builder.push(", "); }
            builder.push(quote_sql_identifier(column));
        }
        builder.push(") VALUES (");
        for (index, column) in columns.iter().enumerate() {
            if index > 0 { builder.push(", "); }
            postgres_push_value(&mut builder, mutation_column(table, column)?, &row.changes[column])?;
        }
        builder.push(")");
        return Ok(builder);
    }
    if row.action == MutationAction::Delete {
        let mut builder = QueryBuilder::<Postgres>::new(format!(
            "DELETE FROM {}.{} WHERE ", quote_sql_identifier(&request.schema), quote_sql_identifier(&request.table)
        ));
        for (index, column) in sorted_keys(&row.key).iter().enumerate() {
            if index > 0 { builder.push(" AND "); }
            postgres_push_condition(&mut builder, table, column, &row.key[column])?;
        }
        return Ok(builder);
    }
    let mut builder = QueryBuilder::<Postgres>::new(format!(
        "UPDATE {}.{} SET ", quote_sql_identifier(&request.schema), quote_sql_identifier(&request.table)
    ));
    for (index, column) in sorted_keys(&row.changes).iter().enumerate() {
        if index > 0 { builder.push(", "); }
        builder.push(quote_sql_identifier(column)).push(" = ");
        postgres_push_value(&mut builder, mutation_column(table, column)?, &row.changes[column])?;
    }
    builder.push(" WHERE ");
    for (index, column) in sorted_keys(&row.key).iter().enumerate() {
        if index > 0 { builder.push(" AND "); }
        postgres_push_condition(&mut builder, table, column, &row.key[column])?;
    }
    for column in sorted_keys(&row.changes) {
        builder.push(" AND ");
        postgres_push_condition(&mut builder, table, &column, &row.expected[&column])?;
    }
    Ok(builder)
}

fn mysql_push_value(builder: &mut QueryBuilder<MySql>, value: &Value) {
    match value {
        Value::Null => { builder.push("NULL"); }
        Value::Bool(value) => { builder.push_bind(*value); }
        Value::Number(value) if value.is_i64() => { builder.push_bind(value.as_i64().unwrap_or_default()); }
        Value::Number(value) if value.is_u64() => { builder.push_bind(value.as_u64().and_then(|item| i64::try_from(item).ok()).unwrap_or(i64::MAX)); }
        Value::Number(value) => { builder.push_bind(value.as_f64().unwrap_or_default()); }
        Value::String(value) => { builder.push_bind(value.clone()); }
        other => { builder.push_bind(other.to_string()); }
    };
}

fn mysql_push_condition(builder: &mut QueryBuilder<MySql>, column: &str, value: &Value) {
    builder.push(quote_mysql_identifier(column));
    if value.is_null() { builder.push(" IS NULL"); } else { builder.push(" = "); mysql_push_value(builder, value); }
}

fn mysql_mutation_builder<'a>(request: &'a MutationRequest, row: &'a RowMutationRequest) -> QueryBuilder<'a, MySql> {
    if row.action == MutationAction::Insert {
        let columns = sorted_keys(&row.changes);
        let mut builder = QueryBuilder::<MySql>::new(format!(
            "INSERT INTO {}.{} (", quote_mysql_identifier(&request.schema), quote_mysql_identifier(&request.table)
        ));
        for (index, column) in columns.iter().enumerate() {
            if index > 0 { builder.push(", "); }
            builder.push(quote_mysql_identifier(column));
        }
        builder.push(") VALUES (");
        for (index, column) in columns.iter().enumerate() {
            if index > 0 { builder.push(", "); }
            mysql_push_value(&mut builder, &row.changes[column]);
        }
        builder.push(")");
        return builder;
    }
    if row.action == MutationAction::Delete {
        let mut builder = QueryBuilder::<MySql>::new(format!(
            "DELETE FROM {}.{} WHERE ", quote_mysql_identifier(&request.schema), quote_mysql_identifier(&request.table)
        ));
        for (index, column) in sorted_keys(&row.key).iter().enumerate() {
            if index > 0 { builder.push(" AND "); }
            mysql_push_condition(&mut builder, column, &row.key[column]);
        }
        return builder;
    }
    let mut builder = QueryBuilder::<MySql>::new(format!(
        "UPDATE {}.{} SET ", quote_mysql_identifier(&request.schema), quote_mysql_identifier(&request.table)
    ));
    for (index, column) in sorted_keys(&row.changes).iter().enumerate() {
        if index > 0 { builder.push(", "); }
        builder.push(quote_mysql_identifier(column)).push(" = ");
        mysql_push_value(&mut builder, &row.changes[column]);
    }
    builder.push(" WHERE ");
    for (index, column) in sorted_keys(&row.key).iter().enumerate() {
        if index > 0 { builder.push(" AND "); }
        mysql_push_condition(&mut builder, column, &row.key[column]);
    }
    for column in sorted_keys(&row.changes) {
        builder.push(" AND ");
        mysql_push_condition(&mut builder, &column, &row.expected[&column]);
    }
    builder
}

pub(crate) async fn preview_mutation(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<MutationRequest>,
) -> Result<Json<MutationPreviewResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let statements = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let schemas = discover_postgres_schema(pool).await?;
            let table = schemas.iter().find(|schema| schema.name == request.schema)
                .and_then(|schema| schema.tables.iter().find(|table| table.name == request.table))
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            request.rows.iter().map(|row| postgres_mutation_builder(&request, row, table).map(|builder| format!("{};", builder.sql()))).collect::<Result<Vec<_>, _>>()?
        }
        ConnectionBackend::MySql(pool) => {
            if request.schema != session.database { return Err(ApiError::bad_request("ADVANCED_MUTATION_SCHEMA_INVALID", "MySQL/MariaDB mutations must target the connected database.")); }
            let schemas = discover_mysql_schema(pool, &session.database).await?;
            let table = schemas[0].tables.iter().find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            request.rows.iter().map(|row| format!("{};", mysql_mutation_builder(&request, row).sql())).collect()
        }
        ConnectionBackend::Sqlite(pool) => {
            if request.schema != "main" { return Err(ApiError::bad_request("ADVANCED_MUTATION_SCHEMA_INVALID", "SQLite mutations require the main schema.")); }
            let schemas = discover_sqlite_schema(pool).await?;
            let table = schemas[0].tables.iter().find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            request.rows.iter().map(|row| format!("{};", sqlite_mutation_builder(&request, row).sql())).collect()
        }
        ConnectionBackend::Mongo(_) => return Err(ApiError::bad_request("ADVANCED_MUTATION_PROVIDER_UNSUPPORTED", "MongoDB source commit is not enabled.")),
    };
    Ok(Json(MutationPreviewResponse { statements, row_count: request.rows.len(), can_commit: session.safe_mode != "read_only" }))
}

fn mutation_conflict() -> ApiError {
    ApiError { status: StatusCode::CONFLICT, code: "ADVANCED_MUTATION_CONFLICT", message: "A row changed or disappeared after it was loaded; the entire mutation was rolled back.".to_string() }
}

fn ensure_write_allowed(session: &ConnectionSession) -> Result<(), ApiError> {
    if session.safe_mode == "read_only" {
        return Err(ApiError::bad_request("ADVANCED_SAFE_MODE_READ_ONLY", "This connection profile is read-only; write transactions are blocked."));
    }
    Ok(())
}

async fn invalidate_mutation_caches(state: &Arc<AppState>, connection_id: &str) {
    state.advanced.schema_cache.write().await.remove(connection_id);
    state.advanced.count_cache.write().await.retain(|(id, _, _), _| id != connection_id);
}

pub(crate) async fn commit_mutation(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<MutationRequest>,
) -> Result<Json<MutationCommitResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    let updated_rows = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let schemas = discover_postgres_schema(pool).await?;
            let table = schemas.iter().find(|schema| schema.name == request.schema)
                .and_then(|schema| schema.tables.iter().find(|table| table.name == request.table))
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            for row in &request.rows { postgres_mutation_builder(&request, row, table)?; }
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start PostgreSQL mutation transaction: {error}")))?;
            let mut updated = 0;
            for row in &request.rows {
                let mut builder = postgres_mutation_builder(&request, row, table)?;
                let result = match builder.build().execute(&mut *tx).await {
                    Ok(result) => result,
                    Err(error) => { tx.rollback().await.ok(); return Err(ApiError::database(format!("PostgreSQL mutation failed and was rolled back: {error}"))); }
                };
                if result.rows_affected() != 1 { tx.rollback().await.ok(); return Err(mutation_conflict()); }
                updated += 1;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit PostgreSQL mutation transaction: {error}")))?;
            updated
        }
        ConnectionBackend::MySql(pool) => {
            if request.schema != session.database { return Err(ApiError::bad_request("ADVANCED_MUTATION_SCHEMA_INVALID", "MySQL/MariaDB mutations must target the connected database.")); }
            let schemas = discover_mysql_schema(pool, &session.database).await?;
            let table = schemas[0].tables.iter().find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start MySQL/MariaDB mutation transaction: {error}")))?;
            let mut updated = 0;
            for row in &request.rows {
                let result = match mysql_mutation_builder(&request, row).build().execute(&mut *tx).await {
                    Ok(result) => result,
                    Err(error) => { tx.rollback().await.ok(); return Err(ApiError::database(format!("MySQL/MariaDB mutation failed and was rolled back: {error}"))); }
                };
                if result.rows_affected() != 1 { tx.rollback().await.ok(); return Err(mutation_conflict()); }
                updated += 1;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit MySQL/MariaDB mutation transaction: {error}")))?;
            updated
        }
        ConnectionBackend::Sqlite(pool) => {
            if request.schema != "main" { return Err(ApiError::bad_request("ADVANCED_MUTATION_SCHEMA_INVALID", "SQLite mutations require the main schema.")); }
            let schemas = discover_sqlite_schema(pool).await?;
            let table = schemas[0].tables.iter().find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start SQLite mutation transaction: {error}")))?;
            let mut updated = 0;
            for row in &request.rows {
                let result = match sqlite_mutation_builder(&request, row).build().execute(&mut *tx).await {
                    Ok(result) => result,
                    Err(error) => { tx.rollback().await.ok(); return Err(ApiError::database(format!("SQLite mutation failed and was rolled back: {error}"))); }
                };
                if result.rows_affected() != 1 { tx.rollback().await.ok(); return Err(mutation_conflict()); }
                updated += 1;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit SQLite mutation transaction: {error}")))?;
            updated
        }
        ConnectionBackend::Mongo(_) => return Err(ApiError::bad_request("ADVANCED_MUTATION_PROVIDER_UNSUPPORTED", "MongoDB source commit is not enabled.")),
    };
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(Json(MutationCommitResponse { updated_rows }))
}

fn split_script_statements(sql: &str) -> Result<Vec<String>, ApiError> {
    let statements = sql
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_string)
        .collect::<Vec<_>>();
    if statements.is_empty() {
        return Err(ApiError::bad_request("ADVANCED_SCRIPT_EMPTY", "Enter SQL statements before review."));
    }
    if statements.len() > 5000 {
        return Err(ApiError::bad_request("ADVANCED_SCRIPT_TOO_LARGE", "A script can include at most 5,000 statements."));
    }
    for statement in &statements {
        let first = statement.split_whitespace().next().unwrap_or_default().to_ascii_uppercase();
        let allowed = matches!(first.as_str(), "CREATE" | "ALTER" | "DROP" | "TRUNCATE" | "INSERT" | "UPDATE" | "DELETE");
        if !allowed {
            return Err(ApiError::bad_request(
                "ADVANCED_SCRIPT_STATEMENT_UNSUPPORTED",
                "Script commit only permits CREATE, ALTER, DROP, TRUNCATE, INSERT, UPDATE, or DELETE statements.",
            ));
        }
    }
    Ok(statements)
}

pub(crate) async fn preview_script(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<ScriptRequest>,
) -> Result<Json<ScriptPreviewResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request("ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED", "MongoDB SQL script commit is not enabled."));
    }
    let statements = split_script_statements(&request.sql)?;
    Ok(Json(ScriptPreviewResponse { statement_count: statements.len(), statements: statements.iter().map(|statement| format!("{statement};")).collect(), can_commit: session.safe_mode != "read_only" }))
}

pub(crate) async fn commit_script(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<ScriptRequest>,
) -> Result<Json<ScriptCommitResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    let statements = split_script_statements(&request.sql)?;
    let executed = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start PostgreSQL script transaction: {error}")))?;
            for statement in &statements {
                if let Err(error) = sqlx::query(statement).execute(&mut *tx).await {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!("PostgreSQL script failed and was rolled back: {error}")));
                }
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit PostgreSQL script transaction: {error}")))?;
            statements.len()
        }
        ConnectionBackend::MySql(pool) => {
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start MySQL/MariaDB script transaction: {error}")))?;
            for statement in &statements {
                if let Err(error) = sqlx::query(statement).execute(&mut *tx).await {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!("MySQL/MariaDB script failed and was rolled back: {error}")));
                }
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit MySQL/MariaDB script transaction: {error}")))?;
            statements.len()
        }
        ConnectionBackend::Sqlite(pool) => {
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start SQLite script transaction: {error}")))?;
            for statement in &statements {
                if let Err(error) = sqlx::query(statement).execute(&mut *tx).await {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!("SQLite script failed and was rolled back: {error}")));
                }
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit SQLite script transaction: {error}")))?;
            statements.len()
        }
        ConnectionBackend::Mongo(_) => return Err(ApiError::bad_request("ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED", "MongoDB SQL script commit is not enabled.")),
    };
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(Json(ScriptCommitResponse { executed_statements: executed }))
}

pub(crate) async fn start_sql_import(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, Json(request): Json<ScriptRequest>,
) -> Result<Json<ImportStartResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request("ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED", "MongoDB SQL script import is not enabled."));
    }
    let statements = split_script_statements(&request.sql)?;
    let job_id = Uuid::new_v4().to_string();
    state.advanced.import_jobs.write().await.insert(job_id.clone(), ImportJob {
        status: ExportJobStatus::Running,
        statement_count: statements.len(),
        executed_statements: 0,
        skipped_statements: 0,
        error: None,
        abort_handle: None,
    });
    let task_state = state.clone();
    let task_job_id = job_id.clone();
    let task_connection_id = connection_id.clone();
    let task = tokio::spawn(async move {
        let outcome = run_sql_import_job(session, task_connection_id, task_job_id.clone(), statements, task_state.clone()).await;
        let mut jobs = task_state.advanced.import_jobs.write().await;
        if let Some(job) = jobs.get_mut(&task_job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return;
            }
            match outcome {
                Ok(()) => {
                    job.status = ExportJobStatus::Completed;
                    job.abort_handle = None;
                }
                Err(error) => {
                    job.status = ExportJobStatus::Failed;
                    job.error = Some(error.message);
                    job.abort_handle = None;
                }
            }
        }
    });
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(&job_id) {
        job.abort_handle = Some(task.abort_handle());
    }
    Ok(Json(ImportStartResponse { job_id }))
}

pub(crate) async fn start_csv_import(
    State(state): State<Arc<AppState>>, Path(connection_id): Path<String>, mut multipart: Multipart,
) -> Result<Json<ImportStartResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request("ADVANCED_IMPORT_PROVIDER_UNSUPPORTED", "CSV import targets relational database sessions only."));
    }
    let mut file_bytes = Vec::new();
    let mut schema = String::new();
    let mut table = String::new();
    let mut mapping = HashMap::<String, String>::new();
    let mut error_mode = ImportErrorMode::StopRollback;

    while let Some(field) = multipart.next_field().await.map_err(|error| ApiError::bad_request("ADVANCED_IMPORT_MULTIPART", format!("Could not read import form: {error}")))? {
        let name = field.name().unwrap_or_default().to_string();
        match name.as_str() {
            "file" => {
                file_bytes = field.bytes().await.map_err(|error| ApiError::bad_request("ADVANCED_IMPORT_FILE", format!("Could not read CSV file: {error}")))?.to_vec();
            }
            "schema" => schema = field.text().await.unwrap_or_default(),
            "table" => table = field.text().await.unwrap_or_default(),
            "mapping" => {
                let text = field.text().await.unwrap_or_default();
                mapping = serde_json::from_str::<HashMap<String, String>>(&text).unwrap_or_default();
            }
            "errorMode" => {
                error_mode = match field.text().await.unwrap_or_default().as_str() {
                    "stop_commit" => ImportErrorMode::StopCommit,
                    "skip_continue" => ImportErrorMode::SkipContinue,
                    _ => ImportErrorMode::StopRollback,
                };
            }
            _ => {}
        }
    }
    if file_bytes.is_empty() || schema.trim().is_empty() || table.trim().is_empty() {
        return Err(ApiError::bad_request("ADVANCED_IMPORT_REQUIRED", "CSV import requires file, schema, and table."));
    }
    let rows = parse_csv_import_rows(&file_bytes, &mapping)?;
    let job_id = Uuid::new_v4().to_string();
    state.advanced.import_jobs.write().await.insert(job_id.clone(), ImportJob {
        status: ExportJobStatus::Running,
        statement_count: rows.len(),
        executed_statements: 0,
        skipped_statements: 0,
        error: None,
        abort_handle: None,
    });
    let task_state = state.clone();
    let task_job_id = job_id.clone();
    let task_connection_id = connection_id.clone();
    let task = tokio::spawn(async move {
        let outcome = run_csv_import_job(session, task_connection_id, task_job_id.clone(), schema, table, rows, error_mode, task_state.clone()).await;
        let mut jobs = task_state.advanced.import_jobs.write().await;
        if let Some(job) = jobs.get_mut(&task_job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return;
            }
            match outcome {
                Ok(message) => {
                    job.status = ExportJobStatus::Completed;
                    job.error = message;
                    job.abort_handle = None;
                }
                Err(error) => {
                    job.status = ExportJobStatus::Failed;
                    job.error = Some(error.message);
                    job.abort_handle = None;
                }
            }
        }
    });
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(&job_id) {
        job.abort_handle = Some(task.abort_handle());
    }
    Ok(Json(ImportStartResponse { job_id }))
}

pub(crate) async fn get_import_job(
    State(state): State<Arc<AppState>>, Path(job_id): Path<String>,
) -> Result<Json<ImportJobResponse>, ApiError> {
    let jobs = state.advanced.import_jobs.read().await;
    let job = jobs.get(&job_id).ok_or_else(|| ApiError::bad_request("ADVANCED_IMPORT_NOT_FOUND", "Import job was not found."))?;
    Ok(Json(import_job_response(&job_id, job)))
}

pub(crate) async fn cancel_import_job(
    State(state): State<Arc<AppState>>, Path(job_id): Path<String>,
) -> StatusCode {
    let mut jobs = state.advanced.import_jobs.write().await;
    if let Some(job) = jobs.get_mut(&job_id) {
        if let Some(handle) = job.abort_handle.take() {
            handle.abort();
        }
        job.status = ExportJobStatus::Cancelled;
        StatusCode::ACCEPTED
    } else {
        StatusCode::NO_CONTENT
    }
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
        let filter_tree = request.filter_tree.or_else(|| {
            let filters = request.filters.unwrap_or_default();
            if filters.is_empty() {
                None
            } else {
                Some(QueryFilterGroup {
                    combinator: FilterCombinator::And,
                    children: filters.into_iter().map(QueryFilterNode::Condition).collect(),
                })
            }
        });
        match session.backend {
            ConnectionBackend::Postgres(pool) => run_postgres_query(pool, task_run_id, sql, limit, offset, request.sort, filter_tree).await,
            ConnectionBackend::MySql(pool) => run_mysql_query(pool, task_run_id, sql, limit, offset, request.sort, filter_tree).await,
            ConnectionBackend::Sqlite(pool) => run_sqlite_query(pool, task_run_id, sql, limit, offset, request.sort, filter_tree).await,
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

pub(crate) async fn start_export(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ExportRequest>,
) -> Result<Json<ExportStartResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request("ADVANCED_EXPORT_MONGO_UNSUPPORTED", "MongoDB export still uses the document query path."));
    }
    let sql = normalized_read_query(&request.sql)?;
    let format = request.format.trim().to_ascii_lowercase();
    if !["csv", "json", "sql", "xlsx"].contains(&format.as_str()) {
        return Err(ApiError::bad_request("ADVANCED_EXPORT_FORMAT", "Backend streaming export supports CSV, JSON, SQL, and XLSX."));
    }
    let filter_tree = request.filter_tree.or_else(|| {
        let filters = request.filters.unwrap_or_default();
        if filters.is_empty() {
            None
        } else {
            Some(QueryFilterGroup {
                combinator: FilterCombinator::And,
                children: filters.into_iter().map(QueryFilterNode::Condition).collect(),
            })
        }
    });
    let job_id = Uuid::new_v4().to_string();
    let safe_name = request.file_name.unwrap_or_else(|| "lightbi-export".to_string()).replace(['/', '\\'], "_");
    let file_name = format!("{safe_name}.full.{format}");
    let content_type = match format.as_str() {
        "json" => "application/json;charset=utf-8",
        "sql" => "application/sql;charset=utf-8",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _ => "text/csv;charset=utf-8",
    }.to_string();
    state.advanced.export_jobs.write().await.insert(job_id.clone(), ExportJob {
        status: ExportJobStatus::Running,
        format: format.clone(),
        rows: 0,
        file_name,
        content_type,
        data: None,
        error: None,
        abort_handle: None,
    });

    let task_state = state.clone();
    let task_job_id = job_id.clone();
    let task = tokio::spawn(async move {
        let outcome = run_export_job(session, task_job_id.clone(), sql, format, request.table_name, request.sort, filter_tree, task_state.clone()).await;
        let mut jobs = task_state.advanced.export_jobs.write().await;
        if let Some(job) = jobs.get_mut(&task_job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return;
            }
            match outcome {
                Ok(data) => {
                    job.status = ExportJobStatus::Completed;
                    job.data = Some(data);
                    job.abort_handle = None;
                }
                Err(error) => {
                    job.status = ExportJobStatus::Failed;
                    job.error = Some(error.message);
                    job.abort_handle = None;
                }
            }
        }
    });
    if let Some(job) = state.advanced.export_jobs.write().await.get_mut(&job_id) {
        job.abort_handle = Some(task.abort_handle());
    }
    Ok(Json(ExportStartResponse { job_id }))
}

pub(crate) async fn get_export_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Json<ExportJobResponse>, ApiError> {
    let jobs = state.advanced.export_jobs.read().await;
    let job = jobs.get(&job_id).ok_or_else(|| ApiError::bad_request("ADVANCED_EXPORT_NOT_FOUND", "Export job was not found."))?;
    Ok(Json(export_job_response(&job_id, job)))
}

pub(crate) async fn download_export_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Response, ApiError> {
    let jobs = state.advanced.export_jobs.read().await;
    let job = jobs.get(&job_id).ok_or_else(|| ApiError::bad_request("ADVANCED_EXPORT_NOT_FOUND", "Export job was not found."))?;
    if job.status != ExportJobStatus::Completed {
        return Err(ApiError::bad_request("ADVANCED_EXPORT_NOT_READY", "Export job is not complete yet."));
    }
    let data = job.data.clone().unwrap_or_default();
    let mut response = data.into_response();
    response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_str(&job.content_type).unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")));
    response.headers_mut().insert(header::CONTENT_DISPOSITION, HeaderValue::from_str(&format!("attachment; filename=\"{}\"", job.file_name.replace('"', ""))).unwrap_or_else(|_| HeaderValue::from_static("attachment")));
    Ok(response)
}

pub(crate) async fn cancel_export_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> StatusCode {
    let mut jobs = state.advanced.export_jobs.write().await;
    if let Some(job) = jobs.get_mut(&job_id) {
        if let Some(handle) = job.abort_handle.take() {
            handle.abort();
        }
        job.status = ExportJobStatus::Cancelled;
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

fn split_filter_values(value: &str) -> Vec<String> {
    value.split(',').map(|item| item.trim().to_string()).filter(|item| !item.is_empty()).take(50).collect()
}

fn push_pg_filter_condition(builder: &mut QueryBuilder<'_, Postgres>, filter: &QueryFilterRequest) {
    let column = quote_pg_identifier(&filter.column);
    let text_column = format!("CAST({column} AS TEXT)");
    match filter.operator {
        FilterOperator::Contains => { builder.push(text_column).push(" ILIKE ").push_bind(format!("%{}%", filter.value)); }
        FilterOperator::NotContains => { builder.push("(").push(text_column).push(" NOT ILIKE ").push_bind(format!("%{}%", filter.value)).push(" OR ").push(column).push(" IS NULL)"); }
        FilterOperator::Equals => { builder.push(text_column).push(" = ").push_bind(filter.value.clone()); }
        FilterOperator::NotEquals => { builder.push("(").push(text_column).push(" <> ").push_bind(filter.value.clone()).push(" OR ").push(column).push(" IS NULL)"); }
        FilterOperator::StartsWith => { builder.push(text_column).push(" ILIKE ").push_bind(format!("{}%", filter.value)); }
        FilterOperator::EndsWith => { builder.push(text_column).push(" ILIKE ").push_bind(format!("%{}", filter.value)); }
        FilterOperator::GreaterThan => { builder.push(text_column).push(" > ").push_bind(filter.value.clone()); }
        FilterOperator::GreaterOrEqual => { builder.push(text_column).push(" >= ").push_bind(filter.value.clone()); }
        FilterOperator::LessThan => { builder.push(text_column).push(" < ").push_bind(filter.value.clone()); }
        FilterOperator::LessOrEqual => { builder.push(text_column).push(" <= ").push_bind(filter.value.clone()); }
        FilterOperator::IsBlank => { builder.push("(").push(column.clone()).push(" IS NULL OR ").push(text_column).push(" = '')"); }
        FilterOperator::IsNotBlank => { builder.push("(").push(column.clone()).push(" IS NOT NULL AND ").push(text_column).push(" <> '')"); }
        FilterOperator::In | FilterOperator::NotIn => {
            if matches!(filter.operator, FilterOperator::NotIn) { builder.push("("); }
            builder.push(text_column).push(if matches!(filter.operator, FilterOperator::NotIn) { " NOT IN (" } else { " IN (" });
            let values = split_filter_values(&filter.value);
            for (index, value) in values.iter().enumerate() {
                if index > 0 { builder.push(", "); }
                builder.push_bind(value.clone());
            }
            if values.is_empty() { builder.push_bind(String::new()); }
            builder.push(")");
            if matches!(filter.operator, FilterOperator::NotIn) { builder.push(" OR ").push(column).push(" IS NULL)"); }
        }
    };
}

fn push_pg_filter_node(builder: &mut QueryBuilder<'_, Postgres>, node: &QueryFilterNode) {
    match node {
        QueryFilterNode::Condition(filter) => push_pg_filter_condition(builder, filter),
        QueryFilterNode::Group(group) => {
            builder.push("(");
            for (index, child) in group.children.iter().enumerate() {
                if index > 0 { builder.push(match group.combinator { FilterCombinator::And => " AND ", FilterCombinator::Or => " OR " }); }
                push_pg_filter_node(builder, child);
            }
            builder.push(")");
        }
    }
}

async fn run_postgres_query(
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
    let names = columns.iter().map(|column| column.name.clone()).collect::<Vec<_>>();
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

fn validate_controls(column_names: &[String], sort: &Option<QuerySortRequest>, filter_tree: &Option<QueryFilterGroup>) -> Result<(), ApiError> {
    validate_filter_tree(column_names, filter_tree)?;
    if let Some(sort) = sort {
        if !column_names.iter().any(|name| name == &sort.column) { return Err(ApiError::bad_request("ADVANCED_SORT_COLUMN_INVALID", "Sort column is not present in this result.")); }
    }
    Ok(())
}

fn push_mysql_filter_condition(builder: &mut QueryBuilder<'_, MySql>, filter: &QueryFilterRequest) {
    let column = quote_mysql_identifier(&filter.column);
    let text_column = format!("CAST({column} AS CHAR)");
    match filter.operator {
        FilterOperator::Contains => { builder.push(text_column).push(" LIKE ").push_bind(format!("%{}%", filter.value)); }
        FilterOperator::NotContains => { builder.push("(").push(text_column).push(" NOT LIKE ").push_bind(format!("%{}%", filter.value)).push(" OR ").push(column).push(" IS NULL)"); }
        FilterOperator::Equals => { builder.push(text_column).push(" = ").push_bind(filter.value.clone()); }
        FilterOperator::NotEquals => { builder.push("(").push(text_column).push(" <> ").push_bind(filter.value.clone()).push(" OR ").push(column).push(" IS NULL)"); }
        FilterOperator::StartsWith => { builder.push(text_column).push(" LIKE ").push_bind(format!("{}%", filter.value)); }
        FilterOperator::EndsWith => { builder.push(text_column).push(" LIKE ").push_bind(format!("%{}", filter.value)); }
        FilterOperator::GreaterThan => { builder.push(text_column).push(" > ").push_bind(filter.value.clone()); }
        FilterOperator::GreaterOrEqual => { builder.push(text_column).push(" >= ").push_bind(filter.value.clone()); }
        FilterOperator::LessThan => { builder.push(text_column).push(" < ").push_bind(filter.value.clone()); }
        FilterOperator::LessOrEqual => { builder.push(text_column).push(" <= ").push_bind(filter.value.clone()); }
        FilterOperator::IsBlank => { builder.push("(").push(column.clone()).push(" IS NULL OR ").push(text_column).push(" = '')"); }
        FilterOperator::IsNotBlank => { builder.push("(").push(column.clone()).push(" IS NOT NULL AND ").push(text_column).push(" <> '')"); }
        FilterOperator::In | FilterOperator::NotIn => {
            if matches!(filter.operator, FilterOperator::NotIn) { builder.push("("); }
            builder.push(text_column).push(if matches!(filter.operator, FilterOperator::NotIn) { " NOT IN (" } else { " IN (" });
            let values = split_filter_values(&filter.value);
            for (index, value) in values.iter().enumerate() {
                if index > 0 { builder.push(", "); }
                builder.push_bind(value.clone());
            }
            if values.is_empty() { builder.push_bind(String::new()); }
            builder.push(")");
            if matches!(filter.operator, FilterOperator::NotIn) { builder.push(" OR ").push(column).push(" IS NULL)"); }
        }
    };
}

fn push_mysql_filter_node(builder: &mut QueryBuilder<'_, MySql>, node: &QueryFilterNode) {
    match node {
        QueryFilterNode::Condition(filter) => push_mysql_filter_condition(builder, filter),
        QueryFilterNode::Group(group) => {
            builder.push("(");
            for (index, child) in group.children.iter().enumerate() {
                if index > 0 { builder.push(match group.combinator { FilterCombinator::And => " AND ", FilterCombinator::Or => " OR " }); }
                push_mysql_filter_node(builder, child);
            }
            builder.push(")");
        }
    }
}

fn push_sqlite_filter_condition(builder: &mut QueryBuilder<'_, Sqlite>, filter: &QueryFilterRequest) {
    let column = quote_sql_identifier(&filter.column);
    let text_column = format!("CAST({column} AS TEXT)");
    match filter.operator {
        FilterOperator::Contains => { builder.push(text_column).push(" LIKE ").push_bind(format!("%{}%", filter.value)); }
        FilterOperator::NotContains => { builder.push("(").push(text_column).push(" NOT LIKE ").push_bind(format!("%{}%", filter.value)).push(" OR ").push(column).push(" IS NULL)"); }
        FilterOperator::Equals => { builder.push(text_column).push(" = ").push_bind(filter.value.clone()); }
        FilterOperator::NotEquals => { builder.push("(").push(text_column).push(" <> ").push_bind(filter.value.clone()).push(" OR ").push(column).push(" IS NULL)"); }
        FilterOperator::StartsWith => { builder.push(text_column).push(" LIKE ").push_bind(format!("{}%", filter.value)); }
        FilterOperator::EndsWith => { builder.push(text_column).push(" LIKE ").push_bind(format!("%{}", filter.value)); }
        FilterOperator::GreaterThan => { builder.push(text_column).push(" > ").push_bind(filter.value.clone()); }
        FilterOperator::GreaterOrEqual => { builder.push(text_column).push(" >= ").push_bind(filter.value.clone()); }
        FilterOperator::LessThan => { builder.push(text_column).push(" < ").push_bind(filter.value.clone()); }
        FilterOperator::LessOrEqual => { builder.push(text_column).push(" <= ").push_bind(filter.value.clone()); }
        FilterOperator::IsBlank => { builder.push("(").push(column.clone()).push(" IS NULL OR ").push(text_column).push(" = '')"); }
        FilterOperator::IsNotBlank => { builder.push("(").push(column.clone()).push(" IS NOT NULL AND ").push(text_column).push(" <> '')"); }
        FilterOperator::In | FilterOperator::NotIn => {
            if matches!(filter.operator, FilterOperator::NotIn) { builder.push("("); }
            builder.push(text_column).push(if matches!(filter.operator, FilterOperator::NotIn) { " NOT IN (" } else { " IN (" });
            let values = split_filter_values(&filter.value);
            for (index, value) in values.iter().enumerate() {
                if index > 0 { builder.push(", "); }
                builder.push_bind(value.clone());
            }
            if values.is_empty() { builder.push_bind(String::new()); }
            builder.push(")");
            if matches!(filter.operator, FilterOperator::NotIn) { builder.push(" OR ").push(column).push(" IS NULL)"); }
        }
    };
}

fn push_sqlite_filter_node(builder: &mut QueryBuilder<'_, Sqlite>, node: &QueryFilterNode) {
    match node {
        QueryFilterNode::Condition(filter) => push_sqlite_filter_condition(builder, filter),
        QueryFilterNode::Group(group) => {
            builder.push("(");
            for (index, child) in group.children.iter().enumerate() {
                if index > 0 { builder.push(match group.combinator { FilterCombinator::And => " AND ", FilterCombinator::Or => " OR " }); }
                push_sqlite_filter_node(builder, child);
            }
            builder.push(")");
        }
    }
}

async fn run_mysql_query(
    pool: MySqlPool, run_id: String, sql: String, limit: usize, offset: usize,
    sort: Option<QuerySortRequest>, filter_tree: Option<QueryFilterGroup>,
) -> Result<QueryResponse, ApiError> {
    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = pool.describe(&describe_sql).await.map_err(|error| ApiError::database(format!("Could not describe MySQL/MariaDB result: {error}")))?;
    let columns: Vec<QueryColumn> = description.columns().iter().enumerate().map(|(index, column)| {
        let native_type = column.type_info().name().to_string();
        QueryColumn { id: format!("column:{index}:{}", column.name()), name: column.name().to_string(), logical_type: logical_type_mysql(&native_type), native_type }
    }).collect();
    let names = columns.iter().map(|column| column.name.clone()).collect::<Vec<_>>();
    validate_controls(&names, &sort, &filter_tree)?;
    let mut builder = QueryBuilder::<MySql>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    if let Some(group) = &filter_tree {
        builder.push(" WHERE ");
        push_mysql_filter_node(&mut builder, &QueryFilterNode::Group(group.clone()));
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
    sort: Option<QuerySortRequest>, filter_tree: Option<QueryFilterGroup>,
) -> Result<QueryResponse, ApiError> {
    let describe_sql = format!("SELECT * FROM ({sql}) AS __lightbi_query LIMIT 0");
    let description = pool.describe(&describe_sql).await.map_err(|error| ApiError::database(format!("Could not describe SQLite result: {error}")))?;
    let columns: Vec<QueryColumn> = description.columns().iter().enumerate().map(|(index, column)| {
        let native_type = column.type_info().name().to_string();
        QueryColumn { id: format!("column:{index}:{}", column.name()), name: column.name().to_string(), logical_type: logical_type_sqlite(&native_type), native_type }
    }).collect();
    let names = columns.iter().map(|column| column.name.clone()).collect::<Vec<_>>();
    validate_controls(&names, &sort, &filter_tree)?;
    let mut builder = QueryBuilder::<Sqlite>::new(format!("SELECT * FROM ({sql}) AS __lightbi_query"));
    if let Some(group) = &filter_tree {
        builder.push(" WHERE ");
        push_sqlite_filter_node(&mut builder, &QueryFilterNode::Group(group.clone()));
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

fn export_job_response(job_id: &str, job: &ExportJob) -> ExportJobResponse {
    let status = match job.status {
        ExportJobStatus::Running => "running",
        ExportJobStatus::Completed => "completed",
        ExportJobStatus::Failed => "failed",
        ExportJobStatus::Cancelled => "cancelled",
    }.to_string();
    ExportJobResponse {
        job_id: job_id.to_string(),
        status,
        format: job.format.clone(),
        rows: job.rows,
        file_name: job.file_name.clone(),
        error: job.error.clone(),
    }
}

fn import_job_response(job_id: &str, job: &ImportJob) -> ImportJobResponse {
    let status = match job.status {
        ExportJobStatus::Running => "running",
        ExportJobStatus::Completed => "completed",
        ExportJobStatus::Failed => "failed",
        ExportJobStatus::Cancelled => "cancelled",
    }.to_string();
    ImportJobResponse {
        job_id: job_id.to_string(),
        status,
        statement_count: job.statement_count,
        executed_statements: job.executed_statements,
        skipped_statements: job.skipped_statements,
        error: job.error.clone(),
    }
}

fn parse_csv_import_rows(file_bytes: &[u8], mapping: &HashMap<String, String>) -> Result<Vec<HashMap<String, Value>>, ApiError> {
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_reader(file_bytes);
    let headers = reader.headers()
        .map_err(|error| ApiError::bad_request("ADVANCED_IMPORT_CSV_HEADERS", format!("Could not read CSV headers: {error}")))?
        .iter()
        .map(str::to_string)
        .collect::<Vec<_>>();
    let effective_mapping = if mapping.is_empty() {
        headers.iter().map(|name| (name.clone(), name.clone())).collect::<HashMap<_, _>>()
    } else {
        mapping.clone()
    };
    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|error| ApiError::bad_request("ADVANCED_IMPORT_CSV_ROW", format!("Could not read CSV row: {error}")))?;
        let mut row = HashMap::new();
        for (target, source) in &effective_mapping {
            if target.trim().is_empty() || source.trim().is_empty() {
                continue;
            }
            if let Some(index) = headers.iter().position(|header| header == source) {
                let value = record.get(index).unwrap_or_default();
                row.insert(target.clone(), if value.trim().is_empty() { Value::Null } else { Value::String(value.to_string()) });
            }
        }
        if !row.is_empty() {
            rows.push(row);
        }
        if rows.len() > MAX_IMPORT_ROWS {
            return Err(ApiError::bad_request("ADVANCED_IMPORT_ROW_LIMIT", "CSV import is limited to 100,000 rows per interactive job."));
        }
    }
    if rows.is_empty() {
        return Err(ApiError::bad_request("ADVANCED_IMPORT_EMPTY", "CSV import did not contain mapped rows."));
    }
    Ok(rows)
}

async fn run_sql_import_job(
    session: ConnectionSession,
    connection_id: String,
    job_id: String,
    statements: Vec<String>,
    state: Arc<AppState>,
) -> Result<(), ApiError> {
    match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start PostgreSQL import transaction: {error}")))?;
            for statement in &statements {
                if let Err(error) = sqlx::query(statement).execute(&mut *tx).await {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!("PostgreSQL import failed and was rolled back: {error}")));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit PostgreSQL import transaction: {error}")))?;
        }
        ConnectionBackend::MySql(pool) => {
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start MySQL/MariaDB import transaction: {error}")))?;
            for statement in &statements {
                if let Err(error) = sqlx::query(statement).execute(&mut *tx).await {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!("MySQL/MariaDB import failed and was rolled back: {error}")));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit MySQL/MariaDB import transaction: {error}")))?;
        }
        ConnectionBackend::Sqlite(pool) => {
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start SQLite import transaction: {error}")))?;
            for statement in &statements {
                if let Err(error) = sqlx::query(statement).execute(&mut *tx).await {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!("SQLite import failed and was rolled back: {error}")));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit SQLite import transaction: {error}")))?;
        }
        ConnectionBackend::Mongo(_) => return Err(ApiError::bad_request("ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED", "MongoDB SQL script import is not enabled.")),
    }
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(())
}

async fn run_csv_import_job(
    session: ConnectionSession,
    connection_id: String,
    job_id: String,
    schema: String,
    table: String,
    rows: Vec<HashMap<String, Value>>,
    error_mode: ImportErrorMode,
    state: Arc<AppState>,
) -> Result<Option<String>, ApiError> {
    match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let schemas = discover_postgres_schema(pool).await?;
            let table_node = schemas.iter().find(|item| item.name == schema.trim())
                .and_then(|schema_node| schema_node.tables.iter().find(|item| item.name == table.trim()))
                .ok_or_else(|| ApiError::not_found("CSV import target table was not found."))?;
            validate_import_columns(table_node, &rows)?;
            if error_mode == ImportErrorMode::SkipContinue {
                let mut skipped = 0usize;
                for row in &rows {
                    match postgres_insert_values(pool, schema.trim(), table.trim(), row).await {
                        Ok(()) => increment_import_job(&state, &job_id).await?,
                        Err(_) => { skipped += 1; skip_import_job(&state, &job_id).await?; }
                    }
                }
                invalidate_mutation_caches(&state, &connection_id).await;
                return Ok((skipped > 0).then(|| format!("Skipped {skipped} CSV row(s).")));
            }
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start PostgreSQL CSV import transaction: {error}")))?;
            for row in &rows {
                if let Err(error) = postgres_insert_values_tx(&mut tx, schema.trim(), table.trim(), row).await {
                    if error_mode == ImportErrorMode::StopCommit {
                        tx.commit().await.ok();
                    } else {
                        tx.rollback().await.ok();
                    }
                    return Err(ApiError::database(format!("PostgreSQL CSV import failed: {error}")));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit PostgreSQL CSV import transaction: {error}")))?;
        }
        ConnectionBackend::MySql(pool) => {
            if schema.trim() != session.database {
                return Err(ApiError::bad_request("ADVANCED_IMPORT_SCHEMA_INVALID", "MySQL/MariaDB CSV import must target the connected database."));
            }
            let schemas = discover_mysql_schema(pool, &session.database).await?;
            let table_node = schemas[0].tables.iter().find(|item| item.name == table.trim()).ok_or_else(|| ApiError::not_found("CSV import target table was not found."))?;
            validate_import_columns(table_node, &rows)?;
            if error_mode == ImportErrorMode::SkipContinue {
                let mut skipped = 0usize;
                for row in &rows {
                    match mysql_insert_values(pool, schema.trim(), table.trim(), row).await {
                        Ok(()) => increment_import_job(&state, &job_id).await?,
                        Err(_) => { skipped += 1; skip_import_job(&state, &job_id).await?; }
                    }
                }
                invalidate_mutation_caches(&state, &connection_id).await;
                return Ok((skipped > 0).then(|| format!("Skipped {skipped} CSV row(s).")));
            }
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start MySQL/MariaDB CSV import transaction: {error}")))?;
            for row in &rows {
                if let Err(error) = mysql_insert_values_tx(&mut tx, schema.trim(), table.trim(), row).await {
                    if error_mode == ImportErrorMode::StopCommit { tx.commit().await.ok(); } else { tx.rollback().await.ok(); }
                    return Err(ApiError::database(format!("MySQL/MariaDB CSV import failed: {error}")));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit MySQL/MariaDB CSV import transaction: {error}")))?;
        }
        ConnectionBackend::Sqlite(pool) => {
            if schema.trim() != "main" {
                return Err(ApiError::bad_request("ADVANCED_IMPORT_SCHEMA_INVALID", "SQLite CSV import requires the main schema."));
            }
            let schemas = discover_sqlite_schema(pool).await?;
            let table_node = schemas[0].tables.iter().find(|item| item.name == table.trim()).ok_or_else(|| ApiError::not_found("CSV import target table was not found."))?;
            validate_import_columns(table_node, &rows)?;
            if error_mode == ImportErrorMode::SkipContinue {
                let mut skipped = 0usize;
                for row in &rows {
                    match sqlite_insert_values(pool, table.trim(), row).await {
                        Ok(()) => increment_import_job(&state, &job_id).await?,
                        Err(_) => { skipped += 1; skip_import_job(&state, &job_id).await?; }
                    }
                }
                invalidate_mutation_caches(&state, &connection_id).await;
                return Ok((skipped > 0).then(|| format!("Skipped {skipped} CSV row(s).")));
            }
            let mut tx = pool.begin().await.map_err(|error| ApiError::database(format!("Could not start SQLite CSV import transaction: {error}")))?;
            for row in &rows {
                if let Err(error) = sqlite_insert_values_tx(&mut tx, table.trim(), row).await {
                    if error_mode == ImportErrorMode::StopCommit { tx.commit().await.ok(); } else { tx.rollback().await.ok(); }
                    return Err(ApiError::database(format!("SQLite CSV import failed: {error}")));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| ApiError::database(format!("Could not commit SQLite CSV import transaction: {error}")))?;
        }
        ConnectionBackend::Mongo(_) => return Err(ApiError::bad_request("ADVANCED_IMPORT_PROVIDER_UNSUPPORTED", "CSV import targets relational database sessions only.")),
    }
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(None)
}

fn validate_import_columns(table: &TableNode, rows: &[HashMap<String, Value>]) -> Result<(), ApiError> {
    if !table.writable || table.kind != "base_table" {
        return Err(ApiError::bad_request("ADVANCED_IMPORT_TABLE_READ_ONLY", "CSV import target must be a writable base table."));
    }
    let allowed = table.columns.iter().map(|column| column.name.as_str()).collect::<Vec<_>>();
    for column in rows.first().into_iter().flat_map(|row| row.keys()) {
        if !allowed.iter().any(|allowed| allowed == column) {
            return Err(ApiError::bad_request("ADVANCED_IMPORT_COLUMN_INVALID", format!("CSV import target column {column} does not exist.")));
        }
    }
    Ok(())
}

async fn increment_import_job(state: &Arc<AppState>, job_id: &str) -> Result<(), ApiError> {
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(job_id) {
        if job.status == ExportJobStatus::Cancelled {
            return Err(ApiError::bad_request("ADVANCED_IMPORT_CANCELLED", "Import job was cancelled."));
        }
        job.executed_statements += 1;
    }
    Ok(())
}

async fn skip_import_job(state: &Arc<AppState>, job_id: &str) -> Result<(), ApiError> {
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(job_id) {
        if job.status == ExportJobStatus::Cancelled {
            return Err(ApiError::bad_request("ADVANCED_IMPORT_CANCELLED", "Import job was cancelled."));
        }
        job.skipped_statements += 1;
    }
    Ok(())
}

async fn run_export_job(
    session: ConnectionSession,
    job_id: String,
    sql: String,
    format: String,
    table_name: Option<String>,
    sort: Option<QuerySortRequest>,
    filter_tree: Option<QueryFilterGroup>,
    state: Arc<AppState>,
) -> Result<Vec<u8>, ApiError> {
    let mut offset = 0;
    let mut total_rows = 0;
    let mut output = Vec::<u8>::new();
    let mut first_json_row = true;
    let mut columns = Vec::<QueryColumn>::new();
    let mut xlsx_rows = Vec::<Vec<Value>>::new();
    let target_table = table_name.unwrap_or_else(|| "lightbi_export".to_string());

    if format == "json" {
        output.extend_from_slice(b"[\n");
    }

    for page_index in 0..=MAX_EXPORT_ROWS / EXPORT_PAGE_SIZE {
        let page = match session.backend.clone() {
            ConnectionBackend::Postgres(pool) => run_postgres_query(pool, format!("export:{job_id}:{page_index}"), sql.clone(), EXPORT_PAGE_SIZE, offset, sort.clone(), filter_tree.clone()).await?,
            ConnectionBackend::MySql(pool) => run_mysql_query(pool, format!("export:{job_id}:{page_index}"), sql.clone(), EXPORT_PAGE_SIZE, offset, sort.clone(), filter_tree.clone()).await?,
            ConnectionBackend::Sqlite(pool) => run_sqlite_query(pool, format!("export:{job_id}:{page_index}"), sql.clone(), EXPORT_PAGE_SIZE, offset, sort.clone(), filter_tree.clone()).await?,
            ConnectionBackend::Mongo(_) => return Err(ApiError::bad_request("ADVANCED_EXPORT_MONGO_UNSUPPORTED", "MongoDB export still uses the document query path.")),
        };
        if page_index == 0 {
            columns = page.columns;
            if format == "csv" {
                output.extend_from_slice(csv_line(columns.iter().map(|column| column.name.as_str())).as_bytes());
            }
        }
        if page.rows.is_empty() {
            break;
        }
        if total_rows + page.rows.len() > MAX_EXPORT_ROWS {
            return Err(ApiError::bad_request("ADVANCED_EXPORT_ROW_LIMIT", "Backend export is limited to 250,000 rows per interactive job."));
        }
        match format.as_str() {
            "json" => {
                for row in &page.rows {
                    if !first_json_row {
                        output.extend_from_slice(b",\n");
                    }
                    first_json_row = false;
                    let object = serde_json::Map::from_iter(columns.iter().enumerate().map(|(index, column)| (column.name.clone(), row.get(index).cloned().unwrap_or(Value::Null))));
                    output.extend_from_slice(serde_json::to_string(&Value::Object(object)).unwrap_or_else(|_| "{}".to_string()).as_bytes());
                }
            }
            "sql" => {
                let names = columns.iter().map(|column| quote_sql_identifier(&column.name)).collect::<Vec<_>>().join(", ");
                let table = quote_sql_identifier(&target_table);
                for row in &page.rows {
                    let values = row.iter().map(sql_literal_json).collect::<Vec<_>>().join(", ");
                    output.extend_from_slice(format!("INSERT INTO {table} ({names}) VALUES ({values});\n").as_bytes());
                }
            }
            "xlsx" => {
                xlsx_rows.extend(page.rows.iter().cloned());
            }
            _ => {
                for row in &page.rows {
                    output.extend_from_slice(csv_line(row.iter().map(json_export_cell)).as_bytes());
                }
            }
        }
        total_rows += page.rows.len();
        if let Some(job) = state.advanced.export_jobs.write().await.get_mut(&job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return Err(ApiError::bad_request("ADVANCED_EXPORT_CANCELLED", "Export job was cancelled."));
            }
            job.rows = total_rows;
        }
        if !page.page.has_more {
            break;
        }
        offset += page.rows.len();
    }

    if format == "json" {
        output.extend_from_slice(b"\n]\n");
    }
    if format == "xlsx" {
        let path = format!("/tmp/lightbi-advanced-export-{job_id}.xlsx");
        let result_set = ResultSet {
            columns: columns.iter().map(|column| ColumnDef { name: column.name.clone(), data_type: column.native_type.clone() }).collect(),
            rows: xlsx_rows,
            statistics: HashMap::new(),
            metadata: ExecutionMetadata { rows_processed: total_rows as u64, execution_time_ms: 0, backend_name: "advanced".to_string() },
        };
        ExcelGenerator::generate_from_resultset(&result_set, &path)
            .map_err(|error| ApiError::database(format!("Could not generate XLSX export: {error}")))?;
        let bytes = tokio::fs::read(&path).await.map_err(|error| ApiError::database(format!("Could not read XLSX export: {error}")))?;
        let _ = tokio::fs::remove_file(&path).await;
        return Ok(bytes);
    }
    Ok(output)
}

fn csv_line<T: AsRef<str>>(cells: impl IntoIterator<Item = T>) -> String {
    let mut line = cells.into_iter().map(|cell| csv_cell(cell.as_ref())).collect::<Vec<_>>().join(",");
    line.push('\n');
    line
}

fn csv_cell(value: &str) -> String {
    let hardened = if value.starts_with(['=', '+', '-', '@']) { format!("'{value}") } else { value.to_string() };
    if hardened.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", hardened.replace('"', "\"\""))
    } else {
        hardened
    }
}

fn json_export_cell(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        Value::Bool(true) => "true".to_string(),
        Value::Bool(false) => "false".to_string(),
        Value::Number(number) => number.to_string(),
        other => other.to_string(),
    }
}

fn sql_literal_json(value: &Value) -> String {
    match value {
        Value::Null => "NULL".to_string(),
        Value::Bool(value) => if *value { "TRUE" } else { "FALSE" }.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(text) => format!("'{}'", text.replace('\'', "''")),
        other => format!("'{}'", other.to_string().replace('\'', "''")),
    }
}

async fn postgres_insert_values(pool: &PgPool, schema: &str, table: &str, row: &HashMap<String, Value>) -> Result<(), sqlx::Error> {
    let mut builder = postgres_insert_builder(schema, table, row);
    builder.build().execute(pool).await.map(|_| ())
}

async fn postgres_insert_values_tx(tx: &mut sqlx::Transaction<'_, Postgres>, schema: &str, table: &str, row: &HashMap<String, Value>) -> Result<(), sqlx::Error> {
    let mut builder = postgres_insert_builder(schema, table, row);
    builder.build().execute(&mut **tx).await.map(|_| ())
}

fn postgres_insert_builder<'a>(schema: &'a str, table: &'a str, row: &'a HashMap<String, Value>) -> QueryBuilder<'a, Postgres> {
    let columns = sorted_keys(row);
    let mut builder = QueryBuilder::<Postgres>::new(format!("INSERT INTO {}.{} (", quote_pg_identifier(schema), quote_pg_identifier(table)));
    for (index, column) in columns.iter().enumerate() {
        if index > 0 { builder.push(", "); }
        builder.push(quote_pg_identifier(column));
    }
    builder.push(") VALUES (");
    for (index, column) in columns.iter().enumerate() {
        if index > 0 { builder.push(", "); }
        postgres_push_import_value(&mut builder, &row[column]);
    }
    builder.push(")");
    builder
}

fn postgres_push_import_value(builder: &mut QueryBuilder<Postgres>, value: &Value) {
    match value {
        Value::Null => { builder.push("NULL"); }
        Value::String(value) => { builder.push_bind(value.clone()); }
        Value::Bool(value) => { builder.push_bind(*value); }
        Value::Number(value) if value.is_i64() => { builder.push_bind(value.as_i64().unwrap_or_default()); }
        Value::Number(value) if value.is_u64() => { builder.push_bind(value.as_u64().and_then(|item| i64::try_from(item).ok()).unwrap_or(i64::MAX)); }
        Value::Number(value) => { builder.push_bind(value.as_f64().unwrap_or_default()); }
        other => { builder.push_bind(other.to_string()); }
    };
}

async fn mysql_insert_values(pool: &MySqlPool, schema: &str, table: &str, row: &HashMap<String, Value>) -> Result<(), sqlx::Error> {
    let mut builder = mysql_insert_builder(schema, table, row);
    builder.build().execute(pool).await.map(|_| ())
}

async fn mysql_insert_values_tx(tx: &mut sqlx::Transaction<'_, MySql>, schema: &str, table: &str, row: &HashMap<String, Value>) -> Result<(), sqlx::Error> {
    let mut builder = mysql_insert_builder(schema, table, row);
    builder.build().execute(&mut **tx).await.map(|_| ())
}

fn mysql_insert_builder<'a>(schema: &'a str, table: &'a str, row: &'a HashMap<String, Value>) -> QueryBuilder<'a, MySql> {
    let columns = sorted_keys(row);
    let mut builder = QueryBuilder::<MySql>::new(format!("INSERT INTO {}.{} (", quote_mysql_identifier(schema), quote_mysql_identifier(table)));
    for (index, column) in columns.iter().enumerate() {
        if index > 0 { builder.push(", "); }
        builder.push(quote_mysql_identifier(column));
    }
    builder.push(") VALUES (");
    for (index, column) in columns.iter().enumerate() {
        if index > 0 { builder.push(", "); }
        mysql_push_value(&mut builder, &row[column]);
    }
    builder.push(")");
    builder
}

async fn sqlite_insert_values(pool: &SqlitePool, table: &str, row: &HashMap<String, Value>) -> Result<(), sqlx::Error> {
    let mut builder = sqlite_insert_builder(table, row);
    builder.build().execute(pool).await.map(|_| ())
}

async fn sqlite_insert_values_tx(tx: &mut sqlx::Transaction<'_, Sqlite>, table: &str, row: &HashMap<String, Value>) -> Result<(), sqlx::Error> {
    let mut builder = sqlite_insert_builder(table, row);
    builder.build().execute(&mut **tx).await.map(|_| ())
}

fn sqlite_insert_builder<'a>(table: &'a str, row: &'a HashMap<String, Value>) -> QueryBuilder<'a, Sqlite> {
    let columns = sorted_keys(row);
    let mut builder = QueryBuilder::<Sqlite>::new(format!("INSERT INTO {} (", quote_sql_identifier(table)));
    for (index, column) in columns.iter().enumerate() {
        if index > 0 { builder.push(", "); }
        builder.push(quote_sql_identifier(column));
    }
    builder.push(") VALUES (");
    for (index, column) in columns.iter().enumerate() {
        if index > 0 { builder.push(", "); }
        sqlite_push_value(&mut builder, &row[column]);
    }
    builder.push(")");
    builder
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
    if upper.contains("BOOL") {
        return row.try_get::<bool, _>(index).map(Value::Bool)
            .or_else(|_| row.try_get::<i8, _>(index).map(|value| Value::Bool(value != 0)))
            .or_else(|_| row.try_get::<u8, _>(index).map(|value| Value::Bool(value != 0)))
            .unwrap_or_else(|_| Value::String("[unsupported value]".into()));
    }
    if upper.contains("INT") {
        return row.try_get::<i64, _>(index).map(|value| Value::String(value.to_string()))
            .or_else(|_| row.try_get::<u64, _>(index).map(|value| Value::String(value.to_string())))
            .unwrap_or_else(|_| Value::String("[unsupported value]".into()));
    }
    if upper.contains("FLOAT") || upper.contains("DOUBLE") { return row.try_get::<f64, _>(index).map(|value| json!(value)).unwrap_or(Value::Null); }
    if upper.contains("DECIMAL") { return row.try_get::<Decimal, _>(index).map(|value| Value::String(value.to_string())).unwrap_or(Value::Null); }
    if upper == "DATE" { return row.try_get::<NaiveDate, _>(index).map(|value| Value::String(value.to_string())).unwrap_or(Value::Null); }
    if upper.contains("DATETIME") || upper.contains("TIMESTAMP") { return row.try_get::<NaiveDateTime, _>(index).map(|value| Value::String(value.to_string())).unwrap_or(Value::Null); }
    if upper == "TIME" { return row.try_get::<NaiveTime, _>(index).map(|value| Value::String(value.to_string())).unwrap_or(Value::Null); }
    if upper == "JSON" { return row.try_get::<Value, _>(index).unwrap_or(Value::Null); }
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
    fn validates_write_script_statements() {
        match split_script_statements("CREATE TABLE people (id INT); INSERT INTO people (id) VALUES (1);") {
            Ok(statements) => assert_eq!(statements.len(), 2),
            Err(_) => panic!("valid script should pass"),
        }
        assert!(split_script_statements("SELECT * FROM people").is_err());
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

    #[test]
    fn deserializes_nested_filter_tree() {
        let request: ExecuteQueryRequest = serde_json::from_value(json!({
            "runId": "run-1",
            "sql": "SELECT name, status FROM users",
            "filterTree": {
                "combinator": "and",
                "children": [
                    { "column": "name", "operator": "not_contains", "value": "test" },
                    {
                        "combinator": "or",
                        "children": [
                            { "column": "status", "operator": "equals", "value": "active" },
                            { "column": "status", "operator": "is_blank" }
                        ]
                    }
                ]
            }
        }))
        .expect("filter tree request should deserialize");
        let group = request.filter_tree.expect("filter tree should exist");
        assert!(matches!(group.combinator, FilterCombinator::And));
        assert_eq!(group.children.len(), 2);
    }

    #[tokio::test]
    async fn sqlite_mutation_requires_primary_key_and_expected_value() {
        let pool = SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.expect("sqlite pool");
        sqlx::query("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL)").execute(&pool).await.expect("create table");
        sqlx::query("INSERT INTO people (id, name) VALUES (1, 'Alice')").execute(&pool).await.expect("insert row");
        let request = MutationRequest {
            schema: "main".into(), table: "people".into(),
            rows: vec![RowMutationRequest {
                action: MutationAction::Update,
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
                    action: MutationAction::Update,
                    key: HashMap::from([("id".into(), json!(1))]),
                    changes: HashMap::from([("name".into(), json!("Alicia"))]),
                    expected: HashMap::from([("name".into(), json!("Alice"))]),
                },
                RowMutationRequest {
                    action: MutationAction::Update,
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

    fn mutation_test_table(native_type: &str) -> TableNode {
        TableNode {
            name: "people".into(), kind: "base_table".into(), estimated_rows: None,
            table_size_bytes: None, comment: None, ddl: None, writable: true,
            indexes: Vec::new(), foreign_keys: Vec::new(),
            columns: vec![
                ColumnNode { name: "id".into(), native_type: "integer".into(), nullable: false, primary_key: true, default_value: None, comment: None },
                ColumnNode { name: "name".into(), native_type: native_type.into(), nullable: false, primary_key: false, default_value: None, comment: None },
            ],
        }
    }

    fn mutation_test_request() -> MutationRequest {
        MutationRequest {
            schema: "public".into(), table: "people".into(),
            rows: vec![RowMutationRequest {
                action: MutationAction::Update,
                key: HashMap::from([("id".into(), json!(1))]),
                changes: HashMap::from([("name".into(), json!("Alicia"))]),
                expected: HashMap::from([("name".into(), json!("Alice"))]),
            }],
        }
    }

    #[test]
    fn compiles_redacted_postgres_and_mysql_mutations() {
        let request = mutation_test_request();
        let table = mutation_test_table("character varying");
        let postgres = match postgres_mutation_builder(&request, &request.rows[0], &table) {
            Ok(builder) => builder.sql().to_string(),
            Err(error) => panic!("postgres builder failed: {}", error.message),
        };
        assert!(postgres.starts_with("UPDATE \"public\".\"people\" SET \"name\" = CAST($1 AS character varying)"));
        assert!(postgres.contains("\"id\" = CAST($2 AS integer)"));
        assert!(!postgres.contains("Alicia"));
        let mysql = mysql_mutation_builder(&request, &request.rows[0]).sql().to_string();
        assert!(mysql.starts_with("UPDATE `public`.`people` SET `name` = ?"));
        assert!(mysql.contains("`id` = ?"));
        assert!(!mysql.contains("Alicia"));
    }

    #[test]
    fn compiles_insert_and_delete_mutations() {
        let mut insert = mutation_test_request();
        insert.rows[0].action = MutationAction::Insert;
        insert.rows[0].key.clear();
        insert.rows[0].expected.clear();
        insert.rows[0].changes.insert("id".into(), json!(3));
        let sqlite_insert = sqlite_mutation_builder(&insert, &insert.rows[0]).sql().to_string();
        assert!(sqlite_insert.starts_with("INSERT INTO \"people\""));
        assert!(!sqlite_insert.contains("Alicia"));

        let mut delete = mutation_test_request();
        delete.rows[0].action = MutationAction::Delete;
        delete.rows[0].changes.clear();
        delete.rows[0].expected.clear();
        let sqlite_delete = sqlite_mutation_builder(&delete, &delete.rows[0]).sql().to_string();
        assert!(sqlite_delete.starts_with("DELETE FROM \"people\" WHERE"));
        assert!(!sqlite_delete.contains("Alicia"));
    }

    #[test]
    fn rejects_postgres_types_outside_the_mutation_allowlist() {
        let request = mutation_test_request();
        let error = match postgres_mutation_builder(&request, &request.rows[0], &mutation_test_table("ARRAY")) {
            Ok(_) => panic!("array mutation must be rejected"),
            Err(error) => error,
        };
        assert_eq!(error.code, "ADVANCED_MUTATION_TYPE_UNSUPPORTED");
    }
}
