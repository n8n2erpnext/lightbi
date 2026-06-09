use sqlx::SqlitePool;
use std::path::PathBuf;
use std::collections::HashMap;
use crate::manifest::ProjectManifest;
use lightbi_connectors::registry::SourceRegistry;
use lightbi_connectors::csv_source::CsvConnector;
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

/// `ProjectContext` is passed to all runtime services (e.g., Planner, Engine, AI).
/// It ensures that no global singleton state is used and all operations are
/// sandboxed to the active workspace.
#[derive(Clone)]
pub struct ProjectContext {
    pub project_id: String,
    pub project_path: PathBuf,
    pub manifest: ProjectManifest,
    pub sqlite_pool: SqlitePool,
    /// Cached view of the `project_settings` table (e.g. locale, theme, last_opened)
    pub project_settings: HashMap<String, String>,
    /// Governs all external connections and available schemas for this workspace.
    pub source_registry: SourceRegistry,
    /// Governs all virtual and derived datasets for this workspace.
    pub dataset_registry: DatasetRegistry,
    /// Governs all structural schemas.
    pub schema_registry: SchemaRegistry,
    /// Governs all semantic classifications.
    pub semantic_registry: SemanticRegistry,
    /// Governs available perspectives.
    pub perspective_registry: PerspectiveRegistry,
    /// Resolves active perspectives and binds them to analytical intent.
    pub context_resolver: ContextResolver,
    /// Governs analytical intent operations.
    pub recipe_registry: RecipeRegistry,
    /// Strictly validates recipes before they reach the planner.
    pub recipe_validator: RecipeValidator,
    /// Governs generated execution plans.
    pub planner_registry: PlannerRegistry,
    /// Selects execution strategy.
    pub strategy_selector: StrategySelector,
    /// Validates execution plans before runtime execution.
    pub plan_validator: PlanValidator,
    /// Governs parameterized question templates.
    pub question_template_registry: QuestionTemplateRegistry,
    /// Translates raw text into a template instance.
    pub template_resolver: TemplateResolver,
    /// Performs intent detection and extraction on raw questions.
    pub question_classifier: QuestionClassifier,
    /// Orchestrates execution plans against backends.
    pub runtime_coordinator: RuntimeCoordinator,
    /// Maintains available execution engines.
    pub backend_registry: BackendRegistry,
    /// Governs instantiated runtime datasets.
    pub runtime_dataset_registry: RuntimeDatasetRegistry,
    /// Converts transient ResultSets into cached runtime datasets.
    pub dataset_materializer: DatasetMaterializer,
    /// Governs visualization shape contracts.
    pub data_view_registry: DataViewRegistry,
    /// Validates data views against chart requirements.
    pub view_validator: ViewValidator,
    /// Caches and stores deterministically generated analytical narratives.
    pub insight_registry: InsightRegistry,
    /// Enforces confidence and reference checks on insights.
    pub insight_validator: InsightValidator,
    /// Governs generated export artifacts.
    pub export_registry: ExportRegistry,
    /// Orchestrates file generation.
    pub export_service: ExportService,
    /// Caches chart definitions.
    pub chart_registry: ChartRegistry,
    /// Ensures chart mappings align with visualization contracts.
    pub chart_validator: ChartValidator,
    /// Caches analytical workspace layouts.
    pub dashboard_registry: DashboardRegistry,
    /// Enforces dashboard component integrity.
    pub dashboard_validator: DashboardValidator,
}

impl ProjectContext {
    pub fn new(
        project_id: String, 
        project_path: PathBuf, 
        manifest: ProjectManifest, 
        sqlite_pool: SqlitePool,
        project_settings: HashMap<String, String>,
        source_registry: SourceRegistry,
        dataset_registry: DatasetRegistry,
        schema_registry: SchemaRegistry,
        semantic_registry: SemanticRegistry,
        perspective_registry: PerspectiveRegistry,
        context_resolver: ContextResolver,
        recipe_registry: RecipeRegistry,
        recipe_validator: RecipeValidator,
        planner_registry: PlannerRegistry,
        strategy_selector: StrategySelector,
        plan_validator: PlanValidator,
        question_template_registry: QuestionTemplateRegistry,
        template_resolver: TemplateResolver,
        question_classifier: QuestionClassifier,
        runtime_coordinator: RuntimeCoordinator,
        backend_registry: BackendRegistry,
        runtime_dataset_registry: RuntimeDatasetRegistry,
        dataset_materializer: DatasetMaterializer,
        data_view_registry: DataViewRegistry,
        view_validator: ViewValidator,
        insight_registry: InsightRegistry,
        insight_validator: InsightValidator,
        export_registry: ExportRegistry,
        export_service: ExportService,
        chart_registry: ChartRegistry,
        chart_validator: ChartValidator,
        dashboard_registry: DashboardRegistry,
        dashboard_validator: DashboardValidator,
    ) -> Self {
        Self {
            project_id,
            project_path,
            manifest,
            sqlite_pool,
            project_settings,
            source_registry,
            dataset_registry,
            schema_registry,
            semantic_registry,
            perspective_registry,
            context_resolver,
            recipe_registry,
            recipe_validator,
            planner_registry,
            strategy_selector,
            plan_validator,
            question_template_registry,
            template_resolver,
            question_classifier,
            runtime_coordinator,
            backend_registry,
            runtime_dataset_registry,
            dataset_materializer,
            data_view_registry,
            view_validator,
            insight_registry,
            insight_validator,
            export_registry,
            export_service,
            chart_registry,
            chart_validator,
            dashboard_registry,
            dashboard_validator,
        }
    }
}
