-- Migration for Recipe & Intent Layer

-- Drop old schema version from Phase 11
DROP TABLE IF EXISTS recipes;

CREATE TABLE recipes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    recipe_name TEXT NOT NULL,
    recipe_type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_intents (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    intent_type TEXT NOT NULL, -- 'Aggregation', 'Ranking', etc.
    payload TEXT NOT NULL -- JSON serialized config
);

CREATE TABLE recipe_dependencies (
    parent_recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    child_recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_recipe_id, child_recipe_id)
);
