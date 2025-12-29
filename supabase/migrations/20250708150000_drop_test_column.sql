-- Drop the test column that was added for GitHub Actions testing
-- Using IF EXISTS to make this migration idempotent
ALTER TABLE public.users DROP COLUMN IF EXISTS test_column;
