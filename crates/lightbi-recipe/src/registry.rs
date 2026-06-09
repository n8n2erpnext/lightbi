use std::collections::HashMap;
use std::sync::Arc;

use crate::model::Recipe;

#[derive(Clone, Default)]
pub struct RecipeRegistry {
    recipes: HashMap<String, Arc<Recipe>>,
}

impl RecipeRegistry {
    pub fn new() -> Self {
        Self {
            recipes: HashMap::new(),
        }
    }

    pub fn register(&mut self, recipe_id: &str, recipe: Arc<Recipe>) {
        self.recipes.insert(recipe_id.to_string(), recipe);
    }

    pub fn get_recipe(&self, recipe_id: &str) -> Option<Arc<Recipe>> {
        self.recipes.get(recipe_id).cloned()
    }
}
