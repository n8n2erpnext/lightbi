use axum::{
    routing::{get, post},
    Router, Json, extract::State, extract::Path, extract::Multipart, response::IntoResponse,
};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use serde_json::{Value, json};
use tower_http::cors::{CorsLayer, Any};
use std::path::PathBuf;

use lightbi_project::context::ProjectContext;
use lightbi_project::manifest::ProjectManifest;
use sqlx::sqlite::SqlitePoolOptions;
use lightbi_connectors::registry::SourceRegistry;
use lightbi_dataset::registry::DatasetRegistry;
use lightbi_schema::registry::{SchemaRegistry, SemanticRegistry};
use lightbi_perspective::registry::PerspectiveRegistry;
use lightbi_perspective::resolver::ContextResolver;
use lightbi_recipe::registry::RecipeRegistry;
use lightbi_recipe::validator::RecipeValidator;
use lightbi_planner::registry::PlannerRegistry;
use lightbi_planner::strategy::StrategySelector;
use lightbi_planner::validator::PlanValidator;
use lightbi_question::registry::QuestionTemplateRegistry;
use lightbi_question::resolver::TemplateResolver;
use lightbi_question::classifier::QuestionClassifier;
use lightbi_question::model::{QuestionTemplate, TemplateType};
use lightbi_render_contract::payloads::InsightPayload;
use lightbi_runtime::coordinator::RuntimeCoordinator;
use lightbi_runtime_backend::registry::BackendRegistry;
use lightbi_duckdb::backend::DuckDBBackend;
use lightbi_vdataset_runtime::materializer::DatasetMaterializer;
use lightbi_vdataset_runtime::registry::RuntimeDatasetRegistry;
use lightbi_view::registry::DataViewRegistry;
use lightbi_view::validator::ViewValidator;
use lightbi_insight::registry::InsightRegistry;
use lightbi_insight::validator::InsightValidator;
use lightbi_export::registry::ExportRegistry;
use lightbi_export::service::ExportService;
use lightbi_chart::registry::ChartRegistry;
use lightbi_chart::validator::ChartValidator;
use lightbi_dashboard::registry::DashboardRegistry;
use lightbi_dashboard::validator::DashboardValidator;

