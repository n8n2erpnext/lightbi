use async_trait::async_trait;

// Placeholders for domain models
pub struct Project;
pub struct Recipe;
pub struct Dashboard;
pub struct EventLog;

#[async_trait]
pub trait ProjectStore {
    // A single unified store contract instead of fragmented CRUD repositories
    async fn load_project(&self, id: &str) -> Result<Option<Project>, crate::db::StoreError>;
    async fn save_project(&self, project: &Project) -> Result<(), crate::db::StoreError>;
    
    async fn save_recipe(&self, project_id: &str, recipe: &Recipe) -> Result<(), crate::db::StoreError>;
    async fn save_dashboard(&self, project_id: &str, dashboard: &Dashboard) -> Result<(), crate::db::StoreError>;
    
    async fn append_event(&self, event: &EventLog) -> Result<(), crate::db::StoreError>;
}
