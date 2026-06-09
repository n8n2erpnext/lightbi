use serde::{Deserialize, Serialize};
use ts_rs::TS;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum PayloadVersion {
    V1,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChartPayload {
    pub id: String,
    pub chart_type: String, // 'Line', 'Bar', 'Pie'
    pub mappings: HashMap<String, String>, // 'X-Axis' -> 'date_col'
    #[ts(type = "any")]
    pub theme_metadata: serde_json::Value,
    pub payload_version: PayloadVersion,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct InsightPayload {
    pub id: String,
    pub insight_type: String,
    pub observation_text: String,
    pub confidence: f32,
    pub payload_version: PayloadVersion,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ExportPayload {
    pub id: String,
    pub artifact_type: String,
    pub download_url: String,
    pub payload_version: PayloadVersion,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WidgetPayload {
    pub widget_type: String, // 'Chart', 'Insight', 'Export'
    pub asset_id: String,
    #[ts(type = "any")]
    pub position_metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DashboardPayload {
    pub id: String,
    pub title: String,
    pub perspective_id: String,
    #[ts(type = "any")]
    pub layout_metadata: serde_json::Value,
    pub widgets: Vec<WidgetPayload>,
    pub payload_version: PayloadVersion,
}
