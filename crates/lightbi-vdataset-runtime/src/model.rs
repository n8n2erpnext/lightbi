use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RefreshStrategy {
    Manual,
    Incremental,
    Scheduled,
    Never,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CacheType {
    Memory,
    LocalDisk,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeDataset {
    pub id: String,
    pub source_execution_id: String,
    pub dataset_id: String,
    pub refresh_strategy: RefreshStrategy,
    pub last_refreshed_at: Option<String>,
}
