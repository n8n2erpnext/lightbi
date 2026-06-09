-- Migration for Data View Layer

CREATE TABLE data_views (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    runtime_dataset_id TEXT NOT NULL REFERENCES runtime_datasets(id) ON DELETE CASCADE,
    view_type TEXT NOT NULL, -- e.g., 'TimeSeries', 'Category'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_view_fields (
    view_id TEXT NOT NULL REFERENCES data_views(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    role TEXT NOT NULL, -- e.g., 'X-Axis', 'Y-Axis'
    PRIMARY KEY (view_id, field_name)
);

CREATE TABLE view_versions (
    view_id TEXT NOT NULL REFERENCES data_views(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (view_id, version)
);
