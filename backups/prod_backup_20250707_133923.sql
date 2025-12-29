

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."document_category" AS ENUM (
    'ARCHITECTURE',
    'CONSTRUCTION',
    'FIRE_SAFETY',
    'PLUMBING',
    'ELECTRICAL',
    'VENTILATION',
    'ENERGY',
    'DOCUMENTATION'
);


ALTER TYPE "public"."document_category" OWNER TO "postgres";


CREATE TYPE "public"."project_stage" AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'REVIEW',
    'DONE'
);


ALTER TYPE "public"."project_stage" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'ADMIN',
    'OWNER',
    'PROJECT_MANAGER',
    'USER'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_if_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  );
END;
$$;


ALTER FUNCTION "public"."check_if_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_if_admin"() IS 'Security definer function to check if the current user is an admin';



CREATE OR REPLACE FUNCTION "public"."check_if_project_manager"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.uid()::text AND users.role = 'PROJECT_MANAGER'
  );
END;
$$;


ALTER FUNCTION "public"."check_if_project_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_if_project_member"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE 
      leader_id::text = auth.uid()::text OR
      auth.uid()::text = ANY(SELECT unnest(workers)::text) OR
      EXISTS (
        SELECT 1 FROM jsonb_each(document_assignments) AS assignments
        WHERE (assignments.value->>'supervisor_id')::text = auth.uid()::text
      )
  );
END;
$$;


ALTER FUNCTION "public"."check_if_project_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_is_admin"() RETURNS TABLE("is_admin" boolean, "current_user_id" "uuid", "user_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT role = 'ADMIN' FROM users WHERE id = auth.uid()), false),
    auth.uid(),
    COALESCE((SELECT role::text FROM users WHERE id = auth.uid()), 'no role found');
END;
$$;


ALTER FUNCTION "public"."debug_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.role = 'ADMIN'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_authorized_user"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the current user is authorized
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_authorized = true
  );
END;
$$;


ALTER FUNCTION "public"."is_authorized_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_leader"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects 
        WHERE leader_id = auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."is_project_leader"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_project_workers"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if all workers exist in the users table
  IF NEW.workers IS NOT NULL AND array_length(NEW.workers, 1) > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(NEW.workers) AS worker_id
      LEFT JOIN users ON users.id = worker_id
      WHERE users.id IS NULL
    ) THEN
      RAISE EXCEPTION 'All workers must exist in the users table';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_project_workers"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."document_templates" (
    "name" "text" NOT NULL,
    "category" "public"."document_category" NOT NULL,
    "variables" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "description" "text",
    "file_name" "text",
    "original_file_name" "text",
    "is_public" boolean DEFAULT true,
    "user_id" "uuid",
    "variables_config" "jsonb"
);


ALTER TABLE "public"."document_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."document_templates" IS 'Stores document templates with their categories and variables';



COMMENT ON COLUMN "public"."document_templates"."name" IS 'Primary key - unique name of the template';



COMMENT ON COLUMN "public"."document_templates"."category" IS 'Category of the template (architecture, construction, etc.)';



COMMENT ON COLUMN "public"."document_templates"."variables" IS 'Array of variable names that will be scanned when the template is uploaded';



COMMENT ON COLUMN "public"."document_templates"."created_at" IS 'Timestamp when the template was created';



COMMENT ON COLUMN "public"."document_templates"."updated_at" IS 'Timestamp when the template was last updated';



COMMENT ON COLUMN "public"."document_templates"."description" IS 'Description of the document template';



COMMENT ON COLUMN "public"."document_templates"."file_name" IS 'Name of the file in storage';



COMMENT ON COLUMN "public"."document_templates"."original_file_name" IS 'Original name of the uploaded file';



COMMENT ON COLUMN "public"."document_templates"."is_public" IS 'Whether the template is public or private';



COMMENT ON COLUMN "public"."document_templates"."user_id" IS 'ID of the user who owns the template if private';



COMMENT ON COLUMN "public"."document_templates"."variables_config" IS 'JSON representation of the full variable configuration including types and default values';



