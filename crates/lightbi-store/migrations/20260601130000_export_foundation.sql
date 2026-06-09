-- Migration for Export Layer

CREATE TABLE export_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL, -- e.g., 'CSV', 'PDF', 'PNG'
    status TEXT NOT NULL, -- e.g., 'Pending', 'Completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE export_artifacts (
    id TEXT PRIMARY KEY,
    export_job_id TEXT NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE artifact_lineage (
    artifact_id TEXT NOT NULL REFERENCES export_artifacts(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- e.g., 'Dataset', 'DataView'
    source_id TEXT NOT NULL,
    PRIMARY KEY (artifact_id, source_type, source_id)
);
