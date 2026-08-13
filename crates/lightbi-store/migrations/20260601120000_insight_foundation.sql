-- Migration for Insight Layer

CREATE TABLE insights (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    runtime_dataset_id TEXT NOT NULL REFERENCES runtime_datasets(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- e.g., 'Trend', 'Anomaly'
    confidence REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insight_metrics (
    insight_id TEXT NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    PRIMARY KEY (insight_id, metric_name)
);

CREATE TABLE insight_versions (
    insight_id TEXT NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (insight_id, version)
);
