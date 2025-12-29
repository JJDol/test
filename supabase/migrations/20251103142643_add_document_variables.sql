-- In case a prior iteration created document-scoped variables, drop it safely
DROP TABLE IF EXISTS "public"."document_variables";

CREATE TABLE IF NOT EXISTS "public"."document_category_variables" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "company_id" "uuid" NOT NULL,
  "category" "text" NOT NULL,
  "variables" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."document_category_variables" OWNER TO "postgres";

-- Primary keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_category_variables_pkey'
      AND conrelid = 'public.document_category_variables'::regclass
  ) THEN
    ALTER TABLE ONLY "public"."document_category_variables"
      ADD CONSTRAINT "document_category_variables_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_category_variables_company_id_fkey'
      AND conrelid = 'public.document_category_variables'::regclass
  ) THEN
    ALTER TABLE ONLY "public"."document_category_variables"
      ADD CONSTRAINT "document_category_variables_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_category_variables_created_by_fkey'
      AND conrelid = 'public.document_category_variables'::regclass
  ) THEN
    -- No per-user ownership; keep block for idempotency if earlier drafts existed
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_document_category_variables_company_id" ON "public"."document_category_variables" USING "btree" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_document_category_variables_category" ON "public"."document_category_variables" USING "btree" ("category");

-- Trigger to keep updated_at fresh
CREATE OR REPLACE TRIGGER "update_document_category_variables_updated_at"
  BEFORE UPDATE ON "public"."document_category_variables"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'document_category_variables'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE "public"."document_category_variables" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- for view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_category_variables'
      AND policyname = 'Users can view company category variables'
  ) THEN
    CREATE POLICY "Users can view company category variables" ON "public"."document_category_variables"
      FOR SELECT USING (("company_id" = ( SELECT "users"."company_id" FROM "public"."users" WHERE ("users"."id" = "auth"."uid"()))));
  END IF;
END $$;

-- for insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_category_variables'
      AND policyname = 'Admins or managers can insert company category variables'
  ) THEN
    CREATE POLICY "Admins or managers can insert company category variables" ON "public"."document_category_variables"
      FOR INSERT WITH CHECK (("company_id" = "public"."get_current_user_company_id"()) AND ("public"."check_if_admin"() OR "public"."check_if_project_manager"()));
  END IF;
END $$;

-- for update
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_category_variables'
      AND policyname = 'Admins or managers can update company category variables'
  ) THEN
    CREATE POLICY "Admins or managers can update company category variables" ON "public"."document_category_variables"
      FOR UPDATE USING (("company_id" = "public"."get_current_user_company_id"()) AND ("public"."check_if_admin"() OR "public"."check_if_project_manager"()))
      WITH CHECK (("company_id" = "public"."get_current_user_company_id"()) AND ("public"."check_if_admin"() OR "public"."check_if_project_manager"()));
  END IF;
END $$;


-- for delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_category_variables'
      AND policyname = 'Admins or managers can delete company category variables'
  ) THEN
    CREATE POLICY "Admins or managers can delete company category variables" ON "public"."document_category_variables"
      FOR DELETE USING (("company_id" = "public"."get_current_user_company_id"()) AND ("public"."check_if_admin"() OR "public"."check_if_project_manager"()));
  END IF;
END $$;

-- Grants (align with existing broad grants)
GRANT ALL ON TABLE "public"."document_category_variables" TO "anon";
GRANT ALL ON TABLE "public"."document_category_variables" TO "authenticated";
GRANT ALL ON TABLE "public"."document_category_variables" TO "service_role";

RESET ALL;


