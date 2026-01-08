ALTER TABLE document_category_variables
  ADD COLUMN document_type TEXT NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN description TEXT NOT NULL DEFAULT 'UNSPECIFIED';

-- drop the default afterward if I will backfill
ALTER TABLE document_category_variables
  ALTER COLUMN document_type DROP DEFAULT,
  ALTER COLUMN description DROP DEFAULT;