use std::collections::HashMap;
use std::sync::Arc;
use crate::model::ChartDefinition;

#[derive(Clone, Default)]
pub struct ChartRegistry {
    charts: HashMap<String, Arc<ChartDefinition>>,
}

impl ChartRegistry {
    pub fn new() -> Self {
        Self {
            charts: HashMap::new(),
        }
    }

    pub fn register(&mut self, chart: Arc<ChartDefinition>) {
        self.charts.insert(chart.id.clone(), chart);
    }

    pub fn get_chart(&self, id: &str) -> Option<Arc<ChartDefinition>> {
        self.charts.get(id).cloned()
    }
}
