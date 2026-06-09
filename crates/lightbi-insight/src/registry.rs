use std::collections::HashMap;
use std::sync::Arc;
use crate::model::Insight;

#[derive(Clone, Default)]
pub struct InsightRegistry {
    insights: HashMap<String, Arc<Insight>>,
}

impl InsightRegistry {
    pub fn new() -> Self {
        Self {
            insights: HashMap::new(),
        }
    }

    pub fn register(&mut self, insight: Arc<Insight>) {
        self.insights.insert(insight.id.clone(), insight);
    }

    pub fn get_insight(&self, id: &str) -> Option<Arc<Insight>> {
        self.insights.get(id).cloned()
    }
}
