use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::{
    extract::DefaultBodyLimit,
    extract::Multipart,
    extract::Path,
    extract::State,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

use lightbi_chart::registry::ChartRegistry;
use lightbi_chart::validator::ChartValidator;
use lightbi_connectors::registry::SourceRegistry;
use lightbi_dashboard::registry::DashboardRegistry;
use lightbi_dashboard::validator::DashboardValidator;
use lightbi_dataset::registry::DatasetRegistry;
use lightbi_duckdb::backend::DuckDBBackend;
use lightbi_export::registry::ExportRegistry;
use lightbi_export::service::ExportService;
use lightbi_insight::registry::InsightRegistry;
use lightbi_insight::validator::InsightValidator;
use lightbi_perspective::registry::PerspectiveRegistry;
use lightbi_perspective::resolver::ContextResolver;
use lightbi_planner::registry::PlannerRegistry;
use lightbi_planner::strategy::StrategySelector;
use lightbi_planner::validator::PlanValidator;
use lightbi_project::context::ProjectContext;
use lightbi_project::manifest::ProjectManifest;
use lightbi_question::classifier::QuestionClassifier;
use lightbi_question::model::{QuestionTemplate, TemplateType};
use lightbi_question::registry::QuestionTemplateRegistry;
use lightbi_question::resolver::TemplateResolver;
use lightbi_recipe::registry::RecipeRegistry;
use lightbi_recipe::validator::RecipeValidator;
use lightbi_render_contract::payloads::InsightPayload;
use lightbi_runtime::coordinator::RuntimeCoordinator;
use lightbi_runtime_backend::registry::BackendRegistry;
use lightbi_schema::registry::{SchemaRegistry, SemanticRegistry};
use lightbi_vdataset_runtime::materializer::DatasetMaterializer;
use lightbi_vdataset_runtime::registry::RuntimeDatasetRegistry;
use lightbi_view::registry::DataViewRegistry;
use lightbi_view::validator::ViewValidator;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

use lightbi_planner::model::{ExecutionPlan, ExecutionStep, StrategyType};
use lightbi_render_contract::payloads::{ChartPayload, PayloadVersion};
use lightbi_runtime_backend::contract::ExecutionBackend;
// Removed DataView usage
use lightbi_export::excel::ExcelGenerator;
use serde::{Deserialize, Serialize};

mod advanced;
mod advanced_workspace;
mod analysis_endpoints;
mod online_sources;
mod plugin_host;
mod preview;
mod project_sources;

use analysis_endpoints::{ask_question, download_export, get_chart};
use online_sources::{fetch_online_csv, fetch_online_excel};
use preview::execute_preview;
use project_sources::{
    build_dynamic_sql, download_project_source_file, get_current_source, import_csv,
    resolve_current_source, resolve_dataset_source, resolve_project_source_file, save_project_source_file, save_project_source_file_raw, CurrentSourceSession,
};

pub(crate) struct AppState {
    context: Arc<ProjectContext>,
    latest_csv_path: tokio::sync::Mutex<Option<String>>,
    current_source: tokio::sync::Mutex<Option<CurrentSourceSession>>,
    dataset_registry: tokio::sync::Mutex<std::collections::HashMap<String, CurrentSourceSession>>,
    advanced: advanced::AdvancedState,
    plugin_registry: plugin_host::PluginRegistry,
}

pub(crate) fn lightbi_data_dir() -> PathBuf {
    std::env::var_os("LIGHTBI_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::temp_dir().join("lightbi-project-1"))
}

pub(crate) fn lightbi_work_file(name: impl AsRef<std::path::Path>) -> PathBuf {
    lightbi_data_dir().join("work").join(name)
}

async fn build_context() -> Arc<ProjectContext> {
    let project_root = lightbi_data_dir();
    tokio::fs::create_dir_all(&project_root).await.unwrap();
    tokio::fs::create_dir_all(project_root.join("work"))
        .await
        .unwrap();
    let sqlite_options = SqliteConnectOptions::new()
        .filename(project_root.join("metadata.db"))
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .connect_with(sqlite_options)
        .await
        .unwrap();
    advanced_workspace::initialize(&pool).await.unwrap();

    let mut backend_registry = BackendRegistry::new();
    backend_registry.register(Arc::new(DuckDBBackend::new()));

    let question_template_registry = {
        let mut template_registry = QuestionTemplateRegistry::new();
        template_registry.register(
            "trend-template",
            Arc::new(QuestionTemplate {
                id: "trend-template".to_string(),
                project_id: "project-1".to_string(),
                template_name: "Time Series Trend".to_string(),
                template_type: TemplateType::Trend,
                description: Some("Shows how a metric changes over time.".to_string()),
                parameters: vec![],
            }),
        );

        template_registry
    };

    Arc::new(ProjectContext::new(
        "project-1".to_string(),
        project_root,
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
            reg.register(
                "csv",
                Arc::new(lightbi_connectors::csv_source::CsvConnector::new()),
            );
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
        TemplateResolver::new(
            Arc::new(QuestionClassifier::new()),
            Arc::new(question_template_registry),
        ),
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
        DashboardValidator::new(),
    ))
}

pub async fn build_router() -> Router {
    let state = Arc::new(AppState {
        context: build_context().await,
        latest_csv_path: tokio::sync::Mutex::new(None),
        current_source: tokio::sync::Mutex::new(None),
        dataset_registry: tokio::sync::Mutex::new(std::collections::HashMap::new()),
        advanced: advanced::AdvancedState::new(),
        plugin_registry: plugin_host::PluginRegistry::built_in(),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route(
            "/api/health",
            get(|| async { Json(json!({ "status": "ok" })) }),
        )
        .route("/api/project/current-source", get(get_current_source))
        .route("/api/project/import-csv", post(import_csv))
        .route(
            "/api/project/source-files",
            post(save_project_source_file).layer(DefaultBodyLimit::max(512 * 1024 * 1024)),
        )
        .route(
            "/api/project/source-files/raw",
            post(save_project_source_file_raw).layer(DefaultBodyLimit::max(512 * 1024 * 1024)),
        )
        .route("/api/project/source-files/resolve", get(resolve_project_source_file))
        .route(
            "/api/project/source-files/:file_id/download",
            get(download_project_source_file),
        )
        .route("/api/chart/:id", get(get_chart))
        .route("/api/export/:id/download", get(download_export))
        .route("/api/question/ask", post(ask_question))
        .route("/api/preview/execute", post(execute_preview))
        .route("/api/online-source/fetch-excel", post(fetch_online_excel))
        .route("/api/online-source/fetch-csv", post(fetch_online_csv))
        .route(
            "/api/plugins/providers",
            get(plugin_host::list_provider_plugins),
        )
        .route(
            "/api/plugins/providers/diagnostics",
            get(plugin_host::list_provider_plugin_diagnostics),
        )
        .route(
            "/api/advanced/connections",
            post(advanced::create_connection),
        )
        .route(
            "/api/advanced/connections/:connection_id",
            axum::routing::delete(advanced::delete_connection),
        )
        .route(
            "/api/advanced/connections/:connection_id/schema",
            get(advanced::get_schema),
        )
        .route(
            "/api/advanced/connections/:connection_id/schema/count",
            get(advanced::get_table_count),
        )
        .route(
            "/api/advanced/connections/:connection_id/query",
            post(advanced::execute_query),
        )
        .route(
            "/api/advanced/connections/:connection_id/document-query",
            post(advanced::execute_document_query),
        )
        .route(
            "/api/advanced/connections/:connection_id/explain",
            post(advanced::explain_query),
        )
        .route(
            "/api/advanced/connections/:connection_id/mutations/preview",
            post(advanced::preview_mutation),
        )
        .route(
            "/api/advanced/connections/:connection_id/mutations/commit",
            post(advanced::commit_mutation),
        )
        .route(
            "/api/advanced/connections/:connection_id/scripts/preview",
            post(advanced::preview_script),
        )
        .route(
            "/api/advanced/connections/:connection_id/scripts/commit",
            post(advanced::commit_script),
        )
        .route(
            "/api/advanced/connections/:connection_id/exports",
            post(advanced::start_export),
        )
        .route(
            "/api/advanced/exports/:job_id",
            get(advanced::get_export_job).delete(advanced::cancel_export_job),
        )
        .route(
            "/api/advanced/exports/:job_id/download",
            get(advanced::download_export_job),
        )
        .route(
            "/api/advanced/connections/:connection_id/imports/sql",
            post(advanced::start_sql_import),
        )
        .route(
            "/api/advanced/connections/:connection_id/imports/csv",
            post(advanced::start_csv_import),
        )
        .route(
            "/api/advanced/imports/:job_id",
            get(advanced::get_import_job).delete(advanced::cancel_import_job),
        )
        .route(
            "/api/advanced/runs/:run_id",
            axum::routing::delete(advanced::cancel_run),
        )
        .route(
            "/api/advanced/history",
            get(advanced_workspace::list_history)
                .post(advanced_workspace::save_history)
                .delete(advanced_workspace::clear_history),
        )
        .route(
            "/api/advanced/favorites",
            get(advanced_workspace::list_favorites).post(advanced_workspace::save_favorite),
        )
        .route(
            "/api/advanced/favorites/:favorite_id",
            axum::routing::delete(advanced_workspace::delete_favorite),
        )
        .route(
            "/api/advanced/profiles",
            get(advanced_workspace::list_profiles).post(advanced_workspace::save_profile),
        )
        .route(
            "/api/advanced/profiles/:profile_id",
            axum::routing::delete(advanced_workspace::delete_profile),
        )
        .route(
            "/api/project/sessions",
            get(advanced_workspace::list_workspace_sessions)
                .post(advanced_workspace::save_workspace_session)
                .layer(DefaultBodyLimit::max(6 * 1024 * 1024)),
        )
        .route(
            "/api/project/sessions/:session_id",
            axum::routing::delete(advanced_workspace::delete_workspace_session),
        )
        .layer(cors)
        .with_state(state);

    app
}

pub async fn run(bind_address: &str) -> Result<(), std::io::Error> {
    let listener = TcpListener::bind(bind_address).await?;
    println!("API Server running on http://{bind_address}");
    axum::serve(listener, build_router().await).await
}
