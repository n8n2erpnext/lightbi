use std::collections::HashMap;
use std::sync::Arc;
use crate::model::ExportArtifact;

#[derive(Clone, Default)]
pub struct ExportRegistry {
    artifacts: HashMap<String, Arc<ExportArtifact>>,
}

impl ExportRegistry {
    pub fn new() -> Self {
        Self {
            artifacts: HashMap::new(),
        }
    }

    pub fn register(&mut self, artifact: Arc<ExportArtifact>) {
        self.artifacts.insert(artifact.id.clone(), artifact);
    }

    pub fn get_artifact(&self, id: &str) -> Option<Arc<ExportArtifact>> {
        self.artifacts.get(id).cloned()
    }
}
