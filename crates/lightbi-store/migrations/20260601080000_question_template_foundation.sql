-- Migration for Question Template Layer

-- Drop the old questions table from phase 11 which held unstructured json
DROP TABLE IF EXISTS questions;

CREATE TABLE question_templates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL, -- e.g., 'TopN', 'Trend', 'Ranking'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE template_parameters (
    template_id TEXT NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    parameter_type TEXT NOT NULL,
    PRIMARY KEY (template_id, parameter_name)
);

CREATE TABLE template_versions (
    template_id TEXT NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (template_id, version)
);
