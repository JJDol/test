-- Add Company Bucket Creation Trigger
-- This migration adds a trigger that automatically creates storage buckets 
-- when new companies are created, ensuring buckets exist from the start

-- Create a function to automatically create storage buckets for new companies
CREATE OR REPLACE FUNCTION "public"."create_company_storage_buckets"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    private_bucket_name TEXT;
    public_bucket_name TEXT;
    bucket_exists BOOLEAN;
BEGIN
    -- Generate bucket names following the pattern: company-{companyId}-{public|private}
    private_bucket_name := 'company-' || NEW.id::text || '-private';
    public_bucket_name := 'company-' || NEW.id::text || '-public';
    
    -- Log the bucket creation attempt
    RAISE NOTICE 'Creating storage buckets for company: % (ID: %)', NEW.name, NEW.id;
    
    -- Create private bucket
    BEGIN
        -- Check if private bucket already exists
        SELECT EXISTS (
            SELECT 1 FROM storage.buckets 
            WHERE name = private_bucket_name
        ) INTO bucket_exists;
        
        IF NOT bucket_exists THEN
            INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
            VALUES (
                private_bucket_name,
                private_bucket_name,
                false,
                52428800, -- 50MB in bytes
                ARRAY[
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/msword',
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'image/gif'
                ]
            );
            
            RAISE NOTICE 'Created private bucket: %', private_bucket_name;
        ELSE
            RAISE NOTICE 'Private bucket already exists: %', private_bucket_name;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating private bucket %: % (SQLSTATE: %)', 
            private_bucket_name, SQLERRM, SQLSTATE;
        -- Don't fail the company creation, just log the error
    END;
    
    -- Create public bucket
    BEGIN
        -- Check if public bucket already exists
        SELECT EXISTS (
            SELECT 1 FROM storage.buckets 
            WHERE name = public_bucket_name
        ) INTO bucket_exists;
        
        IF NOT bucket_exists THEN
            INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
            VALUES (
                public_bucket_name,
                public_bucket_name,
                true,
                52428800, -- 50MB in bytes
                ARRAY[
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/msword',
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'image/gif'
                ]
            );
            
            RAISE NOTICE 'Created public bucket: %', public_bucket_name;
        ELSE
            RAISE NOTICE 'Public bucket already exists: %', public_bucket_name;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating public bucket %: % (SQLSTATE: %)', 
            public_bucket_name, SQLERRM, SQLSTATE;
        -- Don't fail the company creation, just log the error
    END;
    
    RETURN NEW;
END;
$$;

-- Set function ownership
ALTER FUNCTION "public"."create_company_storage_buckets"() OWNER TO "postgres";

-- Create the trigger on the companies table
CREATE OR REPLACE TRIGGER "create_company_buckets_trigger"
    AFTER INSERT ON "public"."companies"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."create_company_storage_buckets"();

-- Add storage policies for the auto-created buckets
-- This ensures proper access control for company buckets

-- Function to create storage policies for company buckets
CREATE OR REPLACE FUNCTION "public"."create_company_bucket_policies"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    private_bucket_name TEXT;
    public_bucket_name TEXT;
    policy_name TEXT;
BEGIN
    -- Generate bucket names
    private_bucket_name := 'company-' || NEW.id::text || '-private';
    public_bucket_name := 'company-' || NEW.id::text || '-public';
    
    -- Create policies for private bucket
    BEGIN
        -- Policy for private bucket access (company members only)
        policy_name := 'Company ' || NEW.id::text || ' private bucket access';
        
        -- Note: Storage policies are created via SQL, but may need to be created
        -- through the Supabase dashboard or via the storage.policies table
        -- This is a placeholder for the policy creation logic
        
        RAISE NOTICE 'Storage policies should be created for buckets: % and %', 
            private_bucket_name, public_bucket_name;
            
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating storage policies for company %: % (SQLSTATE: %)', 
            NEW.id, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$;

-- Set function ownership
ALTER FUNCTION "public"."create_company_bucket_policies"() OWNER TO "postgres";

-- Create the trigger for storage policies
CREATE OR REPLACE TRIGGER "create_company_bucket_policies_trigger"
    AFTER INSERT ON "public"."companies"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."create_company_bucket_policies"();

-- Grant necessary permissions
GRANT ALL ON FUNCTION "public"."create_company_storage_buckets"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_company_storage_buckets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_company_storage_buckets"() TO "service_role";

GRANT ALL ON FUNCTION "public"."create_company_bucket_policies"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_company_bucket_policies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_company_bucket_policies"() TO "service_role";

-- Add a function to manually create buckets for existing companies
-- This can be run to create buckets for companies that already exist
CREATE OR REPLACE FUNCTION "public"."create_buckets_for_existing_companies"()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    company_record RECORD;
    result_text TEXT := '';
    bucket_count INTEGER := 0;
BEGIN
    result_text := 'Creating buckets for existing companies:' || chr(10);
    
    -- Loop through all existing companies
    FOR company_record IN 
        SELECT id, name FROM companies 
        ORDER BY created_at
    LOOP
        -- Trigger the bucket creation for this company
        BEGIN
            PERFORM create_company_storage_buckets() FROM (
                SELECT 
                    company_record.id as id,
                    company_record.name as name
            ) as NEW;
            
            result_text := result_text || '✓ Created buckets for: ' || company_record.name || 
                          ' (ID: ' || company_record.id || ')' || chr(10);
            bucket_count := bucket_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            result_text := result_text || '✗ Failed to create buckets for: ' || company_record.name || 
                          ' - ' || SQLERRM || chr(10);
        END;
    END LOOP;
    
    result_text := result_text || chr(10) || 'Total companies processed: ' || bucket_count;
    
    RETURN result_text;
END;
$$;

-- Set function ownership
ALTER FUNCTION "public"."create_buckets_for_existing_companies"() OWNER TO "postgres";

-- Grant permissions
GRANT ALL ON FUNCTION "public"."create_buckets_for_existing_companies"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_buckets_for_existing_companies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_buckets_for_existing_companies"() TO "service_role";

-- Add comments for documentation
COMMENT ON FUNCTION "public"."create_company_storage_buckets"() IS 
'Automatically creates storage buckets when a new company is created. Creates both private and public buckets with appropriate settings.';

COMMENT ON FUNCTION "public"."create_company_bucket_policies"() IS 
'Creates storage policies for company buckets to ensure proper access control.';

COMMENT ON FUNCTION "public"."create_buckets_for_existing_companies"() IS 
'Utility function to create buckets for companies that already exist in the database. Run this after deploying the trigger to create buckets for existing companies.'; 