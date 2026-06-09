use std::sync::Arc;
use thiserror::Error;

use crate::classifier::QuestionClassifier;
use crate::registry::QuestionTemplateRegistry;
use crate::model::QuestionTemplate;

#[derive(Error, Debug)]
pub enum ResolutionError {
    #[error("Unable to classify question above confidence threshold")]
    LowConfidence,
    #[error("Resolved template ID was not found in registry: {0}")]
    TemplateNotFound(String),
}

/// The TemplateResolver orchestrates the translation of a raw string into a structured template instance.
#[derive(Clone)]
pub struct TemplateResolver {
    classifier: Arc<QuestionClassifier>,
    registry: Arc<QuestionTemplateRegistry>,
}

impl TemplateResolver {
    pub fn new(classifier: Arc<QuestionClassifier>, registry: Arc<QuestionTemplateRegistry>) -> Self {
        Self { classifier, registry }
    }

    /// Resolves a raw question text into a validated template structure.
    pub fn resolve(&self, question: &str) -> Result<(Arc<QuestionTemplate>, std::collections::HashMap<String, String>), ResolutionError> {
        let candidate = self.classifier.classify(question)
            .ok_or(ResolutionError::LowConfidence)?;

        if candidate.confidence_score < 0.75 {
            return Err(ResolutionError::LowConfidence);
        }

        let template = self.registry.get_template(&candidate.template_id)
            .ok_or_else(|| ResolutionError::TemplateNotFound(candidate.template_id.clone()))?;

        Ok((template, candidate.extracted_parameters))
    }
}
