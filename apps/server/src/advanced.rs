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
use bigdecimal::BigDecimal;
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use lightbi_export::excel::ExcelGenerator;
use lightbi_runtime_backend::model::{ColumnDef, ExecutionMetadata, ResultSet};
use mongodb::{
    bson::{Bson, Document},
    Client as MongoClient,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{
    mysql::{MySqlPoolOptions, MySqlRow},
    postgres::{PgPoolOptions, PgRow},
    sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteRow},
    AssertSqlSafe, Column, Executor, MySql, MySqlPool, PgPool, Postgres, QueryBuilder, Row,
    SqlSafeStr, Sqlite, SqlitePool, TypeInfo, ValueRef,
};
use tiberius::{
    Client as SqlServerClient, ColumnData as SqlServerColumnData, Config as SqlServerConfig,
};
use tokio::{
    net::TcpStream,
    process::{Child, Command},
    sync::{Mutex, RwLock},
    task::AbortHandle,
};
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};
use url::Url;
use uuid::Uuid;

use crate::AppState;

mod connection;
mod export_jobs;
mod import_jobs;
mod mutation;
mod query_filters;
mod query_handler;
mod query_runners;
mod query_values;
mod schema;
mod scripts;

pub(crate) use connection::{create_connection, delete_connection};
pub(crate) use export_jobs::{
    cancel_export_job, download_export_job, get_export_job, start_export,
};
pub(crate) use import_jobs::{
    cancel_import_job, get_import_job, start_csv_import, start_sql_import,
};
pub(crate) use mutation::{commit_mutation, preview_mutation};
pub(crate) use query_handler::{cancel_run, execute_document_query, execute_query, explain_query};
pub(crate) use schema::{get_schema, get_table_count};
pub(crate) use scripts::{commit_script, preview_script};

use connection::{connect_sql_server, connection};
use mutation::{
    ensure_write_allowed, invalidate_mutation_caches, mysql_push_value, sorted_keys,
    sqlite_push_value,
};
use query_filters::{
    push_mysql_filter_node, push_pg_filter_node, push_sqlite_filter_node, sql_server_filter_group,
};
use query_handler::{
    normalized_read_query, query_response, validate_controls, validate_filter_tree,
};
use query_runners::{run_mysql_query, run_postgres_query, run_sql_server_query, run_sqlite_query};
use query_values::{
    logical_type, logical_type_mysql, logical_type_sqlite, mysql_cell, pg_cell, sql_server_cell,
    sqlite_cell,
};
use schema::{discover_mysql_schema, discover_postgres_schema, discover_sqlite_schema};
use scripts::split_script_statements;

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
    SqlServer(SqlServerConnection),
}

#[derive(Clone)]
struct SqlServerConnection {
    connection_string: String,
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

fn table_node_mut<'a>(
    schemas: &'a mut [SchemaNode],
    schema: &str,
    table: &str,
) -> Option<&'a mut TableNode> {
    schemas
        .iter_mut()
        .find(|candidate| candidate.name == schema)
        .and_then(|schema_node| {
            schema_node
                .tables
                .iter_mut()
                .find(|candidate| candidate.name == table)
        })
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

fn bson_type(value: &Bson) -> &'static str {
    match value {
        Bson::Double(_) => "double",
        Bson::String(_) => "string",
        Bson::Array(_) => "array",
        Bson::Document(_) => "document",
        Bson::Boolean(_) => "boolean",
        Bson::DateTime(_) => "date",
        Bson::Null => "null",
        Bson::Int32(_) => "int32",
        Bson::Int64(_) => "int64",
        Bson::ObjectId(_) => "objectId",
        _ => "bson",
    }
}

fn quote_sql_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn quote_pg_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn quote_mysql_identifier(value: &str) -> String {
    format!("`{}`", value.replace('`', "``"))
}

fn quote_sql_server_identifier(value: &str) -> String {
    format!("[{}]", value.replace(']', "]]"))
}

