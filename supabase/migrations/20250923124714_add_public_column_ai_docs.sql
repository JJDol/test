-- Add is_public column
ALTER TABLE ai_documents ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Update existing public documents (if any)
UPDATE ai_documents 
SET is_public = true;

-- Add index for performance
CREATE INDEX idx_ai_documents_is_public ON ai_documents(is_public);