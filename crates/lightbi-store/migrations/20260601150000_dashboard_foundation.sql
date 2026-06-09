-- Migration for Dashboard Layer

CREATE TABLE dashboards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dashboard_name TEXT NOT NULL,
    perspective_id TEXT NOT NULL, -- e.g. 'sales_operations'
    layout_metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dashboard_widgets (
    dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL, -- e.g. 'Chart', 'Insight'
    asset_id TEXT NOT NULL,
    position_metadata TEXT NOT NULL DEFAULT '{}',
    visibility_rules TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (dashboard_id, asset_id)
);

CREATE TABLE dashboard_versions (
    dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (dashboard_id, version)
);
