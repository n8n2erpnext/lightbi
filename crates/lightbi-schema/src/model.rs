use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnMetadata {
    pub id: String,
    pub schema_id: String,
    pub column_name: String,
    pub data_type: String,
    pub nullable: bool,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipMetadata {
    pub id: String,
    pub schema_id: String,
    pub source_column: String,
    pub target_dataset: String,
    pub target_column: String,
    pub relationship_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaMetadata {
    pub id: String,
    pub dataset_id: String,
    pub schema_name: String,
    pub columns: Vec<ColumnMetadata>,
    pub relationships: Vec<RelationshipMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticField {
    pub id: String,
    pub schema_id: String,
    pub field_name: String,
    pub semantic_type: String, // e.g., "Customer", "Date", "Region"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticMeasure {
    pub id: String,
    pub schema_id: String,
    pub measure_name: String,
    pub aggregation_type: String, // e.g., "SUM", "COUNT", "AVG"
}
