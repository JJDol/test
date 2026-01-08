DROP TABLE IF EXISTS "public"."document_default_variables";

CREATE TABLE IF NOT EXISTS "public"."document_default_variables" ( 
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- No company_id: shared across all companies
  category text NOT NULL,
  document_type text NOT NULL,
  description text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- To avoid duplicates per category + document_type
CREATE UNIQUE INDEX document_default_variables_unique 
  ON "public"."document_default_variables" (category, document_type);