-- Migration for Schema Discovery & Semantic Foundation

CREATE TABLE schemas (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    schema_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE columns (
    id TEXT PRIMARY KEY,
    schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    nullable BOOLEAN NOT NULL DEFAULT 1,
    description TEXT
);

CREATE TABLE relationships (
    id TEXT PRIMARY KEY,
    schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    source_column TEXT NOT NULL,
    target_dataset TEXT NOT NULL,
    target_column TEXT NOT NULL,
    relationship_type TEXT NOT NULL -- e.g., '1:N', 'N:1', '1:1'
);

CREATE TABLE semantic_fields (
    id TEXT PRIMARY KEY,
    schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    semantic_type TEXT NOT NULL -- e.g., 'Customer', 'Date', 'Region'
);

CREATE TABLE semantic_measures (
    id TEXT PRIMARY KEY,
    schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    measure_name TEXT NOT NULL,
    aggregation_type TEXT NOT NULL -- e.g., 'SUM', 'COUNT', 'AVG'
);
