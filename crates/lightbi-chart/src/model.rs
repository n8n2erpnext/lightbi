use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChartType {
    Line,
    Bar,
    Area,
    Pie,
    Table,
    KPI,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartMapping {
    pub field_name: String,
    pub visual_role: String, // e.g., 'X-Axis', 'Y-Axis', 'Color', 'Tooltip'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartDefinition {
    pub id: String,
    pub project_id: String,
    pub data_view_id: String,
    pub chart_type: ChartType,
    pub mappings: Vec<ChartMapping>,
    pub theme_metadata: serde_json::Value,
}
