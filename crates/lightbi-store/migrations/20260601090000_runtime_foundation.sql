-- Migration for Runtime Foundation

CREATE TABLE runtime_executions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    execution_plan_id TEXT NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
    backend_type TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT NOT NULL -- e.g., 'Running', 'Success', 'Failed'
);

CREATE TABLE execution_statistics (
    execution_id TEXT NOT NULL REFERENCES runtime_executions(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    PRIMARY KEY (execution_id, metric_name)
);
