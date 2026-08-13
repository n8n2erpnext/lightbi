use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WidgetType {
    Chart,
    Insight,
    Export,
    Action,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardWidget {
    pub widget_type: WidgetType,
    pub asset_id: String,
    pub position_metadata: serde_json::Value,
    pub visibility_rules: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardDefinition {
    pub id: String,
    pub project_id: String,
    pub dashboard_name: String,
    pub perspective_id: String,
    pub layout_metadata: serde_json::Value,
    pub widgets: Vec<DashboardWidget>,
}
