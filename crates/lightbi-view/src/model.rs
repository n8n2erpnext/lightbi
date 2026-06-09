use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ViewType {
    Table,
    TimeSeries,
    Category,
    Comparison,
    Distribution,
    Pivot,
    KPI,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataViewField {
    pub field_name: String,
    pub role: String, // e.g., 'X-Axis', 'Y-Axis', 'Tooltip', 'Color'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataView {
    pub id: String,
    pub project_id: String,
    pub runtime_dataset_id: String,
    pub view_type: ViewType,
    pub fields: Vec<DataViewField>,
}
