-- Migration: Add phase and category variable management to projects
-- This is the start for the phase and category variable management system

-- Add only the NEW columns
ALTER TABLE projects 
ADD COLUMN category_variables JSONB DEFAULT '{}', 
ADD COLUMN global_variables JSONB DEFAULT '{}',
ADD COLUMN phase VARCHAR(50) DEFAULT 'Phase 1',
ADD COLUMN previous_phase_vars JSONB DEFAULT NULL;

-- Add indexes for performance (only for new columns)
CREATE INDEX idx_projects_category_variables ON projects USING GIN (category_variables);
CREATE INDEX idx_projects_global_variables ON projects USING GIN (global_variables);
CREATE INDEX idx_projects_phase ON projects (phase);

-- Add check constraint for phase values
ALTER TABLE projects 
ADD CONSTRAINT chk_projects_phase 
CHECK (phase IN ('Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6'));

-- Add comments for the new columns
COMMENT ON COLUMN projects.category_variables IS 'Variables that appear in multiple documents within the same category';
COMMENT ON COLUMN projects.global_variables IS 'Variables that span across multiple categories with their values and scope';
COMMENT ON COLUMN projects.phase IS 'Current project phase';
COMMENT ON COLUMN projects.previous_phase_vars IS 'Backup of template_variables from the previous phase';