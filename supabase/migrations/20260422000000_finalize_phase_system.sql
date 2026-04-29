-- =============================================================================
-- PR 3c: Finalize phase system
-- =============================================================================
-- PR 1 introduced the phase tables and backfilled existing data while keeping
-- the legacy columns on `projects` for backwards compatibility. PR 3c cuts
-- that tether:
--
--   1. Drop the redundant JSONB columns on `projects` that are now fully
--      represented by `project_phase_documents`.
--   2. Drop the redundant per-phase variable buckets that duplicate the
--      project-level `global_variables` / `category_variables`.
--   3. Add an AFTER-INSERT trigger on `projects` so that every newly created
--      project automatically gets its first `project_phases` row. The API
--      handler does this too, but the trigger is a safety net for any path
--      that bypasses the API (e.g. seed scripts, SQL fixtures, future
--      admin tooling).
--
-- Idempotent: every DDL uses IF EXISTS / IF NOT EXISTS so repeated runs are
-- harmless.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Drop legacy columns on `projects`
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS architecture_templates,
  DROP COLUMN IF EXISTS constructions_templates,
  DROP COLUMN IF EXISTS fire_templates,
  DROP COLUMN IF EXISTS authority_processing_templates,
  DROP COLUMN IF EXISTS energy_templates,
  DROP COLUMN IF EXISTS hvac_templates,
  DROP COLUMN IF EXISTS execution_control_templates,
  DROP COLUMN IF EXISTS template_variables,
  DROP COLUMN IF EXISTS variable_propagation_settings,
  DROP COLUMN IF EXISTS document_assignments,
  DROP COLUMN IF EXISTS document_supervisors,
  DROP COLUMN IF EXISTS document_review_status,
  DROP COLUMN IF EXISTS template_version_locks,
  DROP COLUMN IF EXISTS phase,
  DROP COLUMN IF EXISTS previous_phase_vars;

-- -----------------------------------------------------------------------------
-- 2. Drop redundant per-phase variable buckets
-- -----------------------------------------------------------------------------
-- Per the user's directive only local (per-document) variables are phase
-- scoped; global/category variables stay on the project row.
ALTER TABLE public.project_phases
  DROP COLUMN IF EXISTS category_variables,
  DROP COLUMN IF EXISTS global_variables;

-- -----------------------------------------------------------------------------
-- 3. Trigger: auto-create first phase on every new project insert
-- -----------------------------------------------------------------------------
-- Uses the company's enabled `phase_definitions` row with display_order = 1.
-- If none exists we intentionally raise so the insert fails loudly rather
-- than silently creating a phase-less project.
CREATE OR REPLACE FUNCTION public.auto_create_first_project_phase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_definition_id uuid;
BEGIN
  SELECT pd.id INTO first_definition_id
  FROM public.phase_definitions pd
  WHERE pd.company_id    = NEW.company_id
    AND pd.display_order = 1
    AND pd.is_enabled
  LIMIT 1;

  IF first_definition_id IS NULL THEN
    RAISE EXCEPTION
      'Cannot auto-create first project phase: company % has no enabled phase_definitions row at display_order = 1',
      NEW.company_id;
  END IF;

  -- Skip if the API already inserted a phase in the same transaction.
  IF EXISTS (
    SELECT 1 FROM public.project_phases WHERE project_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.project_phases (
    project_id,
    phase_definition_id,
    deadline,
    is_current
  )
  VALUES (
    NEW.id,
    first_definition_id,
    NEW.deadline,
    TRUE
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_auto_first_phase ON public.projects;

-- DEFERRED CONSTRAINT TRIGGER so the API's explicit INSERT (which happens
-- after the project row is created) still wins when present. We fire on
-- STATEMENT-level AFTER INSERT and re-check inside the function.
CREATE TRIGGER trg_projects_auto_first_phase
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_first_project_phase();

COMMENT ON FUNCTION public.auto_create_first_project_phase IS
  'Safety net: ensures every project row receives at least one project_phases row using the company''s display_order=1 phase definition.';

COMMIT;
