/**
 * Server-side repository for the phase system (PR 2).
 *
 * Thin helpers over the Supabase client. Intentionally does not enforce
 * permission checks — callers (API routes) are responsible for that. RLS on
 * the new tables is still in effect as a safety net.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PhaseDefinition,
  ProjectPhase,
  ProjectPhaseDocument,
  ProjectPhaseWithDefinition,
  ProjectPhaseFull,
} from "@/lib/phases/types";

type Supa = SupabaseClient<any, "public", any>;

// ---------------------------------------------------------------------------
// Phase catalog (per-company definitions)
// ---------------------------------------------------------------------------

export async function listCompanyPhaseDefinitions(
  supabase: Supa,
  companyId: string
): Promise<PhaseDefinition[]> {
  const { data, error } = await supabase
    .from("phase_definitions")
    .select("*")
    .eq("company_id", companyId)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PhaseDefinition[];
}

// ---------------------------------------------------------------------------
// Project phases
// ---------------------------------------------------------------------------

/**
 * Load a project's selected phases joined with their catalog definitions.
 * Sorted by the definition's `display_order` so callers can render the
 * milestone bar directly from this array.
 */
export async function listProjectPhases(
  supabase: Supa,
  projectId: number | string
): Promise<ProjectPhaseWithDefinition[]> {
  const { data, error } = await supabase
    .from("project_phases")
    .select(
      `
      *,
      definition:phase_definition_id (*)
    `
    )
    .eq("project_id", projectId);

  if (error) throw error;

  const rows = (data ?? []) as Array<
    ProjectPhase & { definition: PhaseDefinition }
  >;

  // Supabase returns the joined row under the alias; normalise to our shape
  // and sort by display order in JS (the Supabase query builder can't order
  // by a joined column cleanly).
  return rows
    .map((row) => ({ ...row, definition: row.definition }))
    .sort(
      (a, b) => a.definition.display_order - b.definition.display_order
    ) as ProjectPhaseWithDefinition[];
}

/**
 * Load a project's phases with their full document lists. Used by the project
 * detail page once PR 2 integrates into the main data flow.
 */
