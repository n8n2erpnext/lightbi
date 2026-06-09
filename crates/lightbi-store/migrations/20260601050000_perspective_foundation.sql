-- Migration for Perspective Layer

-- Drop old JSON payload version from Phase 11
DROP TABLE IF EXISTS perspectives;

CREATE TABLE perspectives (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    perspective_name TEXT NOT NULL,
    perspective_type TEXT NOT NULL, -- 'Business', 'Role', 'Custom'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perspective_dataset_links (
    perspective_id TEXT NOT NULL REFERENCES perspectives(id) ON DELETE CASCADE,
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    PRIMARY KEY (perspective_id, dataset_id)
);

CREATE TABLE perspective_semantic_links (
    perspective_id TEXT NOT NULL REFERENCES perspectives(id) ON DELETE CASCADE,
    semantic_field_id TEXT NOT NULL REFERENCES semantic_fields(id) ON DELETE CASCADE,
    PRIMARY KEY (perspective_id, semantic_field_id)
);
