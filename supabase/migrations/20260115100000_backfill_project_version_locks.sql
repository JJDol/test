-- Backfill existing projects with version 1 locks for all their templates
-- This ensures existing projects stay on the original template versions they were using

-- Create a function to build version locks JSON from project template arrays
CREATE OR REPLACE FUNCTION build_version_locks_for_project(
  arch_templates TEXT[],
  const_templates TEXT[],
  fire_templates TEXT[],
  auth_templates TEXT[],
  energy_templates TEXT[],
  hvac_templates TEXT[],
  exec_templates TEXT[]
) RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}'::jsonb;
  template_name TEXT;
BEGIN
  -- Process each category's templates
  IF arch_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY arch_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  IF const_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY const_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  IF fire_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY fire_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  IF auth_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY auth_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  IF energy_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY energy_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  IF hvac_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY hvac_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  IF exec_templates IS NOT NULL THEN
    FOREACH template_name IN ARRAY exec_templates LOOP
      result := result || jsonb_build_object(template_name, 1);
    END LOOP;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update all existing projects with version locks
UPDATE "public"."projects"
SET template_version_locks = build_version_locks_for_project(
  architecture_templates,
  constructions_templates,
  fire_templates,
  authority_processing_templates,
  energy_templates,
  hvac_templates,
  execution_control_templates
)
WHERE template_version_locks IS NULL
   OR template_version_locks = '{}'::jsonb;

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS build_version_locks_for_project;

-- Add comment
COMMENT ON COLUMN "public"."projects"."template_version_locks" IS 'Maps template names to locked version numbers. Projects stay on locked versions until explicitly upgraded.';
