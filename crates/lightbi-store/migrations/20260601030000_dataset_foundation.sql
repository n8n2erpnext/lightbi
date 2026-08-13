-- Migration for Dataset Foundation & Lineage Tracking

-- Drop the old datasets table from initial schema and recreate it with correct boundaries
DROP TABLE IF EXISTS datasets;

CREATE TABLE datasets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dataset_name TEXT NOT NULL,
    dataset_type TEXT NOT NULL, -- 'SourceDataset', 'VirtualDataset', 'DerivedDataset'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tracks dataset lineage explicitly (Dataset -> Dataset)
CREATE TABLE dataset_dependencies (
    parent_dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    child_dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_dataset_id, child_dataset_id)
);

-- Maps a dataset to the physical sources it requires
CREATE TABLE dataset_source_links (
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (dataset_id, source_id)
);
