-- Test migration to verify GitHub Actions setup
-- This is a safe operation that won't break anything

ALTER TABLE users ADD COLUMN IF NOT EXISTS test_column TEXT DEFAULT 'test';

-- Add a comment to the table
COMMENT ON COLUMN users.test_column IS 'Test column for GitHub Actions validation'; 