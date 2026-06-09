use std::collections::HashMap;
use std::sync::Arc;
use crate::model::DataView;

#[derive(Clone, Default)]
pub struct DataViewRegistry {
    views: HashMap<String, Arc<DataView>>,
}

impl DataViewRegistry {
    pub fn new() -> Self {
        Self {
            views: HashMap::new(),
        }
    }

    pub fn register(&mut self, view: Arc<DataView>) {
        self.views.insert(view.id.clone(), view);
    }

    pub fn get_view(&self, id: &str) -> Option<Arc<DataView>> {
        self.views.get(id).cloned()
    }
}
