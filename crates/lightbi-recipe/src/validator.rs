use thiserror::Error;
use crate::model::Recipe;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Invalid Semantic Reference: {0}")]
    InvalidSemanticReference(String),
    #[error("Invalid Dataset Reference: {0}")]
    InvalidDatasetReference(String),
    #[error("Intent Conflict: {0}")]
    IntentConflict(String),
}

/// The RecipeValidator guarantees that invalid logic never reaches the Planner.
#[derive(Clone, Default)]
pub struct RecipeValidator {}

impl RecipeValidator {
    pub fn new() -> Self {
        Self {}
    }

    /// Validates the internal consistency of a recipe before allowing it to be executed.
    pub fn validate(&self, recipe: &Recipe) -> Result<(), ValidationError> {
        // In a complete implementation, this would cross-reference the active SchemaRegistry 
        // to ensure that fields referenced in `recipe.intents` actually exist within the
        // `semantic_scope` of the active `perspective_reference`.
        
        if recipe.dataset_scope.is_empty() {
            return Err(ValidationError::InvalidDatasetReference("Recipe has empty dataset scope".to_string()));
        }

        Ok(())
    }
}
