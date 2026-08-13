use async_trait::async_trait;
use thiserror::Error;
use std::collections::HashMap;

use crate::capabilities::SourceCapabilities;

#[derive(Error, Debug)]
pub enum ConnectorError {
    #[error("Connection Failed: {0}")]
    ConnectionFailed(String),
    #[error("Schema Discovery Error: {0}")]
    SchemaDiscovery(String),
    #[error("Operation not supported by this connector.")]
    NotSupported,
}

/// The unified Rust trait that all external sources must implement.
/// Note: This phase explicitly omits query execution methods.
#[async_trait]
pub trait ConnectorContract: Send + Sync {
    /// Returns the explicit capabilities supported by this source.
    fn capabilities(&self) -> SourceCapabilities;
    
    /// Tests the connection using the provided settings.
    async fn test_connection(&self, settings: &HashMap<String, String>) -> Result<(), ConnectorError>;
    
    /// Lists all available entities (e.g. Tables, Views, API Endpoints).
    async fn list_entities(&self, settings: &HashMap<String, String>) -> Result<Vec<String>, ConnectorError>;
    
    /// Discovers the structural schema (types, fields) for a specific entity.
    async fn discover_schema(&self, entity_name: &str, settings: &HashMap<String, String>) -> Result<String, ConnectorError>;

    /// Discovers the columns associated with an entity.
    async fn discover_columns(&self, entity_name: &str, settings: &HashMap<String, String>) -> Result<String, ConnectorError>;

    /// Discovers foreign key / relationship constraints.
    async fn discover_relationships(&self, entity_name: &str, settings: &HashMap<String, String>) -> Result<String, ConnectorError>;
}
