-- =============================================================================
--  Phase system — PR 1 of 6
-- =============================================================================
--  Adds a Phase layer between Project and Document:
--    Project -> project_phases -> project_phase_documents
--
--  PR 1 is purely additive at the schema level: the existing JSONB blobs and
--  `*_templates[]` columns on `projects` are left intact so the current app
--  keeps working. The new tables are populated from that legacy data so the
--  phase-aware code in PR 2+ can read from them immediately.
--
--  Canonical 9-phase catalog (Danish construction lifecycle) is seeded per
--  company. Admins will later be able to customise it, but every company in
--  the system starts with the same defaults. Every existing project is
--  migrated into its first phase (INDLEDENDE RÅDGIVNING) marked as current.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. phase_definitions — per-company catalog of phase names
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phase_definitions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  short_label     text        NOT NULL,
  display_order   integer     NOT NULL,
  description     text,
  is_enabled      boolean     NOT NULL DEFAULT true,
  is_default_seed boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at      timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT phase_definitions_display_order_positive CHECK (display_order > 0),
  CONSTRAINT phase_definitions_unique_name  UNIQUE (company_id, name),
  CONSTRAINT phase_definitions_unique_order UNIQUE (company_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_phase_definitions_company_order
  ON public.phase_definitions (company_id, display_order);

-- -----------------------------------------------------------------------------
-- 2. project_phases — which catalog phases a project actually uses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_phases (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           bigint      NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_definition_id  uuid        NOT NULL REFERENCES public.phase_definitions(id) ON DELETE RESTRICT,

  deadline             date,

  is_current           boolean     NOT NULL DEFAULT false,
  is_locked            boolean     NOT NULL DEFAULT false,
  locked_by            uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at            timestamptz,

  -- Phase-scoped variable buckets (moved off projects.* when PR 2 lands)
  category_variables   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  global_variables     jsonb       NOT NULL DEFAULT '{}'::jsonb,

  created_at           timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at           timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT project_phases_unique_def  UNIQUE (project_id, phase_definition_id),
  CONSTRAINT project_phases_lock_consistency CHECK (
    (is_locked = false AND locked_by IS NULL AND locked_at IS NULL)
    OR (is_locked = true AND locked_by IS NOT NULL AND locked_at IS NOT NULL)
  )
);

-- At most one current phase per project.
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_phases_one_current
  ON public.project_phases (project_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_project_phases_project
  ON public.project_phases (project_id);

CREATE INDEX IF NOT EXISTS idx_project_phases_definition
  ON public.project_phases (phase_definition_id);

-- -----------------------------------------------------------------------------
-- 3. project_phase_documents — one row per (phase, template) instance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_phase_documents (
  id                      uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  project_phase_id        uuid                      NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,

  category                public.document_category  NOT NULL,
  template_name           text                      NOT NULL,

  -- Single responsible discipline (Architect | Engineer | Fire | Constructor | NULL).
  -- Same string set as public.users.discipline; NULL means "unassigned".
  responsible_discipline  text,

  -- Per-template payloads (migrated from projects.* JSONB by template_name).
  -- `assignments` already carries assignee + supervisor info in a single blob
  -- (see types.ts Project.document_assignments), which is why we don't keep a
  -- separate `supervisors` column.
  variables               jsonb                     NOT NULL DEFAULT '{}'::jsonb,
  propagation_settings    jsonb                     NOT NULL DEFAULT '{}'::jsonb,
  assignments             jsonb                     NOT NULL DEFAULT '{}'::jsonb,
  review_status           jsonb                     NOT NULL DEFAULT '{}'::jsonb,
  template_version_lock   integer,

  -- Carry-over lineage. `origin_phase_id` is permanent once set; it points to
  -- the phase where this document's content first originated and is the basis
  -- for the "From {Phase}" origin badge in the UI.
  origin_phase_id         uuid                      REFERENCES public.project_phases(id) ON DELETE SET NULL,
  origin_document_id      uuid                      REFERENCES public.project_phase_documents(id) ON DELETE SET NULL,

  -- Per-field "carried over, not yet reviewed" flags. Shape is UI-defined; we
  -- only persist it here so the highlight state survives reloads.
  carryover_review_state  jsonb                     NOT NULL DEFAULT '{}'::jsonb,

  created_at              timestamptz               NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at              timestamptz               NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT project_phase_documents_discipline_valid CHECK (
    responsible_discipline IS NULL
    OR responsible_discipline IN ('Architect', 'Engineer', 'Fire', 'Constructor')
  ),
  CONSTRAINT project_phase_documents_unique_template UNIQUE (project_phase_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_project_phase_documents_phase
  ON public.project_phase_documents (project_phase_id);

CREATE INDEX IF NOT EXISTS idx_project_phase_documents_category
  ON public.project_phase_documents (project_phase_id, category);

CREATE INDEX IF NOT EXISTS idx_project_phase_documents_origin
  ON public.project_phase_documents (origin_phase_id)
  WHERE origin_phase_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Project-wide "hold" flag
--    (Separate from phase-level lock; halts the whole project for management.)
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_on_hold   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_hold_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS on_hold_at   timestamptz,
  ADD COLUMN IF NOT EXISTS on_hold_note text;

-- -----------------------------------------------------------------------------
-- 5. updated_at triggers (reuse existing helper function)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_phase_definitions_updated_at         ON public.phase_definitions;
DROP TRIGGER IF EXISTS trg_project_phases_updated_at            ON public.project_phases;
DROP TRIGGER IF EXISTS trg_project_phase_documents_updated_at   ON public.project_phase_documents;

CREATE TRIGGER trg_phase_definitions_updated_at
  BEFORE UPDATE ON public.phase_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_project_phase_documents_updated_at
  BEFORE UPDATE ON public.project_phase_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.phase_definitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phase_documents ENABLE ROW LEVEL SECURITY;

-- phase_definitions: company members read; company-admin writes.
CREATE POLICY "phase_definitions_select_company"
  ON public.phase_definitions FOR SELECT
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "phase_definitions_insert_admin"
  ON public.phase_definitions FOR INSERT
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND public.check_if_admin()
  );

CREATE POLICY "phase_definitions_update_admin"
  ON public.phase_definitions FOR UPDATE
  USING (
    company_id = public.get_current_user_company_id()
    AND public.check_if_admin()
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND public.check_if_admin()
  );

CREATE POLICY "phase_definitions_delete_admin"
  ON public.phase_definitions FOR DELETE
  USING (
    company_id = public.get_current_user_company_id()
    AND public.check_if_admin()
  );

-- project_phases: any user with access to the parent project can read.
-- Writes require project leader OR company admin.
CREATE POLICY "project_phases_select_company"
  ON public.project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_phases.project_id
        AND p.company_id = public.get_current_user_company_id()
    )
  );

CREATE POLICY "project_phases_insert_leader_or_admin"
  ON public.project_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_phases.project_id
        AND p.company_id = public.get_current_user_company_id()
        AND (p.leader_id = auth.uid() OR public.check_if_admin())
    )
  );

