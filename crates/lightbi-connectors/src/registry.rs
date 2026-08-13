use std::sync::Arc;
use std::collections::HashMap;

use crate::contract::ConnectorContract;

/// The SourceRegistry manages instances of all registered connectors.
/// The Runtime Engine does not communicate with external systems directly;
/// it requests the appropriate `ConnectorContract` from this registry.
#[derive(Clone)]
pub struct SourceRegistry {
    connectors: HashMap<String, Arc<dyn ConnectorContract>>,
}

impl SourceRegistry {
    pub fn new() -> Self {
        Self {
            connectors: HashMap::new(),
        }
    }

    /// Registers a connector implementation under a specific source type (e.g. "postgres", "csv").
    pub fn register(&mut self, source_type: &str, connector: Arc<dyn ConnectorContract>) {
        self.connectors.insert(source_type.to_lowercase(), connector);
    }

    /// Retrieves a connector by its source type.
    pub fn get_connector(&self, source_type: &str) -> Option<Arc<dyn ConnectorContract>> {
        self.connectors.get(&source_type.to_lowercase()).cloned()
    }
}
