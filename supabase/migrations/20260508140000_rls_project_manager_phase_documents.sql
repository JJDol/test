-- Align phase / phase-document INSERT RLS with "Project managers can manage company projects".
-- Without this, a PROJECT_MANAGER can create a project row (+ trigger-created P1) but
-- inserting project_phases (extra phases) or project_phase_documents can be denied,
-- so the detail page shows no documents.

BEGIN;

DROP POLICY IF EXISTS "project_phases_insert_leader_or_admin" ON public.project_phases;
CREATE POLICY "project_phases_insert_leader_or_admin"
  ON public.project_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_phases.project_id
        AND p.company_id = public.get_current_user_company_id()
        AND (
          p.leader_id = auth.uid()
          OR public.check_if_admin()
          OR public.check_if_project_manager()
        )
    )
  );

DROP POLICY IF EXISTS "project_phase_documents_insert_company" ON public.project_phase_documents;
CREATE POLICY "project_phase_documents_insert_company"
  ON public.project_phase_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_phases pp
      INNER JOIN public.projects p ON p.id = pp.project_id
      WHERE pp.id = project_phase_documents.project_phase_id
        AND p.company_id = public.get_current_user_company_id()
        AND (
          p.leader_id = auth.uid()
          OR public.check_if_admin()
          OR auth.uid() = ANY (p.workers)
          OR public.check_if_project_manager()
        )
    )
  );

COMMIT;