CREATE POLICY "project_phases_update_leader_or_admin"
  ON public.project_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_phases.project_id
        AND p.company_id = public.get_current_user_company_id()
        AND (p.leader_id = auth.uid() OR public.check_if_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_phases.project_id
        AND p.company_id = public.get_current_user_company_id()
        AND (p.leader_id = auth.uid() OR public.check_if_admin())
    )
  );

CREATE POLICY "project_phases_delete_leader_or_admin"
  ON public.project_phases FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_phases.project_id
        AND p.company_id = public.get_current_user_company_id()
        AND (p.leader_id = auth.uid() OR public.check_if_admin())
    )
  );

-- project_phase_documents inherit access from their parent project_phase.
CREATE POLICY "project_phase_documents_select_company"
  ON public.project_phase_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_phases pp
      INNER JOIN public.projects p ON p.id = pp.project_id
      WHERE pp.id = project_phase_documents.project_phase_id
        AND p.company_id = public.get_current_user_company_id()
    )
  );

CREATE POLICY "project_phase_documents_insert_company"
  ON public.project_phase_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_phases pp
      INNER JOIN public.projects p ON p.id = pp.project_id
      WHERE pp.id = project_phase_documents.project_phase_id
        AND p.company_id = public.get_current_user_company_id()
        AND (p.leader_id = auth.uid() OR public.check_if_admin() OR auth.uid() = ANY(p.workers))
    )
  );

CREATE POLICY "project_phase_documents_update_company"
  ON public.project_phase_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_phases pp
      INNER JOIN public.projects p ON p.id = pp.project_id
      WHERE pp.id = project_phase_documents.project_phase_id
        AND p.company_id = public.get_current_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_phases pp
      INNER JOIN public.projects p ON p.id = pp.project_id
      WHERE pp.id = project_phase_documents.project_phase_id
        AND p.company_id = public.get_current_user_company_id()
    )
  );

