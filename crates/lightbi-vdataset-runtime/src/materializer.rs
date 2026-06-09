use std::sync::Arc;
use thiserror::Error;
use lightbi_runtime_backend::model::ResultSet;
use crate::model::{RuntimeDataset, RefreshStrategy};
use crate::registry::RuntimeDatasetRegistry;

#[derive(Error, Debug)]
pub enum MaterializationError {
    #[error("Failed to map ResultSet to Dataset: {0}")]
    MappingFailed(String),
}

/// The DatasetMaterializer wraps transient backend ResultSets into governable,
/// cacheable RuntimeDatasets for the UI to consume.
#[derive(Clone)]
pub struct DatasetMaterializer {
    registry: Arc<RuntimeDatasetRegistry>,
}

impl DatasetMaterializer {
    pub fn new(registry: Arc<RuntimeDatasetRegistry>) -> Self {
        Self { registry }
    }

    /// Takes a transient ResultSet and formalizes it into a reusable RuntimeDataset.
    pub fn materialize(
        &self, 
        execution_id: &str, 
        dataset_id: &str, 
        _result_set: &ResultSet
    ) -> Result<RuntimeDataset, MaterializationError> {
        // In full implementation, the materializer might dump the ResultSet to disk (DuckDB Parquet format)
        // or hold it in memory, assigning it a UUID cache key.
        
        Ok(RuntimeDataset {
            id: format!("rd_{}", execution_id),
            source_execution_id: execution_id.to_string(),
            dataset_id: dataset_id.to_string(),
            refresh_strategy: RefreshStrategy::Manual,
            last_refreshed_at: None, // Or current timestamp
        })
    }
}