use lightbi_render_contract::payloads::{ChartPayload, PayloadVersion};
use lightbi_planner::model::{ExecutionPlan, ExecutionStep, StrategyType};
use lightbi_runtime_backend::contract::ExecutionBackend;
// Removed DataView usage
use lightbi_export::excel::ExcelGenerator;
use serde::{Serialize, Deserialize};

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
enum LogicalOperation {
    Scan { #[serde(default)] columns: Vec<String> },
    #[serde(alias = "limit")]
    Limit { rows: usize },
    #[serde(alias = "group_by")]
    GroupBy { dimensions: Vec<String>, measures: Vec<String> },
    Trend { #[serde(alias = "timeDimension")] time_dimension: String, measures: Vec<String> },
    Distribution { dimension: String },
    Relationship { measures: Vec<String> },
}

#[derive(Deserialize, Debug, Clone)]
struct ExpectedOutput {
    shape: String,
    dimensions: Vec<String>,
    measures: Vec<String>,
}

#[derive(Deserialize, Debug, Clone)]
struct RuntimePlanPreview {
    status: String,
    #[serde(alias = "logicalOperations")]
    logical_operations: Vec<LogicalOperation>,
    #[serde(alias = "requiredColumns")]
    required_columns: Vec<String>,
    #[serde(alias = "expectedOutput")]
    expected_output: ExpectedOutput,
}

#[derive(Deserialize, Debug)]
struct PreviewExecuteRequest {
    #[serde(alias = "runtimePlan")]
    runtime_plan: RuntimePlanPreview,
    limit: Option<usize>,
}

#[derive(Serialize, Debug)]
struct PreviewExecuteResponse {
    status: String,
    columns: Vec<String>,
    rows: Vec<serde_json::Value>,
    row_count: usize,
    max_rows: usize,
    warnings: Vec<String>,
    blocked_reasons: Vec<String>,
    error_message: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct CurrentSourceSession {
    file_name: String,
    file_path: String,
    bytes_written: usize,
    source_id: String,
    dataset_id: String,
    schema: Value,
    uploaded_at: String,
    date_column: Option<String>,
    measure_column: Option<String>,
    dimension_column: Option<String>,
}

struct AppState {
    context: Arc<ProjectContext>,
    latest_csv_path: tokio::sync::Mutex<Option<String>>,
    current_source: tokio::sync::Mutex<Option<CurrentSourceSession>>,
}

async fn build_context() -> Arc<ProjectContext> {
    let pool = SqlitePoolOptions::new()
        .connect("sqlite::memory:")
        .await
        .unwrap();

    let mut backend_registry = BackendRegistry::new();
    backend_registry.register(Arc::new(DuckDBBackend::new()));

    let question_template_registry = {
        let mut template_registry = QuestionTemplateRegistry::new();
        template_registry.register("trend-template", Arc::new(QuestionTemplate {
            id: "trend-template".to_string(),
            project_id: "project-1".to_string(),
            template_name: "Time Series Trend".to_string(),
            template_type: TemplateType::Trend,
            description: Some("Shows how a metric changes over time.".to_string()),
            parameters: vec![],
        }));

        template_registry
    };
    
    Arc::new(ProjectContext::new(
        "project-1".to_string(),
        PathBuf::from("/tmp/lightbi-project-1"),
        ProjectManifest {
            project_id: "project-1".to_string(),
            name: "Project 1".to_string(),
            description: None,
            version: "1.0.0".to_string(),
            lightbi_version: "0.1.0".to_string(),
            created_at: "2026-06-01T00:00:00Z".to_string(),
            updated_at: "2026-06-01T00:00:00Z".to_string(),
            tags: vec![],
            owner: None,
            project_type: None,
        },
        pool,
        std::collections::HashMap::new(),
        {
            let mut reg = SourceRegistry::new();
            reg.register("csv", Arc::new(lightbi_connectors::csv_source::CsvConnector::new()));
            reg
        },
        DatasetRegistry::new(),
        SchemaRegistry::new(),
        SemanticRegistry::new(),
        PerspectiveRegistry::new(),
        ContextResolver::new(Arc::new(PerspectiveRegistry::new())),
        RecipeRegistry::new(),
        RecipeValidator::new(),
        PlannerRegistry::new(),
        StrategySelector::new(),
        PlanValidator::new(),
        question_template_registry.clone(),
        TemplateResolver::new(Arc::new(QuestionClassifier::new()), Arc::new(question_template_registry)),
        QuestionClassifier::new(),
        RuntimeCoordinator::new(Arc::new(backend_registry.clone())),
        backend_registry,
        RuntimeDatasetRegistry::new(),
        DatasetMaterializer::new(Arc::new(RuntimeDatasetRegistry::new())),
        DataViewRegistry::new(),
        ViewValidator::new(),
        InsightRegistry::new(),
        InsightValidator::new(),
        ExportRegistry::new(),
        ExportService::new(Arc::new(ExportRegistry::new())),
        ChartRegistry::new(),
        ChartValidator::new(),
        DashboardRegistry::new(),
        DashboardValidator::new()
    ))
}

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState {
        context: build_context().await,
        latest_csv_path: tokio::sync::Mutex::new(None),
        current_source: tokio::sync::Mutex::new(None),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(|| async { Json(json!({ "status": "ok" })) }))
        .route("/api/project/current-source", get(get_current_source))
        .route("/api/project/import-csv", post(import_csv))
        .route("/api/chart/:id", get(get_chart))
        .route("/api/export/:id/download", get(download_export))
        .route("/api/question/ask", post(ask_question))
        .route("/api/preview/execute", post(execute_preview))
        .layer(cors)
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:5172").await.unwrap();
    println!("API Server running on http://0.0.0.0:5172");
    axum::serve(listener, app).await.unwrap();
}

fn infer_columns(schema: &Value) -> (Option<String>, Option<String>, Option<String>) {
    let mut date_col = None;
    let mut measure_col = None;
    let mut dim_col = None;
    
    let date_candidates = ["order_date", "date", "posting_date", "created_at", "transaction_date"];
    let measure_candidates = ["revenue", "amount", "total", "grand_total", "net_total", "sales"];
    
    if let Some(fields) = schema.get("fields").and_then(|f| f.as_array()) {
        for f in fields {
            if let (Some(name), Some(dtype)) = (f.get("name").and_then(|n| n.as_str()), f.get("data_type").and_then(|d| d.as_str())) {
                let lower_name = name.to_lowercase();
                let lower_dtype = dtype.to_lowercase();
                let is_numeric = lower_dtype.contains("int") || lower_dtype.contains("float") || lower_dtype.contains("double") || lower_dtype.contains("decimal") || lower_dtype.contains("numeric");
                let is_string = lower_dtype.contains("varchar") || lower_dtype.contains("string") || lower_dtype.contains("text");
                let is_date = lower_dtype.contains("date") || lower_dtype.contains("timestamp");
                
                if date_col.is_none() && (is_date || date_candidates.contains(&lower_name.as_str())) {
                    date_col = Some(name.to_string());
                }
                if measure_col.is_none() && is_numeric && measure_candidates.contains(&lower_name.as_str()) {
                    measure_col = Some(name.to_string());
                }
                if dim_col.is_none() && is_string && date_col.as_deref() != Some(name) {
                    dim_col = Some(name.to_string());
                }
            }
        }
        
        // Fallbacks
        if measure_col.is_none() {
            for f in fields {
                if let (Some(name), Some(dtype)) = (f.get("name").and_then(|n| n.as_str()), f.get("data_type").and_then(|d| d.as_str())) {
                    let lower_dtype = dtype.to_lowercase();
                    let is_numeric = lower_dtype.contains("int") || lower_dtype.contains("float") || lower_dtype.contains("double") || lower_dtype.contains("decimal") || lower_dtype.contains("numeric");
                    if is_numeric { measure_col = Some(name.to_string()); break; }
                }
            }
        }
        if dim_col.is_none() && date_col.is_none() {
            for f in fields {
                 if let (Some(name), Some(dtype)) = (f.get("name").and_then(|n| n.as_str()), f.get("data_type").and_then(|d| d.as_str())) {
                    let lower_dtype = dtype.to_lowercase();
                    let is_string = lower_dtype.contains("varchar") || lower_dtype.contains("string") || lower_dtype.contains("text");
                    if is_string { dim_col = Some(name.to_string()); break; }
                 }
            }
        }
    }
    (date_col, measure_col, dim_col)
}

fn build_dynamic_sql(source: &CurrentSourceSession) -> String {
    let path = source.file_path.replace("'", "''");
    let sql = if let (Some(date_c), Some(measure_c)) = (&source.date_column, &source.measure_column) {
        format!("SELECT \"{}\" AS label, SUM(\"{}\") AS value FROM read_csv_auto('{}') GROUP BY \"{}\" ORDER BY \"{}\" ASC", date_c, measure_c, path, date_c, date_c)
    } else if let (Some(dim_c), Some(measure_c)) = (&source.dimension_column, &source.measure_column) {
        format!("SELECT \"{}\" AS label, SUM(\"{}\") AS value FROM read_csv_auto('{}') GROUP BY \"{}\" ORDER BY value DESC", dim_c, measure_c, path, dim_c)
    } else {
        format!("SELECT * FROM read_csv_auto('{}') LIMIT 100", path)
    };
    println!("[build_dynamic_sql] generated sql: {}", sql);
    sql
}

async fn resolve_current_source(state: &Arc<AppState>) -> Option<CurrentSourceSession> {
    {
        let memory_cache = state.current_source.lock().await;
        if let Some(src) = &*memory_cache {
            println!("[resolve_current_source] current source resolved from memory: {}", src.file_path);
            return Some(src.clone());
        }
    }
    
    let session_dir = state.context.project_path.join("session");
    let session_file = session_dir.join("current_source.json");
    
    println!("[resolve_current_source] metadata read path: {:?}", session_file);
    if let Ok(content) = tokio::fs::read_to_string(&session_file).await {
        if let Ok(src) = serde_json::from_str::<CurrentSourceSession>(&content) {
            let file_exists = tokio::fs::metadata(&src.file_path).await.is_ok();
            println!("[resolve_current_source] file existence check result: {}", file_exists);
            
            if file_exists {
                println!("[resolve_current_source] current source resolved from disk: {}", src.file_path);
                *state.current_source.lock().await = Some(src.clone());
                return Some(src);
            } else {
                println!("[resolve_current_source] source file missing on disk");
            }
        }
    }
    
    println!("[resolve_current_source] current source resolved from none");
    None
}

async fn get_current_source(State(state): State<Arc<AppState>>) -> Json<Value> {
    if let Some(src) = resolve_current_source(&state).await {
        Json(json!({
            "has_source": true,
            "file_name": src.file_name,
            "bytes_written": src.bytes_written,
            "source_id": src.source_id,
            "dataset_id": src.dataset_id,
            "schema": src.schema,
            "uploaded_at": src.uploaded_at,
            "date_column": src.date_column,
            "measure_column": src.measure_column,
            "dimension_column": src.dimension_column
        }))
    } else {
        Json(json!({ "has_source": false }))
    }
}

async fn import_csv(State(state): State<Arc<AppState>>, mut multipart: Multipart) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;

    println!("[import-csv] request received");
    let files_dir = state.context.project_path.join("files");
    if let Err(e) = tokio::fs::create_dir_all(&files_dir).await {
        println!("[import-csv] error: failed to create directory: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to create upload directory"}))).into_response();
    }

    let mut saved_file_path = None;
    let mut original_filename = String::new();
    let mut bytes_written = 0;

    println!("[import-csv] multipart acquired");

    loop {
        match multipart.next_field().await {
            Ok(Some(mut field)) => {
                println!("[import-csv] field received: {:?}", field.name());
                if let Some(name) = field.name() {
                    if name == "file" {
                        if let Some(fname) = field.file_name() {
                            original_filename = fname.to_string();
                            println!("[import-csv] filename: {}", original_filename);
                            if let Some(content_type) = field.content_type() {
                                println!("[import-csv] content-type: {}", content_type);
                            }
                            let sanitized = fname.replace("..", "").replace("/", "").replace("\\", "");
                            
                            if !sanitized.to_lowercase().ends_with(".csv") {
                                println!("[import-csv] error: non-csv file");
                                return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Only .csv files are allowed." }))).into_response();
                            }
                            
                            let file_path = files_dir.join(&sanitized);
                            
                            match File::create(&file_path).await {
                                Ok(mut file) => {
                                    loop {
                                        match field.chunk().await {
                                            Ok(Some(chunk)) => {
                                                println!("[import-csv] chunk received bytes: {}", chunk.len());
                                                if let Err(e) = file.write_all(&chunk).await {
                                                    println!("[import-csv] error: file save failure: {:?}", e);
                                                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "File save failure" }))).into_response();
                                                }
                                                bytes_written += chunk.len();
                                            },
                                            Ok(None) => {
                                                println!("[import-csv] write complete, total bytes: {}", bytes_written);
                                                break;
                                            },
                                            Err(e) => {
                                                println!("[import-csv] error: chunk read error: {:?}", e);
                                                return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Upload stream error" }))).into_response();
                                            }
                                        }
                                    }
                                    saved_file_path = Some(file_path);
                                },
                                Err(e) => {
                                    println!("[import-csv] error: file creation failure: {:?}", e);
                                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to create file on disk" }))).into_response();
                                }
                            }
                        }
                    }
                }
            },
            Ok(None) => break, // No more fields
            Err(e) => {
                println!("[import-csv] error: multipart read error: {:?}", e);
                return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid multipart request" }))).into_response();
            }
        }
    }

    if bytes_written == 0 {
        println!("[import-csv] error: empty file");
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "File is empty" }))).into_response();
    }
    
    if let Some(path) = saved_file_path {
        let abs_path = path.to_string_lossy().to_string();
        
        let connector = state.context.source_registry.get_connector("csv").unwrap();
        let mut settings = std::collections::HashMap::new();
        settings.insert("file_path".to_string(), abs_path.clone());
        
        println!("[import-csv] schema discovery start");
        match connector.discover_schema("default", &settings).await {
            Ok(schema_str) => {
                println!("[import-csv] schema discovery end");
                let schema_json: Value = serde_json::from_str(&schema_str).unwrap_or(json!({}));
                
                // Update global state shortcut for Milestone 3
                *state.latest_csv_path.lock().await = Some(abs_path.clone());
                
                let dataset_id = format!("ds-{}", uuid::Uuid::new_v4());
                let source_id = format!("src-{}", uuid::Uuid::new_v4());
                
                let uploaded_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()
                    .to_string();

                let (date_column, measure_column, dimension_column) = infer_columns(&schema_json);
                println!("[import-csv] selected date_column: {:?}", date_column);
                println!("[import-csv] selected measure_column: {:?}", measure_column);
                println!("[import-csv] selected dimension_column: {:?}", dimension_column);

                let session = CurrentSourceSession {
                    file_name: original_filename.clone(),
                    file_path: abs_path.clone(),
                    bytes_written,
                    source_id: source_id.clone(),
                    dataset_id: dataset_id.clone(),
                    schema: schema_json.clone(),
                    uploaded_at,
                    date_column: date_column.clone(),
                    measure_column: measure_column.clone(),
                    dimension_column: dimension_column.clone(),
                };

                *state.current_source.lock().await = Some(session.clone());

                let session_dir = state.context.project_path.join("session");
                let _ = tokio::fs::create_dir_all(&session_dir).await;
                let session_file = session_dir.join("current_source.json");
                println!("[import-csv] metadata write path: {:?}", session_file);
                if let Ok(json_str) = serde_json::to_string_pretty(&session) {
                    let _ = tokio::fs::write(&session_file, json_str).await;
                }

                println!("[import-csv] response sent");
                (StatusCode::OK, Json(json!({
                    "status": "success",
                    "source_id": source_id,
                    "dataset_id": dataset_id,
                    "file_name": original_filename,
                    "file_path": abs_path,
                    "schema": schema_json,
                    "bytes_written": bytes_written,
                    "date_column": date_column,
                    "measure_column": measure_column,
                    "dimension_column": dimension_column
                }))).into_response()
            },
            Err(e) => {
                println!("[import-csv] error: schema discovery failure: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": format!("Schema discovery failed: {:?}", e) }))).into_response()
            }
        }
    } else {
        println!("[import-csv] error: missing file");
        (StatusCode::BAD_REQUEST, Json(json!({ "error": "No file provided in upload" }))).into_response()
    }
}

