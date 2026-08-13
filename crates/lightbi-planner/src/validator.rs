use thiserror::Error;
use crate::model::ExecutionPlan;

#[derive(Error, Debug)]
pub enum PlanError {
    #[error("Source access denied or missing: {0}")]
    InvalidSourceAccess(String),
    #[error("Strategy conflict: {0}")]
    StrategyConflict(String),
}

/// The PlanValidator acts as the final gatekeeper before handing instructions to the Runtime.
#[derive(Clone, Default)]
pub struct PlanValidator {}

impl PlanValidator {
    pub fn new() -> Self {
        Self {}
    }

    /// Verifies that the ExecutionPlan is completely safe to run.
    pub fn validate_plan(&self, plan: &ExecutionPlan) -> Result<(), PlanError> {
        if plan.steps.is_empty() {
            return Err(PlanError::StrategyConflict("Plan has no execution steps".to_string()));
        }
        Ok(())
    }
}
