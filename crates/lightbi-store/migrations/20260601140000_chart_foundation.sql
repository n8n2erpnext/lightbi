-- Migration for Chart Layer

CREATE TABLE charts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data_view_id TEXT NOT NULL REFERENCES data_views(id) ON DELETE CASCADE,
    chart_type TEXT NOT NULL, -- e.g., 'Line', 'Bar'
    theme_metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chart_mappings (
    chart_id TEXT NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    role TEXT NOT NULL, -- e.g., 'X-Axis', 'Color'
    PRIMARY KEY (chart_id, field_name)
);

CREATE TABLE chart_versions (
    chart_id TEXT NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chart_id, version)
);
