use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExportType {
    Excel,
    CSV,
    PDF,
    PNG,
    ProjectBundle,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExportStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportJob {
    pub id: String,
    pub project_id: String,
    pub source_assets: Vec<String>, // e.g., dataset IDs or insight IDs
    pub export_type: ExportType,
    pub requested_by: String,
    pub status: ExportStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactLineage {
    pub source_type: String, // e.g., "RuntimeDataset", "DataView", "Insight"
    pub source_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportArtifact {
    pub id: String,
    pub export_job_id: String,
    pub artifact_type: ExportType,
    pub file_path: String,
    pub lineage: Vec<ArtifactLineage>,
}