async fn get_chart(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let source = resolve_current_source(&state).await;
    let sql_payload = source.as_ref().map(build_dynamic_sql).unwrap_or_else(|| "SELECT * FROM read_csv_auto('sales.csv') LIMIT 100".to_string());

    // 1. Create a dummy ExecutionPlan that reads the CSV
    let plan = ExecutionPlan {
        id: "plan-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Read CSV".to_string(),
        dataset_scope: vec!["dataset-csv-1".to_string()],
        source_scope: vec!["csv-source".to_string()],
        strategy_type: StrategyType::Pushdown,
        steps: vec![
            ExecutionStep {
                step_order: 1,
                step_type: "ExecuteSQL".to_string(),
                payload: sql_payload.clone(),
            }
        ],
    };

    // 2. Execute it via DuckDB backend manually for this milestone
    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Chart query failed", "details": format!("{:?}", e), "generated_sql": sql_payload}))).into_response()
    };

    let mut theme_metadata = serde_json::Map::new();
    let title_suffix = source.as_ref().and_then(|s| s.measure_column.clone()).unwrap_or_else(|| "Data".to_string());
    theme_metadata.insert("title".to_string(), serde_json::json!(format!("{} Trend", title_suffix)));
    
    let x_col = result_set.columns.get(0).map(|s| s.name.clone()).unwrap_or_else(|| "label".to_string());
    let y_col = result_set.columns.get(1).map(|s| s.name.clone()).unwrap_or_else(|| "value".to_string());

    theme_metadata.insert("data".to_string(), serde_json::json!(
        result_set.rows.iter().map(|r| {
            let mut map = std::collections::HashMap::new();
            map.insert(x_col.clone(), r[0].clone());
            map.insert(y_col.clone(), if r.len() > 1 { r[1].clone() } else { Value::Null });
            map
        }).collect::<Vec<_>>()
    ));
    theme_metadata.insert("xAxis".to_string(), serde_json::json!(x_col));
    theme_metadata.insert("yAxis".to_string(), serde_json::json!(vec![y_col]));

    let payload = ChartPayload {
        id: id.clone(),
        payload_version: PayloadVersion::V1,
        chart_type: if id == "kpi" { "kpi".to_string() } else { "line".to_string() },
        mappings: std::collections::HashMap::new(),
        theme_metadata: serde_json::Value::Object(theme_metadata),
    };

    (StatusCode::OK, Json(payload)).into_response()
}

