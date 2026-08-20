use std::{collections::BTreeMap, sync::Arc};

use axum::{extract::State, Json};
use serde::Serialize;

use crate::AppState;

pub(crate) const PLUGIN_API_VERSION: &str = "lightbi.plugin.v1";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub(crate) enum ProviderKind {
    Relational,
    Document,
    Warehouse,
    KeyValue,
    File,
    Api,
    Erp,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub(crate) enum ConnectionFieldKind {
    Text,
    Password,
    Number,
    Boolean,
    Select,
    Path,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectionField {
    id: String,
    label: String,
    kind: ConnectionFieldKind,
    required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    default_value: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    placeholder: Option<String>,
    #[serde(default)]
    secret: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    help_text: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub(crate) enum IdentifierQuoteStyle {
    DoubleQuote,
    Backtick,
    Bracket,
    None,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub(crate) enum ParameterStyle {
    QuestionMark,
    DollarNumber,
    AtNumber,
    Named,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub(crate) enum LimitStyle {
    LimitOffset,
    Top,
    OffsetFetch,
    None,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SqlDialect {
    identifier_quote: IdentifierQuoteStyle,
    parameter_style: ParameterStyle,
    limit_style: LimitStyle,
    #[serde(skip_serializing_if = "Option::is_none")]
    default_schema: Option<String>,
    supports_schemas: bool,
    supports_transactions: bool,
    supports_explain: bool,
    supports_savepoints: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderCapabilities {
    connect: bool,
    schema_discovery: bool,
    read_only_query: bool,
    cancellable_query: bool,
    streaming_query: bool,
    writeback: bool,
    ddl: bool,
    import_rows: bool,
    export_rows: bool,
    explain: bool,
    server_dashboard: bool,
    semantic_hints: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderManifest {
    api_version: String,
    id: String,
    display_name: String,
    version: String,
    provider_kind: ProviderKind,
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    default_port: Option<u16>,
    url_schemes: Vec<String>,
    connection_fields: Vec<ConnectionField>,
    capabilities: ProviderCapabilities,
    #[serde(skip_serializing_if = "Option::is_none")]
    sql_dialect: Option<SqlDialect>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExposureGate {
    can_expose: bool,
    missing_capabilities: Vec<String>,
    warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RegistryEntry {
    manifest: ProviderManifest,
    exposure_gate: ExposureGate,
    source: String,
}

#[derive(Debug, Clone)]
pub(crate) struct PluginRegistry {
    entries: BTreeMap<String, RegistryEntry>,
}

impl PluginRegistry {
    pub(crate) fn built_in() -> Self {
        let mut registry = Self {
            entries: BTreeMap::new(),
        };
        registry.register(postgresql_manifest(), "core_builtin");
        registry.register(mysql_manifest("mysql", "MySQL", 3306), "core_builtin");
        registry.register(mysql_manifest("mariadb", "MariaDB", 3306), "core_builtin");
        registry.register(sqlite_manifest(), "core_builtin");
        registry.register(mongodb_manifest(), "core_builtin");
        registry.register(sqlserver_manifest(), "core_builtin");
        registry
    }

    fn register(&mut self, manifest: ProviderManifest, source: &str) {
        let exposure_gate = evaluate_exposure_gate(&manifest);
        let id = manifest.id.clone();
        self.entries.insert(
            id,
            RegistryEntry {
                manifest,
                exposure_gate,
                source: source.to_string(),
            },
        );
    }

    pub(crate) fn exposable(&self) -> Vec<RegistryEntry> {
        self.entries
            .values()
            .filter(|entry| entry.exposure_gate.can_expose)
            .cloned()
            .collect()
    }

    pub(crate) fn all(&self) -> Vec<RegistryEntry> {
        self.entries.values().cloned().collect()
    }
}

pub(crate) async fn list_provider_plugins(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<RegistryEntry>> {
    Json(state.plugin_registry.exposable())
}

pub(crate) async fn list_provider_plugin_diagnostics(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<RegistryEntry>> {
    Json(state.plugin_registry.all())
}

fn evaluate_exposure_gate(manifest: &ProviderManifest) -> ExposureGate {
    let mut missing_capabilities = Vec::new();
    let mut warnings = Vec::new();

    if manifest.id.trim().is_empty() {
        missing_capabilities.push("manifest.id".to_string());
    }
    if manifest.display_name.trim().is_empty() {
        missing_capabilities.push("manifest.displayName".to_string());
    }
    if !manifest.capabilities.connect {
        missing_capabilities.push("connect".to_string());
    }
    if !manifest.capabilities.schema_discovery {
        missing_capabilities.push("schemaDiscovery".to_string());
    }
    if !manifest.capabilities.read_only_query {
        missing_capabilities.push("readOnlyQuery".to_string());
    }
    if matches!(manifest.provider_kind, ProviderKind::Relational) && manifest.sql_dialect.is_none()
    {
        warnings.push("Relational providers should declare sqlDialect.".to_string());
    }

    ExposureGate {
        can_expose: missing_capabilities.is_empty(),
        missing_capabilities,
        warnings,
    }
}

fn base_capabilities() -> ProviderCapabilities {
    ProviderCapabilities {
        connect: true,
        schema_discovery: true,
        read_only_query: true,
        cancellable_query: true,
        streaming_query: false,
        writeback: true,
        ddl: true,
        import_rows: true,
        export_rows: true,
        explain: true,
        server_dashboard: false,
        semantic_hints: false,
    }
}

fn text_field(id: &str, label: &str, required: bool) -> ConnectionField {
    ConnectionField {
        id: id.to_string(),
        label: label.to_string(),
        kind: ConnectionFieldKind::Text,
        required,
        default_value: None,
        placeholder: None,
        secret: false,
        help_text: None,
    }
}

fn password_field(id: &str, label: &str) -> ConnectionField {
    ConnectionField {
        id: id.to_string(),
        label: label.to_string(),
        kind: ConnectionFieldKind::Password,
        required: false,
        default_value: None,
        placeholder: None,
        secret: true,
        help_text: None,
    }
}

fn number_field(id: &str, label: &str, default_value: u16) -> ConnectionField {
    ConnectionField {
        id: id.to_string(),
        label: label.to_string(),
        kind: ConnectionFieldKind::Number,
        required: false,
        default_value: Some(serde_json::json!(default_value)),
        placeholder: None,
        secret: false,
        help_text: None,
    }
}

fn postgresql_manifest() -> ProviderManifest {
    ProviderManifest {
        api_version: PLUGIN_API_VERSION.to_string(),
        id: "postgresql".to_string(),
        display_name: "PostgreSQL".to_string(),
        version: "0.1.0".to_string(),
        provider_kind: ProviderKind::Relational,
        description: "Built-in PostgreSQL provider exposed through the plugin host contract."
            .to_string(),
        icon_name: None,
        default_port: Some(5432),
        url_schemes: vec!["postgresql".to_string(), "postgres".to_string()],
        connection_fields: vec![
            text_field("host", "Host", true),
            number_field("port", "Port", 5432),
            text_field("database", "Database", true),
            text_field("username", "Username", false),
            password_field("password", "Password"),
        ],
        capabilities: base_capabilities(),
        sql_dialect: Some(SqlDialect {
            identifier_quote: IdentifierQuoteStyle::DoubleQuote,
            parameter_style: ParameterStyle::DollarNumber,
            limit_style: LimitStyle::LimitOffset,
            default_schema: Some("public".to_string()),
            supports_schemas: true,
            supports_transactions: true,
            supports_explain: true,
            supports_savepoints: true,
        }),
    }
}

fn mysql_manifest(id: &str, display_name: &str, default_port: u16) -> ProviderManifest {
    ProviderManifest {
        api_version: PLUGIN_API_VERSION.to_string(),
        id: id.to_string(),
        display_name: display_name.to_string(),
        version: "0.1.0".to_string(),
        provider_kind: ProviderKind::Relational,
        description: format!(
            "Built-in {display_name} provider exposed through the plugin host contract."
        ),
        icon_name: None,
        default_port: Some(default_port),
        url_schemes: vec![id.to_string()],
        connection_fields: vec![
            text_field("host", "Host", true),
            number_field("port", "Port", default_port),
            text_field("database", "Database", true),
            text_field("username", "Username", false),
            password_field("password", "Password"),
        ],
        capabilities: base_capabilities(),
        sql_dialect: Some(SqlDialect {
            identifier_quote: IdentifierQuoteStyle::Backtick,
            parameter_style: ParameterStyle::QuestionMark,
            limit_style: LimitStyle::LimitOffset,
            default_schema: None,
            supports_schemas: true,
            supports_transactions: true,
            supports_explain: true,
            supports_savepoints: true,
        }),
    }
}

fn sqlite_manifest() -> ProviderManifest {
    ProviderManifest {
        api_version: PLUGIN_API_VERSION.to_string(),
        id: "sqlite".to_string(),
        display_name: "SQLite".to_string(),
        version: "0.1.0".to_string(),
        provider_kind: ProviderKind::Relational,
        description: "Built-in SQLite provider exposed through the plugin host contract."
            .to_string(),
        icon_name: None,
        default_port: None,
        url_schemes: vec!["sqlite".to_string(), "file".to_string()],
        connection_fields: vec![ConnectionField {
            id: "path".to_string(),
            label: "Database file path".to_string(),
            kind: ConnectionFieldKind::Path,
            required: true,
            default_value: None,
            placeholder: Some("/path/to/database.db".to_string()),
            secret: false,
            help_text: None,
        }],
        capabilities: ProviderCapabilities {
            server_dashboard: false,
            ..base_capabilities()
        },
        sql_dialect: Some(SqlDialect {
            identifier_quote: IdentifierQuoteStyle::DoubleQuote,
            parameter_style: ParameterStyle::QuestionMark,
            limit_style: LimitStyle::LimitOffset,
            default_schema: Some("main".to_string()),
            supports_schemas: false,
            supports_transactions: true,
            supports_explain: true,
            supports_savepoints: true,
        }),
    }
}

fn mongodb_manifest() -> ProviderManifest {
    ProviderManifest {
        api_version: PLUGIN_API_VERSION.to_string(),
        id: "mongodb".to_string(),
        display_name: "MongoDB".to_string(),
        version: "0.1.0".to_string(),
        provider_kind: ProviderKind::Document,
        description: "Built-in MongoDB provider exposed through the plugin host contract."
            .to_string(),
        icon_name: None,
        default_port: Some(27017),
        url_schemes: vec!["mongodb".to_string(), "mongodb+srv".to_string()],
        connection_fields: vec![
            text_field("url", "Connection URL", true),
            text_field("database", "Database override", false),
        ],
        capabilities: ProviderCapabilities {
            ddl: false,
            writeback: false,
            import_rows: false,
            explain: false,
            ..base_capabilities()
        },
        sql_dialect: None,
    }
}

fn sqlserver_manifest() -> ProviderManifest {
    ProviderManifest {
        api_version: PLUGIN_API_VERSION.to_string(),
        id: "sqlserver".to_string(),
        display_name: "SQL Server".to_string(),
        version: "0.1.0".to_string(),
        provider_kind: ProviderKind::Relational,
        description: "Built-in read-only SQL Server provider with schema discovery, cancellable queries, and export.".to_string(),
        icon_name: None,
        default_port: Some(1433),
        url_schemes: vec!["sqlserver".to_string(), "mssql".to_string()],
        connection_fields: vec![
            text_field("host", "Host", true),
            number_field("port", "Port", 1433),
            text_field("database", "Database", true),
            text_field("username", "Username", false),
            password_field("password", "Password"),
        ],
        capabilities: ProviderCapabilities {
            connect: true,
            schema_discovery: true,
            read_only_query: true,
            cancellable_query: true,
            streaming_query: false,
            writeback: false,
            ddl: false,
            import_rows: false,
            export_rows: true,
            explain: false,
            server_dashboard: false,
            semantic_hints: false,
        },
        sql_dialect: Some(SqlDialect {
            identifier_quote: IdentifierQuoteStyle::Bracket,
            parameter_style: ParameterStyle::AtNumber,
            limit_style: LimitStyle::OffsetFetch,
            default_schema: Some("dbo".to_string()),
            supports_schemas: true,
            supports_transactions: true,
            supports_explain: false,
            supports_savepoints: false,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::PluginRegistry;

    #[test]
    fn sql_server_is_exposed_as_read_only_provider() {
        let registry = PluginRegistry::built_in();
        let entry = registry
            .all()
            .into_iter()
            .find(|entry| entry.manifest.id == "sqlserver")
            .expect("SQL Server provider should be registered");

        assert!(entry.exposure_gate.can_expose);
        assert!(entry.manifest.capabilities.connect);
        assert!(entry.manifest.capabilities.schema_discovery);
        assert!(entry.manifest.capabilities.read_only_query);
        assert!(entry.manifest.capabilities.export_rows);
        assert!(!entry.manifest.capabilities.writeback);
        assert!(!entry.manifest.capabilities.ddl);
        assert!(!entry.manifest.capabilities.import_rows);
    }
}
