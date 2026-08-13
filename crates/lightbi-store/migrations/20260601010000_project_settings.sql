-- Migration for project runtime settings

CREATE TABLE project_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note: The original 'settings' table created in the previous phase 
-- can be used for global app settings, while 'project_settings' is scoped explicitly
-- to this specific active workspace environment (e.g. locale, timezone, default_perspective).
