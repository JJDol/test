-- Template Versioning System Migration
-- Adds version tracking for document templates

-- Add current_version column to document_templates
ALTER TABLE "public"."document_templates"
  ADD COLUMN IF NOT EXISTS "current_version" INTEGER DEFAULT 1;

-- Create template_versions table to store version history
CREATE TABLE IF NOT EXISTS "public"."template_versions" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "template_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_file_name" TEXT,
    "variables" JSONB DEFAULT '[]'::jsonb,
    "changes_summary" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    "created_by" UUID,
    "company_id" UUID NOT NULL,

    CONSTRAINT "template_versions_template_name_fkey"
      FOREIGN KEY ("template_name")
      REFERENCES "public"."document_templates"("name")
      ON DELETE CASCADE,
    CONSTRAINT "template_versions_created_by_fkey"
      FOREIGN KEY ("created_by")
      REFERENCES "public"."users"("id")
      ON DELETE SET NULL,
    CONSTRAINT "template_versions_company_id_fkey"
      FOREIGN KEY ("company_id")
      REFERENCES "public"."companies"("id")
      ON DELETE CASCADE,
    CONSTRAINT "template_versions_unique_version"
      UNIQUE ("template_name", "version")
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "template_versions_template_name_idx"
  ON "public"."template_versions" ("template_name");
CREATE INDEX IF NOT EXISTS "template_versions_company_id_idx"
  ON "public"."template_versions" ("company_id");

-- Add template_version_locks to projects for tracking which version each project uses
ALTER TABLE "public"."projects"
  ADD COLUMN IF NOT EXISTS "template_version_locks" JSONB DEFAULT '{}'::jsonb;

-- Comment on new columns and table
COMMENT ON TABLE "public"."template_versions" IS 'Stores version history for document templates';
COMMENT ON COLUMN "public"."template_versions"."version" IS 'Version number (1, 2, 3, etc.)';
COMMENT ON COLUMN "public"."template_versions"."changes_summary" IS 'Summary of changes: {added: [], removed: [], modified: []}';
COMMENT ON COLUMN "public"."document_templates"."current_version" IS 'Current active version number';
COMMENT ON COLUMN "public"."projects"."template_version_locks" IS 'Maps template names to locked version numbers: {"templateName": 1}';

-- Enable RLS on template_versions
ALTER TABLE "public"."template_versions" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_versions
-- Users can view versions for templates in their company
CREATE POLICY "Users can view company template versions"
  ON "public"."template_versions"
  FOR SELECT
  USING (company_id = get_current_user_company_id());

-- Only admins and managers can create new versions
CREATE POLICY "Admins and managers can create template versions"
  ON "public"."template_versions"
  FOR INSERT
  WITH CHECK (
    company_id = get_current_user_company_id()
    AND check_if_manager_or_admin()
  );

-- Only admins can delete versions
CREATE POLICY "Admins can delete template versions"
  ON "public"."template_versions"
  FOR DELETE
  USING (
    company_id = get_current_user_company_id()
    AND check_if_admin()
  );

-- Migrate existing templates to have version 1 in template_versions
-- This creates initial version records for all existing templates
INSERT INTO "public"."template_versions" (
  template_name,
  version,
  file_name,
  original_file_name,
  variables,
  company_id,
  created_at
)
SELECT
  name,
  1,
  file_name,
  original_file_name,
  variables,
  company_id,
  created_at
FROM "public"."document_templates"
WHERE file_name IS NOT NULL
ON CONFLICT (template_name, version) DO NOTHING;
