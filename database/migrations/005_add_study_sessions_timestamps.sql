-- Add created_at timestamp to study_sessions
-- Previously missing, causing sorts to rely on UUID ordering (which has no chronological guarantee)

ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL;
