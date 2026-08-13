use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DatasetType {
    /// Represents a direct 1:1 mapping to a source object (e.g., a specific CSV file, or a Postgres Table)
    SourceDataset,
    /// Represents a derived logical dataset mapping multiple sources and recipes
    VirtualDataset,
    /// Represents a dataset generated explicitly from another dataset
    DerivedDataset,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatasetMetadata {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub dataset_type: DatasetType,
    pub schema_payload: String, // The resolved logical schema of the dataset
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatasetLineage {
    pub dataset_id: String,
    pub parent_dataset_id: Option<String>,
    pub source_references: Vec<String>, // List of source_ids this dataset touches
    pub creation_method: String, // e.g. "recipe", "direct_import", "ai_generated"
}

/// Abstract representation of a Virtual Dataset.
#[derive(Debug, Clone)]
pub struct VirtualDataset {
    pub metadata: DatasetMetadata,
    pub lineage: DatasetLineage,
}

/// The unified Dataset contract representing any type of dataset structure.
pub trait Dataset: Send + Sync {
    fn metadata(&self) -> &DatasetMetadata;
    fn lineage(&self) -> &DatasetLineage;
}
