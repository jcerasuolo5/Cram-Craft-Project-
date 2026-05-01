-- Add new columns to study_sessions table for session stats tracking
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS easy_count INTEGER DEFAULT 0;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS good_count INTEGER DEFAULT 0;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS hard_count INTEGER DEFAULT 0;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS again_count INTEGER DEFAULT 0;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS total_cards INTEGER DEFAULT 0;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS test_date_id INTEGER REFERENCES test_dates(id) ON DELETE SET NULL;