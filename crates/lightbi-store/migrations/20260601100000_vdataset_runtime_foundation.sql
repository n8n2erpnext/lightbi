-- Migration for Virtual Dataset Runtime & Materialization Foundation

CREATE TABLE runtime_datasets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_execution_id TEXT NOT NULL REFERENCES runtime_executions(id) ON DELETE CASCADE,
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    refresh_strategy TEXT NOT NULL, -- e.g., 'Manual', 'Incremental', 'Scheduled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dataset_refresh_history (
    runtime_dataset_id TEXT NOT NULL REFERENCES runtime_datasets(id) ON DELETE CASCADE,
    refresh_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    refresh_type TEXT NOT NULL, -- e.g., 'Full', 'Incremental'
    status TEXT NOT NULL,
    PRIMARY KEY (runtime_dataset_id, refresh_time)
);

CREATE TABLE dataset_cache_entries (
    runtime_dataset_id TEXT NOT NULL REFERENCES runtime_datasets(id) ON DELETE CASCADE,
    cache_type TEXT NOT NULL, -- e.g., 'Memory', 'LocalDisk'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    PRIMARY KEY (runtime_dataset_id, cache_type)
);
