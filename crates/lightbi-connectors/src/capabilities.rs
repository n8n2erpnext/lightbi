use serde::{Serialize, Deserialize};

/// Explicit capability flags for a Connector.
/// The Planner relies strictly on these flags to optimize execution strategies.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SourceCapabilities {
    pub supports_schema_discovery: bool,
    pub supports_relationships: bool,
    pub supports_incremental_refresh: bool,
    pub supports_file_storage: bool,
    pub supports_sql_execution: bool,
    pub supports_pushdown_filtering: bool,
    pub supports_pushdown_aggregation: bool,
}
