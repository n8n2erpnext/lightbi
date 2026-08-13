use std::collections::HashMap;
use std::sync::Arc;
use crate::contract::ExecutionBackend;

#[derive(Clone, Default)]
pub struct BackendRegistry {
    backends: HashMap<String, Arc<dyn ExecutionBackend>>,
}

impl BackendRegistry {
    pub fn new() -> Self {
        Self {
            backends: HashMap::new(),
        }
    }

    pub fn register(&mut self, backend: Arc<dyn ExecutionBackend>) {
        self.backends.insert(backend.name().to_string(), backend);
    }

    pub fn get_backend(&self, name: &str) -> Option<Arc<dyn ExecutionBackend>> {
        self.backends.get(name).cloned()
    }
}
