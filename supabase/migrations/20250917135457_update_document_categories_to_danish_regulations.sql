-- Update document categories to match Danish construction industry standards
-- Migration: Create enum and update document categories

-- 1. Create the new enum with the Danish-aligned English categories
CREATE TYPE document_category AS ENUM (
  'ARCHITECTURE',
  'CONSTRUCTIONS', 
  'FIRE',
  'AUTHORITY_PROCESSING',
  'ENERGY',
  'HVAC',
  'EXECUTION_CONTROL'
);

-- 2. Update data in all relevant tables to use new values
UPDATE document_templates SET category = 
  CASE
    WHEN category = 'CONSTRUCTION' THEN 'CONSTRUCTIONS'
    WHEN category = 'FIRE_SAFETY' THEN 'FIRE'
    WHEN category = 'PLUMBING' THEN 'HVAC'
    WHEN category = 'ELECTRICAL' THEN 'ENERGY'
    WHEN category = 'VENTILATION' THEN 'HVAC'
    WHEN category = 'ENERGY' THEN 'ENERGY'
    WHEN category = 'DOCUMENTATION' THEN 'EXECUTION_CONTROL'
    ELSE 'ARCHITECTURE' -- Default fallback
  END;

UPDATE project_templates SET category = 
  CASE
    WHEN category = 'CONSTRUCTION' THEN 'CONSTRUCTIONS'
    WHEN category = 'FIRE_SAFETY' THEN 'FIRE'
    WHEN category = 'PLUMBING' THEN 'HVAC'
    WHEN category = 'ELECTRICAL' THEN 'ENERGY'
    WHEN category = 'VENTILATION' THEN 'HVAC'
    WHEN category = 'ENERGY' THEN 'ENERGY'
    WHEN category = 'DOCUMENTATION' THEN 'EXECUTION_CONTROL'
    ELSE 'ARCHITECTURE' -- Default fallback
  END;

-- 3. Alter the category columns to use the new enum type
ALTER TABLE document_templates 
  ALTER COLUMN category TYPE document_category 
  USING category::document_category;

ALTER TABLE project_templates 
  ALTER COLUMN category TYPE document_category 
  USING category::document_category;

-- 4. Rename columns to match new categories
ALTER TABLE projects RENAME COLUMN construction_templates TO constructions_templates;
ALTER TABLE projects RENAME COLUMN fire_safety_templates TO fire_templates;
ALTER TABLE projects RENAME COLUMN plumbing_templates TO hvac_templates;
ALTER TABLE projects RENAME COLUMN documentation_templates TO execution_control_templates;
-- ARCHITECTURE and ENERGY columns can stay as is

-- 5. Handle the electrical_templates to energy_templates merge
-- First, merge electrical_templates into energy_templates
UPDATE projects 
SET energy_templates = energy_templates || electrical_templates 
WHERE electrical_templates IS NOT NULL AND array_length(electrical_templates, 1) > 0;

-- Then drop the electrical_templates column
ALTER TABLE projects DROP COLUMN electrical_templates;

-- 6. Handle the ventilation_templates to hvac_templates merge
-- First, merge ventilation_templates into hvac_templates
UPDATE projects 
SET hvac_templates = hvac_templates || ventilation_templates 
WHERE ventilation_templates IS NOT NULL AND array_length(ventilation_templates, 1) > 0;

-- Then drop the ventilation_templates column
ALTER TABLE projects DROP COLUMN ventilation_templates;

-- 7. Add the new column for authority processing if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'authority_processing_templates') THEN
        ALTER TABLE projects ADD COLUMN authority_processing_templates text[] DEFAULT '{}'::text[];
    END IF;
END $$;