CREATE TABLE IF NOT EXISTS "public"."project_templates" (
    "name" "text" NOT NULL,
    "category" "public"."document_category" NOT NULL,
    "templates" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."project_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_templates" IS 'Stores project templates with their categories and associated document templates';



COMMENT ON COLUMN "public"."project_templates"."name" IS 'Primary key - unique name of the project template';



COMMENT ON COLUMN "public"."project_templates"."category" IS 'Category of the project template (architecture, construction, etc.)';



COMMENT ON COLUMN "public"."project_templates"."templates" IS 'Array of document template names that are part of this project template';



COMMENT ON COLUMN "public"."project_templates"."created_at" IS 'Timestamp when the project template was created';



COMMENT ON COLUMN "public"."project_templates"."updated_at" IS 'Timestamp when the project template was last updated';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "progress" integer DEFAULT 0,
    "leader_id" "uuid" NOT NULL,
    "workers" "uuid"[] DEFAULT '{}'::"uuid"[],
    "deadline" "date" NOT NULL,
    "stage" "public"."project_stage" DEFAULT 'TODO'::"public"."project_stage" NOT NULL,
    "is_archived" boolean DEFAULT false,
    "architecture_templates" "text"[] DEFAULT '{}'::"text"[],
    "construction_templates" "text"[] DEFAULT '{}'::"text"[],
    "fire_safety_templates" "text"[] DEFAULT '{}'::"text"[],
    "plumbing_templates" "text"[] DEFAULT '{}'::"text"[],
    "electrical_templates" "text"[] DEFAULT '{}'::"text"[],
    "ventilation_templates" "text"[] DEFAULT '{}'::"text"[],
    "energy_templates" "text"[] DEFAULT '{}'::"text"[],
    "documentation_templates" "text"[] DEFAULT '{}'::"text"[],
    "template_variables" "jsonb" DEFAULT '{}'::"jsonb",
    "document_assignments" "jsonb" DEFAULT '{}'::"jsonb",
    "document_supervisors" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "location" "text",
    CONSTRAINT "projects_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Stores project information and document assignments';



COMMENT ON COLUMN "public"."projects"."id" IS 'Primary key - unique project identifier';



COMMENT ON COLUMN "public"."projects"."name" IS 'Display name of the project';



COMMENT ON COLUMN "public"."projects"."progress" IS 'Project progress (0-100)';



COMMENT ON COLUMN "public"."projects"."leader_id" IS 'Reference to the project leader in users table';



COMMENT ON COLUMN "public"."projects"."workers" IS 'Array of user IDs assigned to the project';



COMMENT ON COLUMN "public"."projects"."deadline" IS 'Project deadline date';



COMMENT ON COLUMN "public"."projects"."stage" IS 'Current project stage';



COMMENT ON COLUMN "public"."projects"."is_archived" IS 'Whether the project is archived';



COMMENT ON COLUMN "public"."projects"."architecture_templates" IS 'Array of architecture template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."construction_templates" IS 'Array of construction template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."fire_safety_templates" IS 'Array of fire safety template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."plumbing_templates" IS 'Array of plumbing template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."electrical_templates" IS 'Array of electrical template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."ventilation_templates" IS 'Array of ventilation template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."energy_templates" IS 'Array of energy template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."documentation_templates" IS 'Array of documentation template names assigned to the project';



COMMENT ON COLUMN "public"."projects"."template_variables" IS 'JSON storing template variables for each document';



COMMENT ON COLUMN "public"."projects"."document_assignments" IS 'JSON storing document assignments to users';



COMMENT ON COLUMN "public"."projects"."document_supervisors" IS 'JSON storing document supervisor assignments';



COMMENT ON COLUMN "public"."projects"."created_at" IS 'Timestamp when the project was created';



COMMENT ON COLUMN "public"."projects"."updated_at" IS 'Timestamp when the project was last updated';



CREATE SEQUENCE IF NOT EXISTS "public"."projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."projects_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."projects_id_seq" OWNED BY "public"."projects"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'USER'::"public"."user_role" NOT NULL,
    "assigned_projects" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Stores user information and role assignments';



COMMENT ON COLUMN "public"."users"."id" IS 'Primary key - references auth.users';



COMMENT ON COLUMN "public"."users"."name" IS 'Full name of the user';



COMMENT ON COLUMN "public"."users"."email" IS 'Email address of the user (unique)';



COMMENT ON COLUMN "public"."users"."role" IS 'Role of the user (admin, owner, project_manager, user)';



COMMENT ON COLUMN "public"."users"."assigned_projects" IS 'Array of project names that the user is assigned to';



COMMENT ON COLUMN "public"."users"."created_at" IS 'Timestamp when the user record was created';



COMMENT ON COLUMN "public"."users"."updated_at" IS 'Timestamp when the user record was last updated';



ALTER TABLE ONLY "public"."projects" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."projects_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."project_templates"
    ADD CONSTRAINT "project_templates_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_document_templates_is_public" ON "public"."document_templates" USING "btree" ("is_public");



CREATE INDEX "idx_document_templates_user_id" ON "public"."document_templates" USING "btree" ("user_id");



CREATE INDEX "idx_document_templates_variables_config" ON "public"."document_templates" USING "gin" ("variables_config");



CREATE INDEX "idx_projects_archived" ON "public"."projects" USING "btree" ("is_archived");



CREATE INDEX "idx_projects_deadline" ON "public"."projects" USING "btree" ("deadline");



CREATE INDEX "idx_projects_document_assignments" ON "public"."projects" USING "gin" ("document_assignments");



CREATE INDEX "idx_projects_document_supervisors" ON "public"."projects" USING "gin" ("document_supervisors");



CREATE INDEX "idx_projects_leader" ON "public"."projects" USING "btree" ("leader_id");



CREATE INDEX "idx_projects_stage" ON "public"."projects" USING "btree" ("stage");



CREATE INDEX "idx_projects_template_variables" ON "public"."projects" USING "gin" ("template_variables");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "update_document_templates_updated_at" BEFORE UPDATE ON "public"."document_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_templates_updated_at" BEFORE UPDATE ON "public"."project_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_workers" BEFORE INSERT OR UPDATE OF "workers" ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."validate_project_workers"();



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin full access to document templates" ON "public"."document_templates" TO "authenticated" USING ("public"."check_if_admin"()) WITH CHECK ("public"."check_if_admin"());



CREATE POLICY "Admin full access to project templates" ON "public"."project_templates" TO "authenticated" USING ("public"."check_if_admin"()) WITH CHECK ("public"."check_if_admin"());



CREATE POLICY "Admin full access to projects" ON "public"."projects" TO "authenticated" USING ("public"."check_if_admin"()) WITH CHECK ("public"."check_if_admin"());



CREATE POLICY "Admin full access to users" ON "public"."users" TO "authenticated" USING ("public"."check_if_admin"()) WITH CHECK ("public"."check_if_admin"());



COMMENT ON POLICY "Admin full access to users" ON "public"."users" IS 'Allows admin users to perform all operations on users table';



CREATE POLICY "Any authenticated user can manage public templates" ON "public"."document_templates" TO "authenticated" USING (("is_public" = true)) WITH CHECK (("is_public" = true));



CREATE POLICY "Project managers access to document templates" ON "public"."document_templates" TO "authenticated" USING ("public"."check_if_project_manager"()) WITH CHECK ("public"."check_if_project_manager"());



CREATE POLICY "Project managers access to project templates" ON "public"."project_templates" TO "authenticated" USING ("public"."check_if_project_manager"()) WITH CHECK ("public"."check_if_project_manager"());



CREATE POLICY "Users can manage their own private templates" ON "public"."document_templates" TO "authenticated" USING ((("is_public" = false) AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("is_public" = false) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view own row" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."check_if_admin"()));



COMMENT ON POLICY "Users can view own row" ON "public"."users" IS 'Allows users to view their own user data';



ALTER TABLE "public"."document_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leaders_update_project_workers" ON "public"."users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE ("projects"."leader_id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE ("projects"."leader_id" = "auth"."uid"()))));