fn compile_preview_sql(plan: &RuntimePlanPreview, file_path: &str, limit: usize) -> Result<String, String> {
    if plan.status != "ready" {
        return Err("Plan is blocked".to_string());
    }

    let safe_path = file_path.replace("'", "''");
    let mut select_clause = String::new();
    let mut group_by_clause = String::new();
    let mut order_by_clause = String::new();
    let mut where_clause = String::new();
    let mut has_main_op = false;

    let quote_ident = |ident: &str| -> String {
        format!("\"{}\"", ident.replace("\"", "\"\""))
    };

    for op in &plan.logical_operations {
        match op {
            LogicalOperation::Scan { .. } | LogicalOperation::Limit { .. } => {}
            LogicalOperation::GroupBy { dimensions, measures } => {
                if has_main_op { continue; }
                has_main_op = true;
                let dims = dimensions.iter().map(|d| quote_ident(d)).collect::<Vec<_>>().join(", ");
                let meas = measures.iter().map(|m| format!("COUNT({}) AS {}", quote_ident(m), quote_ident(&format!("{}_count", m)))).collect::<Vec<_>>().join(", ");
                select_clause = if dims.is_empty() { meas } else if measures.is_empty() { dims.clone() } else { format!("{}, {}", dims, meas) };
                if !dims.is_empty() {
                    group_by_clause = format!("GROUP BY {}", dims);
                }
            }
            LogicalOperation::Trend { time_dimension, measures } => {
                if has_main_op { continue; }
                has_main_op = true;
                let t_dim = quote_ident(time_dimension);
                let meas = measures.iter().map(|m| format!("COUNT({}) AS {}", quote_ident(m), quote_ident(&format!("{}_count", m)))).collect::<Vec<_>>().join(", ");
                select_clause = format!("{}, {}", t_dim, meas);
                group_by_clause = format!("GROUP BY {}", t_dim);
                order_by_clause = format!("ORDER BY {}", t_dim);
            }
            LogicalOperation::Distribution { dimension } => {
                if has_main_op { continue; }
                has_main_op = true;
                let d_dim = quote_ident(dimension);
                select_clause = format!("{}, COUNT(*) AS \"row_count\"", d_dim);
                group_by_clause = format!("GROUP BY {}", d_dim);
            }
            LogicalOperation::Relationship { measures } => {
                if has_main_op { continue; }
                has_main_op = true;
                let m_idents = measures.iter().map(|m| quote_ident(m)).collect::<Vec<_>>();
                select_clause = m_idents.join(", ");
                where_clause = format!("WHERE {}", m_idents.iter().map(|m| format!("{} IS NOT NULL", m)).collect::<Vec<_>>().join(" AND "));
            }
        }
    }

    if select_clause.is_empty() {
        return Err("Unsupported operation or no dimensions/measures specified".to_string());
    }

    let mut sql = format!("SELECT {} FROM read_csv_auto('{}')", select_clause, safe_path);
    if !where_clause.is_empty() { sql.push_str(&format!(" {}", where_clause)); }
    if !group_by_clause.is_empty() { sql.push_str(&format!(" {}", group_by_clause)); }
    if !order_by_clause.is_empty() { sql.push_str(&format!(" {}", order_by_clause)); }
    sql.push_str(&format!(" LIMIT {}", limit));

    Ok(sql)
}

