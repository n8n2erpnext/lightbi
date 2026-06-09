use async_trait::async_trait;
use std::collections::HashMap;
use serde_json::json;
use crate::contract::{ConnectorContract, ConnectorError};
use crate::capabilities::SourceCapabilities;

pub struct CsvConnector {}

impl CsvConnector {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl ConnectorContract for CsvConnector {
    fn capabilities(&self) -> SourceCapabilities {
        SourceCapabilities {
            supports_schema_discovery: true,
            supports_relationships: false,
            supports_incremental_refresh: false,
            supports_file_storage: true,
            supports_sql_execution: false,
            supports_pushdown_filtering: false,
            supports_pushdown_aggregation: false,
        }
    }

    async fn test_connection(&self, settings: &HashMap<String, String>) -> Result<(), ConnectorError> {
        let file_path = settings.get("file_path").ok_or_else(|| ConnectorError::ConnectionFailed("file_path is required".to_string()))?;
        if std::path::Path::new(file_path).exists() {
            Ok(())
        } else {
            Err(ConnectorError::ConnectionFailed(format!("File not found: {}", file_path)))
        }
    }

    async fn list_entities(&self, _settings: &HashMap<String, String>) -> Result<Vec<String>, ConnectorError> {
        // For a CSV, the entity is just the file itself. We can return "default" or the filename.
        Ok(vec!["default".to_string()])
    }

    async fn discover_schema(&self, _entity_name: &str, settings: &HashMap<String, String>) -> Result<String, ConnectorError> {
        let file_path = settings.get("file_path").ok_or_else(|| ConnectorError::ConnectionFailed("file_path is required".to_string()))?;
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(true)
            .from_path(file_path)
            .map_err(|e| ConnectorError::SchemaDiscovery(e.to_string()))?;
        
        let headers = rdr.headers().map_err(|e| ConnectorError::SchemaDiscovery(e.to_string()))?;
        let mut schema_fields = Vec::new();
        
        for header in headers.iter() {
            // Very naive type inference for milestone 1: assume string unless we want to do more work.
            // In DuckDB this will be auto-inferred accurately, but here we just need a baseline schema model.
            schema_fields.push(json!({
                "name": header,
                "data_type": "string" 
            }));
        }

        Ok(json!({
            "entity": "default",
            "fields": schema_fields
        }).to_string())
    }

    async fn discover_columns(&self, entity_name: &str, settings: &HashMap<String, String>) -> Result<String, ConnectorError> {
        self.discover_schema(entity_name, settings).await
    }

    async fn discover_relationships(&self, _entity_name: &str, _settings: &HashMap<String, String>) -> Result<String, ConnectorError> {
        // CSV files don't inherently have relationships.
        Ok("[]".to_string())
    }
}