export async function listProjectPhasesWithDocuments(
  supabase: Supa,
  projectId: number | string
): Promise<ProjectPhaseFull[]> {
  const phases = await listProjectPhases(supabase, projectId);
  if (phases.length === 0) return [];

  const phaseIds = phases.map((p) => p.id);
  const { data, error } = await supabase
    .from("project_phase_documents")
    .select("*")
    .in("project_phase_id", phaseIds);

  if (error) throw error;

  const docsByPhase = new Map<string, ProjectPhaseDocument[]>();
  for (const doc of (data ?? []) as ProjectPhaseDocument[]) {
    const list = docsByPhase.get(doc.project_phase_id) ?? [];
    list.push(doc);
    docsByPhase.set(doc.project_phase_id, list);
  }

  return phases.map((phase) => ({
    ...phase,
    documents: docsByPhase.get(phase.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface AddProjectPhaseInput {
  phaseDefinitionId: string;
  deadline?: string | null;
  makeCurrent?: boolean;
}

/**
 * Attach a phase definition to a project. Idempotent per (project, definition).
 * If `makeCurrent` is set we also flip the `is_current` pointer — callers must
 * have privileges to mutate the project (RLS will reject otherwise).
 */
export async function addProjectPhase(
  supabase: Supa,
  projectId: number | string,
  input: AddProjectPhaseInput
): Promise<ProjectPhaseWithDefinition> {
  // Insert; rely on the (project_id, phase_definition_id) unique to stay idempotent.
  const { data: inserted, error: insertError } = await supabase
    .from("project_phases")
    .insert({
      project_id: projectId,
      phase_definition_id: input.phaseDefinitionId,
      deadline: input.deadline ?? null,
      is_current: false,
    })
    .select("*")
    .single();

  if (insertError) {
    // 23505 = unique_violation — means the phase already exists on this project.
    const code = (insertError as { code?: string }).code;
    if (code !== "23505") throw insertError;
  }

  if (input.makeCurrent) {
    const row = inserted as ProjectPhase | null;
    if (row) {
      await setCurrentPhase(supabase, projectId, row.id);
    }
  }

  // Re-fetch the full row with its definition joined, so callers get the
  // UI-ready shape either on fresh insert or on conflict.
  const { data: full, error: fetchError } = await supabase
    .from("project_phases")
    .select("*, definition:phase_definition_id (*)")
    .eq("project_id", projectId)
    .eq("phase_definition_id", input.phaseDefinitionId)
    .single();

  if (fetchError) throw fetchError;
  return full as ProjectPhaseWithDefinition;
}

export interface UpdateProjectPhaseInput {
  deadline?: string | null;
  is_locked?: boolean;
  locked_by?: string | null;
  locked_at?: string | null;
}

export async function updateProjectPhase(
  supabase: Supa,
  phaseId: string,
  input: UpdateProjectPhaseInput
): Promise<ProjectPhase> {
  const { data, error } = await supabase
    .from("project_phases")
    .update(input)
    .eq("id", phaseId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ProjectPhase;
}

/**
 * Atomically set a new current phase for a project: unflags any existing
 * current phase and sets the target to `is_current = true`.
 *
 * NOTE: Supabase has no multi-statement transactions over the REST API, so we
 * do this as two sequential updates. The partial-unique index on the table
 * allows zero current phases briefly but never two, so the intermediate state
 * is safe under concurrent reads.
 */
const DEFAULT_CARRYOVER_REVIEW: Record<string, boolean> = {
  variables: true,
  assignments: true,
  review_status: true,
  propagation_settings: true,
};

/**
 * When the current phase changes, copy document payloads from the previous
 * current phase into the new phase (per 구현계획 carry-over). Rows that already
 * exist on the target phase (wizard seed) are overwritten with carried data
 * and lineage fields; missing templates are inserted.
 */
async function carryOverDocumentsBetweenPhases(
  supabase: Supa,
  fromPhaseId: string,
  toPhaseId: string
): Promise<void> {
  const oldDocs = await listPhaseDocuments(supabase, fromPhaseId);
  if (oldDocs.length === 0) return;

  const newDocs = await listPhaseDocuments(supabase, toPhaseId);
  const newByTemplate = new Map(newDocs.map((d) => [d.template_name, d]));

  for (const old of oldDocs) {
    const existing = newByTemplate.get(old.template_name);
    if (existing) {
      await updatePhaseDocument(supabase, existing.id, {
        variables: old.variables as Record<string, unknown>,
        propagation_settings: old.propagation_settings as Record<string, unknown>,
        assignments: old.assignments as Record<string, unknown>,
        review_status: old.review_status as Record<string, unknown>,
        responsible_discipline:
          old.responsible_discipline ?? existing.responsible_discipline,
        origin_phase_id: old.origin_phase_id ?? fromPhaseId,
        origin_document_id: old.id,
        carryover_review_state: DEFAULT_CARRYOVER_REVIEW,
        template_version_lock:
          old.template_version_lock ?? existing.template_version_lock,
      });
    } else {
      await addPhaseDocument(supabase, toPhaseId, {
        templateName: old.template_name,
        category: old.category,
        responsibleDiscipline: old.responsible_discipline,
        originPhaseId: old.origin_phase_id ?? fromPhaseId,
        originDocumentId: old.id,
        variables: old.variables as Record<string, unknown>,
        propagationSettings: old.propagation_settings as Record<string, unknown>,
        assignments: old.assignments as Record<string, unknown>,
        reviewStatus: old.review_status as Record<string, unknown>,
        templateVersionLock: old.template_version_lock,
        carryoverReviewState: DEFAULT_CARRYOVER_REVIEW,
      });
    }
  }
}

export async function setCurrentPhase(
  supabase: Supa,
  projectId: number | string,
  phaseId: string
): Promise<void> {
  const { data: oldCurrent } = await supabase
    .from("project_phases")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_current", true)
    .maybeSingle();
  const oldPhaseId = oldCurrent?.id ?? null;

  const { error: clearError } = await supabase
    .from("project_phases")
    .update({ is_current: false })
    .eq("project_id", projectId)
    .eq("is_current", true);
  if (clearError) throw clearError;

  const { error: setError } = await supabase
    .from("project_phases")
    .update({ is_current: true })
    .eq("id", phaseId);
  if (setError) throw setError;

  if (oldPhaseId && oldPhaseId !== phaseId) {
    await carryOverDocumentsBetweenPhases(supabase, oldPhaseId, phaseId);
  }
}

export interface SetProjectHoldInput {
  is_on_hold: boolean;
  actorUserId: string | null;
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Phase documents (per-phase template rows)
// ---------------------------------------------------------------------------

/** Lightweight shape accepted by addPhaseDocument. */
export interface AddPhaseDocumentInput {
  templateName: string;
  category: string;
  responsibleDiscipline?: string | null;
  /**
   * When this document is created by carrying over from a previous phase we
   * record the origin so the UI can render the "From Phase X" badge. Leave
   * undefined for manually added documents.
   */
  originPhaseId?: string | null;
  originDocumentId?: string | null;
  /** Pre-seed payloads (used by the carry-over flow in PR 4). */
  variables?: Record<string, unknown>;
  propagationSettings?: Record<string, unknown>;
  assignments?: Record<string, unknown>;
  reviewStatus?: Record<string, unknown>;
  templateVersionLock?: number | null;
  carryoverReviewState?: Record<string, unknown>;
}

export async function listPhaseDocuments(
  supabase: Supa,
  phaseId: string
): Promise<ProjectPhaseDocument[]> {
  const { data, error } = await supabase
    .from("project_phase_documents")
    .select("*")
    .eq("project_phase_id", phaseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectPhaseDocument[];
}

/**
 * Attach a template to a phase. Idempotent per `(project_phase_id,
 * template_name)` thanks to the unique constraint — on conflict we simply
 * return the existing row unchanged so callers can use this for "ensure
 * exists" flows as well.
 */
export async function addPhaseDocument(
  supabase: Supa,
  phaseId: string,
  input: AddPhaseDocumentInput
): Promise<ProjectPhaseDocument> {
  const payload = {
    project_phase_id: phaseId,
    template_name: input.templateName,
    category: input.category,
    responsible_discipline: input.responsibleDiscipline ?? null,
    origin_phase_id: input.originPhaseId ?? null,
    origin_document_id: input.originDocumentId ?? null,
    variables: input.variables ?? {},
    propagation_settings: input.propagationSettings ?? {},
    assignments: input.assignments ?? {},
    review_status: input.reviewStatus ?? {},
    template_version_lock: input.templateVersionLock ?? null,
    carryover_review_state: input.carryoverReviewState ?? {},
  };

  const { data, error } = await supabase
    .from("project_phase_documents")
    .insert(payload)
    .select("*")
    .single();

  if (!error) return data as ProjectPhaseDocument;

  // 23505 = unique_violation; fall through to fetching the existing row so
  // "add again" is a no-op rather than a hard error.
  const code = (error as { code?: string }).code;
  if (code !== "23505") throw error;

  const { data: existing, error: fetchError } = await supabase
    .from("project_phase_documents")
    .select("*")
    .eq("project_phase_id", phaseId)
    .eq("template_name", input.templateName)
    .single();
  if (fetchError) throw fetchError;
  return existing as ProjectPhaseDocument;
}

export interface UpdatePhaseDocumentInput {
  responsible_discipline?: string | null;
  variables?: Record<string, unknown>;
  propagation_settings?: Record<string, unknown>;
  assignments?: Record<string, unknown>;
  review_status?: Record<string, unknown>;
  template_version_lock?: number | null;
  carryover_review_state?: Record<string, unknown>;
  origin_phase_id?: string | null;
  origin_document_id?: string | null;
}

export async function updatePhaseDocument(
  supabase: Supa,
  documentId: string,
  patch: UpdatePhaseDocumentInput
): Promise<ProjectPhaseDocument> {
  const { data, error } = await supabase
    .from("project_phase_documents")
    .update(patch)
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProjectPhaseDocument;
}

export async function removePhaseDocument(
  supabase: Supa,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("project_phase_documents")
    .delete()
    .eq("id", documentId);
  if (error) throw error;
}

/**
 * Resolve a phase-document row and confirm it belongs to the given project.
 * Used by API routes for authorisation before mutations.
 */
export async function findPhaseDocumentInProject(
  supabase: Supa,
  projectId: number | string,
  documentId: string
): Promise<
  | (ProjectPhaseDocument & { project_phase: { project_id: number | string } })
  | null
> {
  const { data, error } = await supabase
    .from("project_phase_documents")
    .select("*, project_phase:project_phase_id (project_id)")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ProjectPhaseDocument & {
    project_phase: { project_id: number | string } | null;
  };
  if (!row.project_phase || String(row.project_phase.project_id) !== String(projectId)) {
    return null;
  }
  return row as ProjectPhaseDocument & {
    project_phase: { project_id: number | string };
  };
}

// ---------------------------------------------------------------------------
// Hold flag
// ---------------------------------------------------------------------------

export async function setProjectHold(
  supabase: Supa,
  projectId: number | string,
  input: SetProjectHoldInput
) {
  const patch = input.is_on_hold
    ? {
        is_on_hold: true,
        on_hold_by: input.actorUserId,
        on_hold_at: new Date().toISOString(),
        on_hold_note: input.note ?? null,
      }
    : {
        is_on_hold: false,
        on_hold_by: null,
        on_hold_at: null,
        on_hold_note: null,
      };

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select("id, is_on_hold, on_hold_by, on_hold_at, on_hold_note")
    .single();

  if (error) throw error;
  return data;
}
