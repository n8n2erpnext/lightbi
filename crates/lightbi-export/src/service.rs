use crate::model::{ExportJob, ExportArtifact};
use crate::registry::ExportRegistry;
use std::sync::Arc;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ExportError {
    #[error("Export generation failed: {0}")]
    GenerationFailed(String),
    #[error("Invalid export request: {0}")]
    InvalidRequest(String),
}

/// The ExportService is the unified orchestrator for generating files.
#[derive(Clone)]
pub struct ExportService {
    registry: Arc<ExportRegistry>,
}

impl ExportService {
    pub fn new(registry: Arc<ExportRegistry>) -> Self {
        Self { registry }
    }

    /// Submits a job to generate a file based on analytical assets.
    pub fn process_export(&self, job: &ExportJob) -> Result<ExportArtifact, ExportError> {
        if job.source_assets.is_empty() {
            return Err(ExportError::InvalidRequest("No source assets provided for export".to_string()));
        }
        
        // In reality, this would route to a specific generator (e.g. CSV Writer)
        // and physically write the file to the project's export directory.
        Err(ExportError::GenerationFailed("Not implemented in phase 24 mock".to_string()))
    }
}
