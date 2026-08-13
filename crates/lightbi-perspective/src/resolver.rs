use std::sync::Arc;
use thiserror::Error;

use crate::model::{Perspective, QuestionContext};
use crate::registry::PerspectiveRegistry;

#[derive(Error, Debug)]
pub enum ResolutionError {
    #[error("Perspective not found: {0}")]
    NotFound(String),
}

/// The ContextResolver evaluates the raw user intent and active perspective
/// to compile a full QuestionContext for the Recipe Engine.
#[derive(Clone)]
pub struct ContextResolver {
    registry: Arc<PerspectiveRegistry>,
}

impl ContextResolver {
    pub fn new(registry: Arc<PerspectiveRegistry>) -> Self {
        Self { registry }
    }

    /// Resolves the active perspective and binds it to the analytical question boundaries.
    pub fn resolve_context(
        &self, 
        perspective_id: &str, 
        question_text: &str, 
        intent: &str
    ) -> Result<QuestionContext, ResolutionError> {
        let perspective = self.registry.get_perspective(perspective_id)
            .ok_or_else(|| ResolutionError::NotFound(perspective_id.to_string()))?;

        // In the future, this resolver will cross-reference the DatasetRegistry 
        // and SemanticRegistry to narrow down the exact scopes.
        
        Ok(QuestionContext {
            question_text: question_text.to_string(),
            business_intent: intent.to_string(),
            dataset_scope: perspective.dataset_links.clone(),
            semantic_scope: perspective.semantic_links.clone(),
            perspective: (*perspective).clone(),
        })
    }
}