CREATE POLICY "project_managers_access_projects" ON "public"."projects" TO "authenticated" USING (("public"."check_if_project_manager"() AND "public"."check_if_project_member"())) WITH CHECK ("public"."check_if_project_manager"());



CREATE POLICY "project_managers_read_users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."check_if_project_manager"());



CREATE POLICY "project_managers_update_users" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."check_if_project_manager"()) WITH CHECK ("public"."check_if_project_manager"());



ALTER TABLE "public"."project_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_manage_document_templates" ON "public"."document_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "users_manage_project_templates" ON "public"."project_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "users_update_assigned_projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "leader_id") OR ("auth"."uid"() = ANY ("workers")))) WITH CHECK ((("auth"."uid"() = "leader_id") OR ("auth"."uid"() = ANY ("workers"))));



CREATE POLICY "users_view_all_users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users_view_projects" ON "public"."projects" FOR SELECT TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";























































































































































































GRANT ALL ON FUNCTION "public"."check_if_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_if_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_if_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_if_project_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_if_project_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_if_project_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_if_project_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_if_project_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_if_project_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_authorized_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_authorized_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authorized_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_leader"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_leader"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_leader"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_project_workers"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_project_workers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_project_workers"() TO "service_role";



























GRANT ALL ON TABLE "public"."document_templates" TO "anon";
GRANT ALL ON TABLE "public"."document_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."document_templates" TO "service_role";



GRANT ALL ON TABLE "public"."project_templates" TO "anon";
GRANT ALL ON TABLE "public"."project_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."project_templates" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
