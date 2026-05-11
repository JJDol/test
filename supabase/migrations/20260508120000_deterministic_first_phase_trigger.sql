-- Pick a single display_order=1 phase definition deterministically so the
-- auto-created project_phases row always matches API / wizard expectations when
-- duplicate misconfiguration exists (multiple enabled rows at display_order=1).

BEGIN;

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
  ORDER BY pd.id
  LIMIT 1;

  IF first_definition_id IS NULL THEN
    RAISE EXCEPTION
      'Cannot auto-create first project phase: company % has no enabled phase_definitions row at display_order = 1',
      NEW.company_id;
  END IF;

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

COMMIT;
