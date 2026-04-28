/**
 * Phase system — type definitions (PR 1).
 *
 * These mirror the `phase_definitions`, `project_phases`, and
 * `project_phase_documents` tables introduced in
 * `supabase/migrations/20260421010000_add_phase_system.sql`.
 *
 * PR 1 only ships these types + the migration. API routes and UI that
 * actually consume them land in PR 2+.
 */

import { Discipline } from "@/lib/team/disciplines";
import {
  DocumentCategory,
  VariablePropagationScope,
} from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

// -----------------------------------------------------------------------------
// Canonical default phase catalog (DK AEC lifecycle). Kept in code so callers
// can render the static bar even before fetching the company-scoped catalog,
// and so new companies can be bootstrapped client-side if needed. The DB
// migration seeds the same list per company at install time.
// -----------------------------------------------------------------------------

export interface DefaultPhaseSeed {
  readonly displayOrder: number;
  readonly name: string;
  readonly shortLabel: string;
}

export const DEFAULT_PHASE_CATALOG: readonly DefaultPhaseSeed[] = [
  { displayOrder: 1, name: "INDLEDENDE RÅDGIVNING", shortLabel: "P1" },
  { displayOrder: 2, name: "PROJEKTERINGSLEDELSE", shortLabel: "P2" },
  { displayOrder: 3, name: "FORSLAGSFASEN", shortLabel: "P3" },
  { displayOrder: 4, name: "MYNDIGHEDSPROJEKT", shortLabel: "P4" },
  { displayOrder: 5, name: "UDBUDSPROJEKT", shortLabel: "P5" },
  { displayOrder: 6, name: "UDFØRELSESPROJEKT", shortLabel: "P6" },
  { displayOrder: 7, name: "UDFØRELSE", shortLabel: "P7" },
  { displayOrder: 8, name: "AFLEVERING", shortLabel: "P8" },
  { displayOrder: 9, name: "EFTERFØLGENDE YDELSER", shortLabel: "P9" },
] as const;

// -----------------------------------------------------------------------------
// phase_definitions row
// -----------------------------------------------------------------------------

export interface PhaseDefinition {
  id: string;
  company_id: string;
  name: string;
  short_label: string;
  display_order: number;
  description: string | null;
  is_enabled: boolean;
  is_default_seed: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// project_phases row
// -----------------------------------------------------------------------------

/**
 * Phase-scoped variable buckets. Migrated off `projects.category_variables`
 * and `projects.global_variables` so each phase can diverge. Shapes mirror
 * the legacy project-level JSONB for a drop-in replacement.
 */
export interface PhaseCategoryVariables {
  [category: string]: {
    variables: DocumentVariable[];
  };
}

export interface PhaseGlobalVariables {
  variables: DocumentVariable[];
}

export interface ProjectPhase {
  id: string;
  project_id: number;
  phase_definition_id: string;
  deadline: string | null;
  is_current: boolean;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  category_variables: PhaseCategoryVariables;
  global_variables: PhaseGlobalVariables | Record<string, never>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// project_phase_documents row
// -----------------------------------------------------------------------------

/**
 * Per-template variable payload stored on a phase document. Unlike the legacy
 * `projects.template_variables[category][templateName]`, this is keyed by
 * template alone since the row already knows its phase and category.
 */
export interface PhaseDocumentVariables {
  variables?: DocumentVariable[];
  // Intentionally permissive — legacy rows may have additional fields we want
  // to pass through untouched.
  [key: string]: unknown;
}

export interface PhaseDocumentPropagationSettings {
  [variableName: string]: {
    possibleScopes: VariablePropagationScope[];
    currentScope: VariablePropagationScope;
    isOverridden: boolean;
  };
}

export interface PhaseDocumentAssignmentPayload {
  assignee_id?: string;
  assignee_name?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  supervisor_checked?: boolean;
  [key: string]: unknown;
}

export interface PhaseDocumentReviewStatus {
  status?:
    | "in_progress"
    | "ready_for_control"
    | "under_review"
    | "review_complete";
  ready_for_control_at?: string;
  controller_id?: string;
  controller_name?: string;
  review_started_at?: string;
  review_completed_at?: string;
  [key: string]: unknown;
}

/**
 * Tracks which carried-over fields on this document still need user review
 * (the "highlighted until clicked" affordance). PR 4 defines the exact shape;
 * for PR 1 it's a free-form JSONB and defaults to empty.
 */
export interface PhaseDocumentCarryoverState {
  [fieldKey: string]: boolean;
}

export interface ProjectPhaseDocument {
  id: string;
  project_phase_id: string;
  category: DocumentCategory;
  template_name: string;
  responsible_discipline: Discipline | null;
  variables: PhaseDocumentVariables;
  propagation_settings: PhaseDocumentPropagationSettings;
  /**
   * Combined assignee + supervisor payload. Matches the legacy
   * `projects.document_assignments[templateName]` shape.
   */
  assignments: PhaseDocumentAssignmentPayload;
  review_status: PhaseDocumentReviewStatus;
  template_version_lock: number | null;
  origin_phase_id: string | null;
  origin_document_id: string | null;
  carryover_review_state: PhaseDocumentCarryoverState;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Convenience composites
// -----------------------------------------------------------------------------

/**
 * A phase with its definition joined in — the shape most UI components want.
 */
export interface ProjectPhaseWithDefinition extends ProjectPhase {
  definition: PhaseDefinition;
}

/**
 * A phase with its definition AND its documents — the shape the project
 * detail page will consume once PR 2 lands.
 */
export interface ProjectPhaseFull extends ProjectPhaseWithDefinition {
  documents: ProjectPhaseDocument[];
}

// -----------------------------------------------------------------------------
// Milestone bar visual states (UI-layer enum kept alongside the types so
// every consumer agrees on the meaning — PR 2 will use this).
// -----------------------------------------------------------------------------

export type MilestoneVisualState =
  | "irrelevant" // Not selected for this project
  | "completed" // Past a selected phase (display_order < current)
  | "current" // This project's `is_current` phase
  | "upcoming" // Future selected phase
  | "locked"; // Overlay modifier applicable to completed/current/upcoming

export interface MilestoneSlot {
  definition: PhaseDefinition;
  projectPhase: ProjectPhase | null;
  state: MilestoneVisualState;
  isLocked: boolean;
}
