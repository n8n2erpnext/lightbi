use async_trait::async_trait;
use std::path::Path;
use thiserror::Error;

use crate::context::ProjectContext;

#[derive(Error, Debug)]
pub enum ProjectError {
    #[error("Failed to initialize project: {0}")]
    Initialization(String),
    #[error("Failed to load project: {0}")]
    Load(String),
    #[error("Export/Import failed: {0}")]
    BundleError(String),
}

/// ProjectManager is the primary entry point for all workspace lifecycle operations.
#[async_trait]
pub trait ProjectManager {
    /// Bootstraps a new project on disk (Draft -> Active)
    async fn create_project(&self, name: &str, path: &Path) -> Result<ProjectContext, ProjectError>;
    
    /// Loads an existing project into memory, initializing the ProjectContext
    async fn open_project(&self, path: &Path) -> Result<ProjectContext, ProjectError>;
    
    /// Unloads the project from memory, flushing any lingering states
    async fn close_project(&self, context: ProjectContext) -> Result<(), ProjectError>;
    
    /// Transitions a project into an immutable Archived state
    async fn archive_project(&self, path: &Path) -> Result<(), ProjectError>;
    
    /// Bundles the project directory into a portable `.projectbundle`
    async fn export_project(&self, context: &ProjectContext, export_path: &Path) -> Result<(), ProjectError>;
    
    /// Extracts a `.projectbundle` and recreates the project directory
    async fn import_project(&self, bundle_path: &Path, destination: &Path) -> Result<ProjectContext, ProjectError>;
}
