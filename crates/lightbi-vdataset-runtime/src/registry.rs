use std::collections::HashMap;
use std::sync::Arc;
use crate::model::RuntimeDataset;

#[derive(Clone, Default)]
pub struct RuntimeDatasetRegistry {
    datasets: HashMap<String, Arc<RuntimeDataset>>,
}

impl RuntimeDatasetRegistry {
    pub fn new() -> Self {
        Self {
            datasets: HashMap::new(),
        }
    }

    pub fn register(&mut self, dataset: Arc<RuntimeDataset>) {
        self.datasets.insert(dataset.id.clone(), dataset);
    }

    pub fn get_dataset(&self, id: &str) -> Option<Arc<RuntimeDataset>> {
        self.datasets.get(id).cloned()
    }
}
