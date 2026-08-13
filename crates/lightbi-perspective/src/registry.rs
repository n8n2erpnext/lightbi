use std::collections::HashMap;
use std::sync::Arc;

use crate::model::Perspective;

#[derive(Clone, Default)]
pub struct PerspectiveRegistry {
    perspectives: HashMap<String, Arc<Perspective>>,
}

impl PerspectiveRegistry {
    pub fn new() -> Self {
        Self {
            perspectives: HashMap::new(),
        }
    }

    pub fn register(&mut self, perspective_id: &str, perspective: Arc<Perspective>) {
        self.perspectives.insert(perspective_id.to_string(), perspective);
    }

    pub fn get_perspective(&self, perspective_id: &str) -> Option<Arc<Perspective>> {
        self.perspectives.get(perspective_id).cloned()
    }
}
