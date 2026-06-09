use std::collections::HashMap;
use std::sync::Arc;

use crate::model::ExecutionPlan;

/// The PlannerRegistry holds generated execution plans so that
/// frequently requested recipes do not need to be planned repeatedly.
#[derive(Clone, Default)]
pub struct PlannerRegistry {
    plans: HashMap<String, Arc<ExecutionPlan>>,
}

impl PlannerRegistry {
    pub fn new() -> Self {
        Self {
            plans: HashMap::new(),
        }
    }

    pub fn register(&mut self, plan_id: &str, plan: Arc<ExecutionPlan>) {
        self.plans.insert(plan_id.to_string(), plan);
    }

    pub fn get_plan(&self, plan_id: &str) -> Option<Arc<ExecutionPlan>> {
        self.plans.get(plan_id).cloned()
    }
}
