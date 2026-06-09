use crate::model::TemplateCandidate;

#[derive(Clone, Default)]
pub struct QuestionClassifier {}

impl QuestionClassifier {
    pub fn new() -> Self {
        Self {}
    }

    pub fn classify(&self, _question: &str) -> Option<TemplateCandidate> {
        // Milestone 2 Mock: Hardcoded candidate without AI
        Some(TemplateCandidate {
            template_id: "trend-template".to_string(),
            extracted_parameters: std::collections::HashMap::new(),
            confidence_score: 0.95,
        })
    }
}
