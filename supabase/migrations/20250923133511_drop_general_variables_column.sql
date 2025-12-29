-- Removing general_variables column because we are using global_variables instead
ALTER TABLE projects DROP COLUMN IF EXISTS general_variables;
