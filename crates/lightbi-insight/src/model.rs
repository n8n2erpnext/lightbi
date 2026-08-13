use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InsightType {
    Observation,
    Trend,
    Comparison,
    Anomaly,
    Recommendation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Insight {
    pub id: String,
    pub project_id: String,
    pub runtime_dataset_id: String,
    pub insight_type: InsightType,
    pub confidence: f32, // 0.0 to 1.0
}
