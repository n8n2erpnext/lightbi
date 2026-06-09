use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsightNarrative {
    pub observation_text: String,
    pub supporting_metrics: HashMap<String, f64>,
    pub confidence: f32,
    pub source_references: Vec<String>, // e.g., dataset IDs or column names
}

impl InsightNarrative {
    pub fn new(
        observation_text: String,
        supporting_metrics: HashMap<String, f64>,
        confidence: f32,
        source_references: Vec<String>,
    ) -> Self {
        Self {
            observation_text,
            supporting_metrics,
            confidence,
            source_references,
        }
    }
}
