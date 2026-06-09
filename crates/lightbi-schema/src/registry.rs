use std::collections::HashMap;

use crate::model::{SchemaMetadata, SemanticField, SemanticMeasure};

#[derive(Clone, Default)]
pub struct SchemaRegistry {
    schemas: HashMap<String, SchemaMetadata>,
}

impl SchemaRegistry {
    pub fn new() -> Self {
        Self {
            schemas: HashMap::new(),
        }
    }

    pub fn register(&mut self, dataset_id: &str, schema: SchemaMetadata) {
        self.schemas.insert(dataset_id.to_string(), schema);
    }

    pub fn get_schema(&self, dataset_id: &str) -> Option<&SchemaMetadata> {
        self.schemas.get(dataset_id)
    }
}

#[derive(Clone, Default)]
pub struct SemanticRegistry {
    fields: HashMap<String, Vec<SemanticField>>,
    measures: HashMap<String, Vec<SemanticMeasure>>,
}

impl SemanticRegistry {
    pub fn new() -> Self {
        Self {
            fields: HashMap::new(),
            measures: HashMap::new(),
        }
    }

    pub fn register_fields(&mut self, schema_id: &str, semantic_fields: Vec<SemanticField>) {
        self.fields.insert(schema_id.to_string(), semantic_fields);
    }

    pub fn register_measures(&mut self, schema_id: &str, semantic_measures: Vec<SemanticMeasure>) {
        self.measures.insert(schema_id.to_string(), semantic_measures);
    }

    pub fn get_fields(&self, schema_id: &str) -> Option<&Vec<SemanticField>> {
        self.fields.get(schema_id)
    }

    pub fn get_measures(&self, schema_id: &str) -> Option<&Vec<SemanticMeasure>> {
        self.measures.get(schema_id)
    }
}
