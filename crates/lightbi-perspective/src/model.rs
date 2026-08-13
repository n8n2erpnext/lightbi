use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerspectiveType {
    Business, // e.g., Sales, Finance
    Role,     // e.g., CEO, Branch Manager
    Custom,   // Project specific viewpoints
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Perspective {
    pub id: String,
    pub name: String,
    pub perspective_type: PerspectiveType,
    pub description: Option<String>,
    pub dataset_links: Vec<String>, // Allowed Dataset IDs
    pub semantic_links: Vec<String>, // Allowed Semantic Field IDs
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionContext {
    pub question_text: String,
    pub business_intent: String,
    pub perspective: Perspective,
    pub dataset_scope: Vec<String>,
    pub semantic_scope: Vec<String>,
}