async fn execute_preview(State(state): State<Arc<AppState>>, Json(payload): Json<PreviewExecuteRequest>) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let mut warnings = vec![];
    let mut blocked_reasons = vec![];

    if payload.runtime_plan.status != "ready" {
        blocked_reasons.push("Plan is not ready.".to_string());
        return (StatusCode::OK, Json(PreviewExecuteResponse {
            status: "blocked".to_string(),
            columns: vec![],
            rows: vec![],
            row_count: 0,
            max_rows: 0,
            warnings,
            blocked_reasons,
            error_message: None,
        })).into_response();
    }

    let limit = payload.limit.unwrap_or(100).min(100);

    let source = resolve_current_source(&state).await;
    let file_path = match source {
        Some(s) if s.file_path.to_lowercase().ends_with(".csv") => s.file_path,
        Some(_) => {
            blocked_reasons.push("Only CSV current source is supported in DU-7B.".to_string());
            return (StatusCode::OK, Json(PreviewExecuteResponse {
                status: "blocked".to_string(),
                columns: vec![],
                rows: vec![],
                row_count: 0,
                max_rows: limit,
                warnings,
                blocked_reasons,
                error_message: None,
            })).into_response();
        }
        None => {
            blocked_reasons.push("No active dataset source available.".to_string());
            return (StatusCode::OK, Json(PreviewExecuteResponse {
                status: "blocked".to_string(),
                columns: vec![],
                rows: vec![],
                row_count: 0,
                max_rows: limit,
                warnings,
                blocked_reasons,
                error_message: None,
            })).into_response();
        }
    };

    let sql = match compile_preview_sql(&payload.runtime_plan, &file_path, limit) {
        Ok(s) => s,
        Err(e) => {
            blocked_reasons.push(e);
            return (StatusCode::OK, Json(PreviewExecuteResponse {
                status: "blocked".to_string(),
                columns: vec![],
                rows: vec![],
                row_count: 0,
                max_rows: limit,
                warnings,
                blocked_reasons,
                error_message: None,
            })).into_response();
        }
    };

    // Execute plan
    let plan = ExecutionPlan {
        id: "preview-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Preview".to_string(),
        dataset_scope: vec![],
        source_scope: vec![],
        strategy_type: StrategyType::Pushdown,
        steps: vec![
            ExecutionStep {
                step_order: 1,
                step_type: "ExecuteSQL".to_string(),
                payload: sql.clone(),
            }
        ],
    };

    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => {
            return (StatusCode::OK, Json(PreviewExecuteResponse {
                status: "failed".to_string(),
                columns: vec![],
                rows: vec![],
                row_count: 0,
                max_rows: limit,
                warnings,
                blocked_reasons,
                error_message: Some(format!("DuckDB Error: {:?}", e)),
            })).into_response();
        }
    };

    let columns: Vec<String> = result_set.columns.iter().map(|c| c.name.clone()).collect();
    let mut rows_objs = Vec::new();
    for row in &result_set.rows {
        let mut obj = serde_json::Map::new();
        for (i, col_name) in columns.iter().enumerate() {
            obj.insert(col_name.clone(), row[i].clone());
        }
        rows_objs.push(serde_json::Value::Object(obj));
    }
    let row_count = rows_objs.len();

    (StatusCode::OK, Json(PreviewExecuteResponse {
        status: "executed".to_string(),
        columns,
        rows: rows_objs,
        row_count,
        max_rows: limit,
        warnings,
        blocked_reasons,
        error_message: None,
    })).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_plan() -> RuntimePlanPreview {
        RuntimePlanPreview {
            status: "ready".to_string(),
            logical_operations: vec![],
            required_columns: vec![],
            expected_output: ExpectedOutput { shape: "table".to_string(), dimensions: vec![], measures: vec![] },
        }
    }

    #[test]
    fn test_compile_blocked_plan() {
        let mut plan = dummy_plan();
        plan.status = "blocked".to_string();
        assert!(compile_preview_sql(&plan, "test.csv", 100).is_err());
    }

    #[test]
    fn test_compile_group_by() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::GroupBy {
            dimensions: vec!["category".to_string()],
            measures: vec!["revenue".to_string()],
        });
        let sql = compile_preview_sql(&plan, "test.csv", 100).unwrap();
        assert_eq!(sql, "SELECT \"category\", COUNT(\"revenue\") AS \"revenue_count\" FROM read_csv_auto('test.csv') GROUP BY \"category\" LIMIT 100");
    }

    #[test]
    fn test_compile_trend() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::Trend {
            time_dimension: "order_date".to_string(),
            measures: vec!["amount".to_string()],
        });
        let sql = compile_preview_sql(&plan, "data's.csv", 50).unwrap();
        assert_eq!(sql, "SELECT \"order_date\", COUNT(\"amount\") AS \"amount_count\" FROM read_csv_auto('data''s.csv') GROUP BY \"order_date\" ORDER BY \"order_date\" LIMIT 50");
    }

    #[test]
    fn test_compile_distribution() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::Distribution {
            dimension: "status".to_string(),
        });
        let sql = compile_preview_sql(&plan, "test.csv", 100).unwrap();
        assert_eq!(sql, "SELECT \"status\", COUNT(*) AS \"row_count\" FROM read_csv_auto('test.csv') GROUP BY \"status\" LIMIT 100");
    }

    #[test]
    fn test_compile_relationship() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::Relationship {
            measures: vec!["x".to_string(), "y".to_string()],
        });
        let sql = compile_preview_sql(&plan, "test.csv", 10).unwrap();
        assert_eq!(sql, "SELECT \"x\", \"y\" FROM read_csv_auto('test.csv') WHERE \"x\" IS NOT NULL AND \"y\" IS NOT NULL LIMIT 10");
    }

    #[test]
    fn test_compile_unsafe_quotes() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::GroupBy {
            dimensions: vec!["\"unsafe\"".to_string()],
            measures: vec![],
        });
        let sql = compile_preview_sql(&plan, "test.csv", 100).unwrap();
        assert_eq!(sql, "SELECT \"\"\"unsafe\"\"\" FROM read_csv_auto('test.csv') GROUP BY \"\"\"unsafe\"\"\" LIMIT 100");
    }
}

