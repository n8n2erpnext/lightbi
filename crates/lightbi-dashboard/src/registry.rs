use std::collections::HashMap;
use std::sync::Arc;
use crate::model::DashboardDefinition;

#[derive(Clone, Default)]
pub struct DashboardRegistry {
    dashboards: HashMap<String, Arc<DashboardDefinition>>,
}

impl DashboardRegistry {
    pub fn new() -> Self {
        Self {
            dashboards: HashMap::new(),
        }
    }

    pub fn register(&mut self, dashboard: Arc<DashboardDefinition>) {
        self.dashboards.insert(dashboard.id.clone(), dashboard);
    }

    pub fn get_dashboard(&self, id: &str) -> Option<Arc<DashboardDefinition>> {
        self.dashboards.get(id).cloned()
    }
}
