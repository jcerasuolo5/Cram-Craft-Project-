-- Create table for saved flashcard sets
CREATE TABLE flashcard_sets (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  notes TEXT NOT NULL,
  test_date_id INTEGER REFERENCES test_dates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;

-- Policies for flashcard_sets
CREATE POLICY "Users can view their own flashcard sets" ON flashcard_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard sets" ON flashcard_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sets" ON flashcard_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sets" ON flashcard_sets
  FOR DELETE USING (auth.uid() = user_id);

-- Add test_date_id column to study_sessions if not exists
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS test_date_id INTEGER REFERENCES test_dates(id) ON DELETE SET NULL;