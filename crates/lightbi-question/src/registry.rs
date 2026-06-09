use std::collections::HashMap;
use std::sync::Arc;
use crate::model::QuestionTemplate;

#[derive(Clone, Default)]
pub struct QuestionTemplateRegistry {
    templates: HashMap<String, Arc<QuestionTemplate>>,
}

impl QuestionTemplateRegistry {
    pub fn new() -> Self {
        Self {
            templates: HashMap::new(),
        }
    }

    pub fn register(&mut self, template_id: &str, template: Arc<QuestionTemplate>) {
        self.templates.insert(template_id.to_string(), template);
    }

    pub fn get_template(&self, template_id: &str) -> Option<Arc<QuestionTemplate>> {
        self.templates.get(template_id).cloned()
    }
}
