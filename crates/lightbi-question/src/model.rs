use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TemplateType {
    TopN,
    Trend,
    Comparison,
    Distribution,
    Ranking,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateParameter {
    pub parameter_name: String,
    pub parameter_type: String, // e.g., 'Dimension', 'Measure', 'TimeGranularity'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionTemplate {
    pub id: String,
    pub project_id: String,
    pub template_name: String,
    pub template_type: TemplateType,
    pub description: Option<String>,
    pub parameters: Vec<TemplateParameter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateCandidate {
    pub template_id: String,
    pub extracted_parameters: std::collections::HashMap<String, String>,
    pub confidence_score: f32,
}
