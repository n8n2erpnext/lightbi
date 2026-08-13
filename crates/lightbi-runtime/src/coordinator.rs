use std::sync::Arc;
use thiserror::Error;
use lightbi_planner::model::ExecutionPlan;
use lightbi_runtime_backend::model::ResultSet;
use lightbi_runtime_backend::registry::BackendRegistry;

#[derive(Error, Debug)]
pub enum RuntimeError {
    #[error("No suitable backend found for execution plan")]
    NoSuitableBackend,
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),
}

/// The RuntimeCoordinator is the sole entry point for executing analytical plans.
#[derive(Clone)]
pub struct RuntimeCoordinator {
    registry: Arc<BackendRegistry>,
}

impl RuntimeCoordinator {
    pub fn new(registry: Arc<BackendRegistry>) -> Self {
        Self { registry }
    }

    pub async fn execute(&self, plan: ExecutionPlan) -> Result<ResultSet, RuntimeError> {
        // In the future, this will loop over backends, ask them to validate/estimate,
        // and pick the optimal one. For now, it simply fails since we have no backends attached.
        
        // Example workflow:
        // let backend = self.registry.get_backend("DuckDB").ok_or(RuntimeError::NoSuitableBackend)?;
        // backend.execute_plan(&plan).await.map_err(|e| RuntimeError::ExecutionFailed(e.to_string()))
        
        Err(RuntimeError::NoSuitableBackend)
    }
}
