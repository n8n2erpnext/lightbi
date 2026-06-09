-- Migration for Planner Layer

CREATE TABLE execution_plans (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    strategy_type TEXT NOT NULL, -- e.g., 'Pushdown', 'Cache', 'Incremental'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE execution_plan_steps (
    plan_id TEXT NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (plan_id, step_order)
);