async fn download_export(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let source = resolve_current_source(&state).await;
    let sql_payload = source.as_ref().map(build_dynamic_sql).unwrap_or_else(|| "SELECT * FROM read_csv_auto('sales.csv') LIMIT 100".to_string());

    // Generate an Excel file for the same data
    let plan = ExecutionPlan {
        id: "plan-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Read CSV".to_string(),
        dataset_scope: vec!["dataset-csv-1".to_string()],
        source_scope: vec!["csv-source".to_string()],
        strategy_type: StrategyType::Pushdown,
        steps: vec![
            ExecutionStep {
                step_order: 1,
                step_type: "ExecuteSQL".to_string(),
                payload: sql_payload.clone(),
            }
        ],
    };

    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Export query failed", "details": format!("{:?}", e), "generated_sql": sql_payload}))).into_response()
    };

    let export_path = format!("/tmp/export-{}.xlsx", id);
    if let Err(e) = ExcelGenerator::generate_from_resultset(&result_set, &export_path) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Excel generation failed", "details": format!("{:?}", e)}))).into_response();
    }

    (StatusCode::OK, Json(json!({ "status": "success", "download_url": format!("file://{}", export_path) }))).into_response()
}

async fn ask_question(State(state): State<Arc<AppState>>, Json(payload): Json<Value>) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let question = payload.get("question").and_then(|v| v.as_str()).unwrap_or("Unknown question");
    
    // 1. Resolve Question to Template
    let resolver = &state.context.template_resolver;
    let (template, _params) = resolver.resolve(question).unwrap();

    let source = resolve_current_source(&state).await;
    let sql_payload = source.as_ref().map(build_dynamic_sql).unwrap_or_else(|| "SELECT * FROM read_csv_auto('sales.csv') LIMIT 100".to_string());

    // 2. Mock Execution Plan
    let plan = ExecutionPlan {
        id: "plan-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Read CSV".to_string(),
        dataset_scope: vec!["dataset-csv-1".to_string()],
        source_scope: vec!["csv-source".to_string()],
        strategy_type: StrategyType::Pushdown,
        steps: vec![
            ExecutionStep {
                step_order: 1,
                step_type: "ExecuteSQL".to_string(),
                payload: sql_payload.clone(),
            }
        ],
    };

    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Question query failed", "details": format!("{:?}", e), "generated_sql": sql_payload}))).into_response()
    };

    // 3. Generate ChartPayload
    let mut theme_metadata = serde_json::Map::new();
    let title_suffix = source.as_ref().and_then(|s| s.measure_column.clone()).unwrap_or_else(|| "Data".to_string());
    theme_metadata.insert("title".to_string(), serde_json::json!(format!("{} Trend", title_suffix)));
    
    let x_col = result_set.columns.get(0).map(|s| s.name.clone()).unwrap_or_else(|| "label".to_string());
    let y_col = result_set.columns.get(1).map(|s| s.name.clone()).unwrap_or_else(|| "value".to_string());

    theme_metadata.insert("data".to_string(), serde_json::json!(
        result_set.rows.iter().map(|r| {
            let mut map = std::collections::HashMap::new();
            map.insert(x_col.clone(), r[0].clone());
            map.insert(y_col.clone(), if r.len() > 1 { r[1].clone() } else { Value::Null });
            map
        }).collect::<Vec<_>>()
    ));
    theme_metadata.insert("xAxis".to_string(), serde_json::json!(x_col));
    theme_metadata.insert("yAxis".to_string(), serde_json::json!(vec![y_col]));

    let chart_payload = ChartPayload {
        id: "chart-1".to_string(),
        payload_version: PayloadVersion::V1,
        chart_type: "line".to_string(),
        mappings: std::collections::HashMap::new(),
        theme_metadata: serde_json::Value::Object(theme_metadata),
    };

    // 4. Generate InsightPayload
    let measure_name = source.as_ref().and_then(|s| s.measure_column.clone()).unwrap_or_else(|| "metric".to_string());
    let dim_name = source.as_ref().and_then(|s| s.date_column.clone().or(s.dimension_column.clone())).unwrap_or_else(|| "category".to_string());

    let insight_payload = InsightPayload {
        id: "insight-1".to_string(),
        insight_type: "trend_observation".to_string(),
        observation_text: format!("Based on your question '{}', we observed the trend of {} across {}.", question, measure_name, dim_name),
        confidence: 0.95,
        payload_version: PayloadVersion::V1,
    };

    // Return the full visual pipeline payload
    (StatusCode::OK, Json(json!({
        "template": {
            "id": template.id.clone(),
            "name": template.template_name.clone(),
            "type": format!("{:?}", template.template_type)
        },
        "chart": chart_payload,
        "insight": insight_payload
    }))).into_response()
}
