use crate::narrative::InsightNarrative;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Insight confidence ({0}) falls below required threshold ({1})")]
    LowConfidence(f32, f32),
    #[error("Insight is missing supporting metrics")]
    MissingMetrics,
    #[error("Insight is missing source references")]
    MissingReferences,
}

/// The InsightValidator ensures a generated narrative meets deterministic standards
/// before it is allowed to be presented to the user.
#[derive(Clone, Default)]
pub struct InsightValidator {}

impl InsightValidator {
    pub fn new() -> Self {
        Self {}
    }

    pub fn validate(&self, narrative: &InsightNarrative) -> Result<(), ValidationError> {
        if narrative.confidence < 0.60 {
            return Err(ValidationError::LowConfidence(narrative.confidence, 0.60));
        }

        if narrative.supporting_metrics.is_empty() {
            return Err(ValidationError::MissingMetrics);
        }

        if narrative.source_references.is_empty() {
            return Err(ValidationError::MissingReferences);
        }

        Ok(())
    }
}
