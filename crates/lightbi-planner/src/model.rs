use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StrategyType {
    Pushdown,
    Cache,
    Incremental,
    Materialized,
    Sampling,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStep {
    pub step_order: u32,
    pub step_type: String, // e.g., 'Extract', 'Transform', 'Load', 'ExecuteSQL'
    pub payload: String,   // JSON payload of step-specific instructions
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPlan {
    pub id: String,
    pub project_id: String,
    pub recipe_id: String,
    pub plan_name: String,
    pub dataset_scope: Vec<String>,
    pub source_scope: Vec<String>,
    pub strategy_type: StrategyType,
    pub steps: Vec<ExecutionStep>,
}