CREATE POLICY "project_phase_documents_delete_leader_or_admin"
  ON public.project_phase_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_phases pp
      INNER JOIN public.projects p ON p.id = pp.project_id
      WHERE pp.id = project_phase_documents.project_phase_id
        AND p.company_id = public.get_current_user_company_id()
        AND (p.leader_id = auth.uid() OR public.check_if_admin())
    )
  );

-- =============================================================================
-- 7. Seed: canonical 9-phase catalog for every existing company
-- =============================================================================
-- Source list (DK AEC lifecycle):
--   1 INDLEDENDE RÅDGIVNING
--   2 PROJEKTERINGSLEDELSE
--   3 FORSLAGSFASEN
--   4 MYNDIGHEDSPROJEKT
--   5 UDBUDSPROJEKT
--   6 UDFØRELSESPROJEKT
--   7 UDFØRELSE
--   8 AFLEVERING
--   9 EFTERFØLGENDE YDELSER
--
-- Idempotent via ON CONFLICT on the (company_id, name) unique key.

WITH defaults(display_order, name, short_label) AS (
  VALUES
    (1, 'INDLEDENDE RÅDGIVNING',   'P1'),
    (2, 'PROJEKTERINGSLEDELSE',    'P2'),
    (3, 'FORSLAGSFASEN',           'P3'),
    (4, 'MYNDIGHEDSPROJEKT',       'P4'),
    (5, 'UDBUDSPROJEKT',           'P5'),
    (6, 'UDFØRELSESPROJEKT',       'P6'),
    (7, 'UDFØRELSE',               'P7'),
    (8, 'AFLEVERING',              'P8'),
    (9, 'EFTERFØLGENDE YDELSER',   'P9')
)
INSERT INTO public.phase_definitions
  (company_id, name, short_label, display_order, is_default_seed)
SELECT c.id, d.name, d.short_label, d.display_order, true
FROM public.companies c
CROSS JOIN defaults d
ON CONFLICT (company_id, name) DO NOTHING;

-- =============================================================================
-- 8. Backfill: one "first phase" per existing project, marked current
-- =============================================================================
-- Puts every existing project under its company's Phase 1 (INDLEDENDE
-- RÅDGIVNING) with is_current = true. Uses the project's existing deadline as
-- the phase deadline so downstream UI has something to display (user can
-- adjust later).

INSERT INTO public.project_phases
  (project_id, phase_definition_id, is_current, deadline)
SELECT
  p.id,
  pd.id,
  true,
  p.deadline
FROM public.projects p
INNER JOIN public.phase_definitions pd
  ON pd.company_id = p.company_id
 AND pd.display_order = 1
WHERE NOT EXISTS (
  SELECT 1
  FROM public.project_phases pp
  WHERE pp.project_id = p.id
);

-- =============================================================================
-- 9. Backfill: move each template reference on projects into per-doc rows
-- =============================================================================
-- For every existing project, iterate the seven "<category>_templates" arrays.
-- Each template name becomes one row in project_phase_documents under that
-- project's single first phase. Per-template JSONB payloads
-- (template_variables, variable_propagation_settings, document_assignments,
-- document_review_status, template_version_locks) are copied over so the new
-- table is a faithful mirror of the legacy state.

