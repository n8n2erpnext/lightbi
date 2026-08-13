use serde::{Deserialize, Serialize};

/// The structure of the `project_manifest.json` file.
/// This manifest must remain lightweight and is strictly used for identification,
/// version tracking, and schema migrations.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectManifest {
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String, // SemVer of the project
    pub lightbi_version: String, // Version of LightBI that created/updated this
    pub created_at: String,
    pub updated_at: String,
    
    // Optional fields
    #[serde(default)]
    pub tags: Vec<String>,
    pub owner: Option<String>,
    pub project_type: Option<String>,
}
