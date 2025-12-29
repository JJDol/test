-- Add company_id to password_reset_tokens table for tenant isolation
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create index for company_id lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_company_id ON password_reset_tokens(company_id);

-- Update RLS policy to include company isolation
DROP POLICY IF EXISTS "Users can only access their own reset tokens" ON password_reset_tokens;

CREATE POLICY "Users can only access their own reset tokens" ON password_reset_tokens
  FOR ALL USING (
    user_id = auth.uid() OR 
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  ); 