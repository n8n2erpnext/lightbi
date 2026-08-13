use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnalyticalIntent {
    Aggregation { field: String, operation: String },
    Ranking { field: String, limit: u32, order: String },
    Comparison { base_period: String, target_period: String },
    Trend { field: String, time_granularity: String },
    Distribution { measure: String, dimension: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recipe {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub perspective_reference: String,
    pub dataset_scope: Vec<String>,
    pub semantic_scope: Vec<String>,
    pub intents: Vec<AnalyticalIntent>,
}
