use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionMetadata {
    pub rows_processed: u64,
    pub execution_time_ms: u64,
    pub backend_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDef {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultSet {
    pub columns: Vec<ColumnDef>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub statistics: HashMap<String, f64>,
    pub metadata: ExecutionMetadata,
}
