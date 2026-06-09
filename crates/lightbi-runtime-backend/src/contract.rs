use async_trait::async_trait;
use lightbi_planner::model::ExecutionPlan;
use crate::model::ResultSet;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum BackendError {
    #[error("Plan rejected by backend: {0}")]
    PlanRejected(String),
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),
}

#[async_trait]
pub trait ExecutionBackend: Send + Sync {
    /// Returns the name of the backend engine (e.g., 'DuckDB', 'PostgresPushdown')
    fn name(&self) -> &str;

    /// Validates whether this backend supports the operations required by the plan
    async fn validate_plan(&self, plan: &ExecutionPlan) -> Result<(), BackendError>;

    /// Returns a heuristic cost estimation (CPU/Memory/Network)
    async fn estimate_cost(&self, plan: &ExecutionPlan) -> Result<u64, BackendError>;

    /// Executes the plan and returns the standardized ResultSet
    async fn execute_plan(&self, plan: &ExecutionPlan) -> Result<ResultSet, BackendError>;
}
