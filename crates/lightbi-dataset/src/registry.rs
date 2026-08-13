use std::collections::HashMap;
use std::sync::Arc;

use crate::model::Dataset;

/// The DatasetRegistry manages all datasets currently loaded within a Project Context.
#[derive(Clone)]
pub struct DatasetRegistry {
    datasets: HashMap<String, Arc<dyn Dataset>>,
}

impl DatasetRegistry {
    pub fn new() -> Self {
        Self {
            datasets: HashMap::new(),
        }
    }

    pub fn register(&mut self, dataset_id: &str, dataset: Arc<dyn Dataset>) {
        self.datasets.insert(dataset_id.to_string(), dataset);
    }

    pub fn get_dataset(&self, dataset_id: &str) -> Option<Arc<dyn Dataset>> {
        self.datasets.get(dataset_id).cloned()
    }
}