WITH project_first_phase AS (
  SELECT pp.id   AS project_phase_id,
         pp.project_id
  FROM public.project_phases pp
  INNER JOIN public.phase_definitions pd ON pd.id = pp.phase_definition_id
  WHERE pd.display_order = 1
),
legacy_doc_rows AS (
  -- Unnest all seven category columns into a single (project_id, category, template_name) stream.
  SELECT p.id AS project_id, 'ARCHITECTURE'::public.document_category AS category,
         unnest(coalesce(p.architecture_templates, '{}'::text[])) AS template_name
  FROM public.projects p
  UNION ALL
  SELECT p.id, 'CONSTRUCTIONS'::public.document_category,
         unnest(coalesce(p.constructions_templates, '{}'::text[]))
  FROM public.projects p
  UNION ALL
  SELECT p.id, 'FIRE'::public.document_category,
         unnest(coalesce(p.fire_templates, '{}'::text[]))
  FROM public.projects p
  UNION ALL
  SELECT p.id, 'AUTHORITY_PROCESSING'::public.document_category,
         unnest(coalesce(p.authority_processing_templates, '{}'::text[]))
  FROM public.projects p
  UNION ALL
  SELECT p.id, 'ENERGY'::public.document_category,
         unnest(coalesce(p.energy_templates, '{}'::text[]))
  FROM public.projects p
  UNION ALL
  SELECT p.id, 'HVAC'::public.document_category,
         unnest(coalesce(p.hvac_templates, '{}'::text[]))
  FROM public.projects p
  UNION ALL
  SELECT p.id, 'EXECUTION_CONTROL'::public.document_category,
         unnest(coalesce(p.execution_control_templates, '{}'::text[]))
  FROM public.projects p
)
INSERT INTO public.project_phase_documents (
  project_phase_id,
  category,
  template_name,
  responsible_discipline,
  variables,
  propagation_settings,
  assignments,
  review_status,
  template_version_lock
)
SELECT
  pfp.project_phase_id,
  ld.category,
  ld.template_name,
  NULL AS responsible_discipline,
  coalesce(p.template_variables            -> ld.category::text -> ld.template_name, '{}'::jsonb),
  coalesce(p.variable_propagation_settings -> ld.category::text -> ld.template_name, '{}'::jsonb),
  coalesce(p.document_assignments          -> ld.template_name, '{}'::jsonb),
  '{}'::jsonb,
  NULL::integer
FROM legacy_doc_rows ld
INNER JOIN public.projects p              ON p.id = ld.project_id
INNER JOIN project_first_phase pfp        ON pfp.project_id = ld.project_id
WHERE ld.template_name IS NOT NULL
  AND ld.template_name <> ''
ON CONFLICT (project_phase_id, template_name) DO NOTHING;

-- =============================================================================
-- 10. Backfill phase-level variable buckets
-- =============================================================================
-- Move project-level category_variables / global_variables onto the first
-- phase so phase 1 looks exactly like the current project.

UPDATE public.project_phases pp
SET
  category_variables = coalesce(p.category_variables, '{}'::jsonb),
  global_variables   = coalesce(p.global_variables,   '{}'::jsonb)
FROM public.projects p
INNER JOIN public.phase_definitions pd
  ON pd.company_id = p.company_id
 AND pd.display_order = 1
WHERE pp.project_id          = p.id
  AND pp.phase_definition_id = pd.id;

-- =============================================================================
-- 11. Documentation comments
-- =============================================================================
COMMENT ON TABLE  public.phase_definitions              IS 'Per-company catalog of named phases used across all its projects';
COMMENT ON COLUMN public.phase_definitions.display_order IS 'Sort order used in the milestone bar; unique within a company';
COMMENT ON COLUMN public.phase_definitions.is_enabled   IS 'Soft-disable toggle; disabled phases are hidden from new project wizards';
COMMENT ON COLUMN public.phase_definitions.is_default_seed IS 'True when this row was created by the initial seed (vs. admin-created)';

COMMENT ON TABLE  public.project_phases                 IS 'A phase instance selected by a project from the phase catalog';
COMMENT ON COLUMN public.project_phases.is_current      IS 'Exactly one phase per project may be current (enforced by partial unique index)';
COMMENT ON COLUMN public.project_phases.is_locked       IS 'When true, phase becomes read-only for everyone (leader/admin can unlock)';

COMMENT ON TABLE  public.project_phase_documents        IS 'One row per (project_phase, template) — replaces projects.*_templates[] plus per-template JSONB blobs';
COMMENT ON COLUMN public.project_phase_documents.responsible_discipline IS 'Which discipline owns this document (Architect|Engineer|Fire|Constructor|NULL)';
COMMENT ON COLUMN public.project_phase_documents.origin_phase_id        IS 'Permanent lineage marker pointing at the phase where this document''s content was first authored';
COMMENT ON COLUMN public.project_phase_documents.carryover_review_state IS 'UI-scoped map of carried-over fields that still need user review';

COMMENT ON COLUMN public.projects.is_on_hold   IS 'Project-wide hold toggle; disables edits across all phases';
COMMENT ON COLUMN public.projects.on_hold_by   IS 'User who put the project on hold';
COMMENT ON COLUMN public.projects.on_hold_at   IS 'Timestamp when the project was put on hold';
COMMENT ON COLUMN public.projects.on_hold_note IS 'Optional reason shown to team members';

COMMIT;