#[cfg(test)]
mod tests {
    use super::mutation::{
        mysql_mutation_builder, postgres_mutation_builder, sqlite_mutation_builder,
        validate_mutation_request,
    };
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
        match split_script_statements(
            "CREATE TABLE people (id INT); INSERT INTO people (id) VALUES (1);",
        ) {
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
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite pool");
        sqlx::query("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
            .execute(&pool)
            .await
            .expect("create table");
        sqlx::query("INSERT INTO people (id, name) VALUES (1, 'Alice')")
            .execute(&pool)
            .await
            .expect("insert row");
        let request = MutationRequest {
            schema: "main".into(),
            table: "people".into(),
            rows: vec![RowMutationRequest {
                action: MutationAction::Update,
                key: HashMap::from([("id".into(), json!(1))]),
                changes: HashMap::from([("name".into(), json!("Alicia"))]),
                expected: HashMap::from([("name".into(), json!("Alice"))]),
            }],
        };
        let schemas = discover_sqlite_schema(&pool)
            .await
            .unwrap_or_else(|error| panic!("discover schema: {}", error.message));
        let table = schemas[0]
            .tables
            .iter()
            .find(|table| table.name == "people")
            .expect("people table");
        assert!(table.writable);
        assert!(table
            .columns
            .iter()
            .any(|column| column.name == "id" && column.primary_key));
        validate_mutation_request(table, &request)
            .unwrap_or_else(|error| panic!("valid mutation: {}", error.message));
        let result = sqlite_mutation_builder(&request, &request.rows[0])
            .build()
            .execute(&pool)
            .await
            .expect("update row");
        assert_eq!(result.rows_affected(), 1);
        let name: String = sqlx::query_scalar("SELECT name FROM people WHERE id = 1")
            .fetch_one(&pool)
            .await
            .expect("read row");
        assert_eq!(name, "Alicia");
        let conflict = sqlite_mutation_builder(&request, &request.rows[0])
            .build()
            .execute(&pool)
            .await
            .expect("stale update");
        assert_eq!(conflict.rows_affected(), 0);
    }

    #[tokio::test]
    async fn sqlite_mutation_rolls_back_the_entire_batch_on_conflict() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite pool");
        sqlx::query("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
            .execute(&pool)
            .await
            .expect("create table");
        sqlx::query("INSERT INTO people (id, name) VALUES (1, 'Alice'), (2, 'Bob')")
            .execute(&pool)
            .await
            .expect("insert rows");
        let request = MutationRequest {
            schema: "main".into(),
            table: "people".into(),
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
        let first = sqlite_mutation_builder(&request, &request.rows[0])
            .build()
            .execute(&mut *transaction)
            .await
            .expect("first update");
        let conflict = sqlite_mutation_builder(&request, &request.rows[1])
            .build()
            .execute(&mut *transaction)
            .await
            .expect("stale update");
        assert_eq!(first.rows_affected(), 1);
        assert_eq!(conflict.rows_affected(), 0);
        transaction.rollback().await.expect("rollback transaction");
        let names: Vec<String> = sqlx::query_scalar("SELECT name FROM people ORDER BY id")
            .fetch_all(&pool)
            .await
            .expect("read rows");
        assert_eq!(names, vec!["Alice", "Bob"]);
    }

    fn mutation_test_table(native_type: &str) -> TableNode {
        TableNode {
            name: "people".into(),
            kind: "base_table".into(),
            estimated_rows: None,
            table_size_bytes: None,
            comment: None,
            ddl: None,
            writable: true,
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
            columns: vec![
                ColumnNode {
                    name: "id".into(),
                    native_type: "integer".into(),
                    nullable: false,
                    primary_key: true,
                    default_value: None,
                    comment: None,
                },
                ColumnNode {
                    name: "name".into(),
                    native_type: native_type.into(),
                    nullable: false,
                    primary_key: false,
                    default_value: None,
                    comment: None,
                },
            ],
        }
    }

    fn mutation_test_request() -> MutationRequest {
        MutationRequest {
            schema: "public".into(),
            table: "people".into(),
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
            Ok(builder) => builder.sql().as_str().to_string(),
            Err(error) => panic!("postgres builder failed: {}", error.message),
        };
        assert!(postgres.starts_with(
            "UPDATE \"public\".\"people\" SET \"name\" = CAST($1 AS character varying)"
        ));
        assert!(postgres.contains("\"id\" = CAST($2 AS integer)"));
        assert!(!postgres.contains("Alicia"));
        let mysql = mysql_mutation_builder(&request, &request.rows[0])
            .sql()
            .as_str()
            .to_string();
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
        let sqlite_insert = sqlite_mutation_builder(&insert, &insert.rows[0])
            .sql()
            .as_str()
            .to_string();
        assert!(sqlite_insert.starts_with("INSERT INTO \"people\""));
        assert!(!sqlite_insert.contains("Alicia"));

        let mut delete = mutation_test_request();
        delete.rows[0].action = MutationAction::Delete;
        delete.rows[0].changes.clear();
        delete.rows[0].expected.clear();
        let sqlite_delete = sqlite_mutation_builder(&delete, &delete.rows[0])
            .sql()
            .as_str()
            .to_string();
        assert!(sqlite_delete.starts_with("DELETE FROM \"people\" WHERE"));
        assert!(!sqlite_delete.contains("Alicia"));
    }

    #[test]
    fn rejects_postgres_types_outside_the_mutation_allowlist() {
        let request = mutation_test_request();
        let error = match postgres_mutation_builder(
            &request,
            &request.rows[0],
            &mutation_test_table("ARRAY"),
        ) {
            Ok(_) => panic!("array mutation must be rejected"),
            Err(error) => error,
        };
        assert_eq!(error.code, "ADVANCED_MUTATION_TYPE_UNSUPPORTED");
    }

    #[test]
    fn compiles_sql_server_filters_without_exposing_unescaped_literals() {
        let group = QueryFilterGroup {
            combinator: FilterCombinator::And,
            children: vec![
                QueryFilterNode::Condition(QueryFilterRequest {
                    column: "customer'name".into(),
                    operator: FilterOperator::Equals,
                    value: "O'Brien".into(),
                }),
                QueryFilterNode::Condition(QueryFilterRequest {
                    column: "city".into(),
                    operator: FilterOperator::In,
                    value: "Hà Nội,Đà Nẵng".into(),
                }),
            ],
        };

        let sql = sql_server_filter_group(&group);
        assert!(sql.contains("[customer'name]"));
        assert!(sql.contains("N'O''Brien'"));
        assert!(sql.contains("N'Hà Nội', N'Đà Nẵng'"));
        assert!(!sql.contains("N'O'Brien'"));
    }
}
