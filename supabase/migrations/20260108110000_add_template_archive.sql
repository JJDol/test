-- Add archive functionality to document templates
-- Allows soft-delete instead of permanent deletion

-- Add is_archived column to document_templates
ALTER TABLE "public"."document_templates"
  ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "archived_by" UUID REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Add index for filtering archived templates
CREATE INDEX IF NOT EXISTS "document_templates_is_archived_idx"
  ON "public"."document_templates" ("is_archived");

-- Comment on new columns
COMMENT ON COLUMN "public"."document_templates"."is_archived" IS 'Soft delete flag - archived templates are hidden but preserved';
COMMENT ON COLUMN "public"."document_templates"."archived_at" IS 'Timestamp when template was archived';
COMMENT ON COLUMN "public"."document_templates"."archived_by" IS 'User who archived the template';
