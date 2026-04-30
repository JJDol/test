/**
 * useProjectPhases — client hook that powers the milestone bar and related UI.
 *
 * Keeps the phase system decoupled from `useProjectData` so the rest of the
 * project page can stay untouched in PR 2. Returns the raw phase list, the
 * company-wide catalog, and typed mutator callbacks.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import type {
  PhaseDefinition,
  ProjectPhaseFull,
  ProjectPhaseDocument,
  ProjectPhaseWithDefinition,
  MilestoneSlot,
  MilestoneVisualState,
} from "@/lib/phases/types";

interface PhasesHoldState {
  is_on_hold: boolean;
  on_hold_by: string | null;
  on_hold_at: string | null;
  on_hold_note: string | null;
}

interface PhasesApiResponse {
  phases: ProjectPhaseFull[];
  catalog: PhaseDefinition[];
  hold: PhasesHoldState;
}

export interface UseProjectPhasesReturn {
  phases: ProjectPhaseFull[];
  catalog: PhaseDefinition[];
  hold: PhasesHoldState;

  /**
   * Milestone slots for the full catalog (always 9-ish entries). Each slot
   * knows whether the project actually uses the phase, and what the
   * milestone-bar visual state should be. Sorted by catalog display_order.
   */
  slots: MilestoneSlot[];

  currentPhase: ProjectPhaseFull | null;

  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;

  addPhase: (input: {
    phase_definition_id: string;
    deadline?: string | null;
    make_current?: boolean;
  }) => Promise<ProjectPhaseWithDefinition | null>;

  updatePhase: (
    phaseId: string,
    input: {
      deadline?: string | null;
      is_current?: boolean;
      is_locked?: boolean;
    }
  ) => Promise<void>;

  setHold: (input: { is_on_hold: boolean; note?: string }) => Promise<void>;

  // ---------------------------------------------------------------------
  // Phase-scoped document mutations
  // ---------------------------------------------------------------------

  /** Attach a template (category + template_name) to a phase. */
  addPhaseDocument: (
    phaseId: string,
    input: {
      template_name: string;
      category: string;
      responsible_discipline?: string | null;
      /** Optional seed payloads (used when first attaching a template). */
      variables?: Record<string, unknown>;
      propagation_settings?: Record<string, unknown>;
      assignments?: Record<string, unknown>;
      review_status?: Record<string, unknown>;
      template_version_lock?: number | null;
      origin_phase_id?: string | null;
      origin_document_id?: string | null;
    }
  ) => Promise<ProjectPhaseDocument | null>;

  /** Remove a phase-document row by its id. */
  removePhaseDocument: (
    phaseId: string,
    documentId: string
  ) => Promise<boolean>;

  /** Patch a single phase-document (variables / assignments / review etc.). */
  patchPhaseDocument: (
    phaseId: string,
    documentId: string,
    patch: Partial<{
      responsible_discipline: string | null;
      variables: Record<string, unknown>;
      propagation_settings: Record<string, unknown>;
      assignments: Record<string, unknown>;
      review_status: Record<string, unknown>;
      template_version_lock: number | null;
      carryover_review_state: Record<string, unknown>;
    }>,
    options?: { optimistic?: boolean; localOnly?: boolean; skipResponseMerge?: boolean }
  ) => Promise<ProjectPhaseDocument | null>;
}

export function useProjectPhases(
  projectId: string | null | undefined
): UseProjectPhasesReturn {
  const { toast } = useToast();
  const [data, setData] = useState<PhasesApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  const fetchPhases = useCallback(async () => {
    if (!projectId) return;

    // Cancel any previous in-flight request.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/phases`, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body?.message || `Failed to load phases (${response.status})`
        );
      }
      const json = (await response.json()) as PhasesApiResponse;
      setData(json);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "Failed to load phases";
      setError(message);
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
      }
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPhases();
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [fetchPhases]);

  const addPhase = useCallback<UseProjectPhasesReturn["addPhase"]>(
    async (input) => {
      if (!projectId) return null;
      try {
        const response = await fetch(`/api/projects/${projectId}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to add phase");
        }
        const row = (await response.json()) as ProjectPhaseWithDefinition;
        await fetchPhases();
        toast({
          title: "Phase added",
          description: row.definition.name,
        });
        return row;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add phase";
        toast({
          title: "Could not add phase",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [projectId, fetchPhases, toast]
  );

  const updatePhase = useCallback<UseProjectPhasesReturn["updatePhase"]>(
    async (phaseId, input) => {
      if (!projectId) return;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/phases/${phaseId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to update phase");
        }
        await fetchPhases();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update phase";
        toast({
          title: "Could not update phase",
          description: message,
          variant: "destructive",
        });
      }
    },
    [projectId, fetchPhases, toast]
  );

  // -----------------------------------------------------------------------
  // Phase-document mutations
  // -----------------------------------------------------------------------

  const addPhaseDocument = useCallback<UseProjectPhasesReturn["addPhaseDocument"]>(
    async (phaseId, input) => {
      if (!projectId) return null;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/phases/${phaseId}/documents`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to add document");
        }
        const json = (await response.json()) as { document: ProjectPhaseDocument };
        // Optimistically splice the new row into state so the UI updates before
        // the next refresh completes.
        setData((prev) =>
          prev
            ? {
                ...prev,
                phases: prev.phases.map((p) =>
                  p.id === phaseId
                    ? { ...p, documents: [...(p.documents ?? []), json.document] }
                    : p
                ),
              }
            : prev
        );
        // Silent refresh to stay aligned with the server (e.g. if constraints
        // deduped the insert).
        fetchPhases();
        return json.document;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add document";
        toast({
          title: "Could not add document",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [projectId, fetchPhases, toast]
  );

  const removePhaseDocument = useCallback<
    UseProjectPhasesReturn["removePhaseDocument"]
  >(
    async (phaseId, documentId) => {
      if (!projectId) return false;
      const previous = data;
      // Optimistic removal.
      setData((prev) =>
        prev
          ? {
              ...prev,
              phases: prev.phases.map((p) =>
                p.id === phaseId
                  ? {
                      ...p,
                      documents: (p.documents ?? []).filter(
                        (d) => d.id !== documentId
                      ),
                    }
                  : p
              ),
            }
          : prev
      );
      try {
        const response = await fetch(
          `/api/projects/${projectId}/phases/${phaseId}/documents/${documentId}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to remove document");
        }
        fetchPhases();
        return true;
      } catch (err) {
        // Revert the optimistic update if the request failed.
        if (previous) setData(previous);
        const message =
          err instanceof Error ? err.message : "Failed to remove document";
        toast({
          title: "Could not remove document",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [projectId, data, fetchPhases, toast]
  );

  const patchPhaseDocument = useCallback<
    UseProjectPhasesReturn["patchPhaseDocument"]
  >(
    async (phaseId, documentId, patch, options) => {
      if (!projectId) return null;
      const previous = data;
      if (options?.optimistic !== false) {
        // Optimistic merge so the UI reflects the change immediately; the real
        // server response comes back and is spliced in below.
        setData((prev) =>
          prev
            ? {
                ...prev,
                phases: prev.phases.map((p) =>
                  p.id === phaseId
                    ? {
                        ...p,
                        documents: (p.documents ?? []).map((d) =>
                          d.id === documentId
                            ? ({ ...d, ...patch } as (typeof p.documents)[number])
                            : d
                        ),
                      }
                    : p
                ),
              }
            : prev
        );
      }
      // localOnly: update state only, skip API call (used for debounced typing)
      if (options?.localOnly) return null;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/phases/${phaseId}/documents/${documentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to update document");
        }
        const json = (await response.json()) as { document: ProjectPhaseDocument };
        if (!options?.skipResponseMerge) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  phases: prev.phases.map((p) =>
                    p.id === phaseId
                      ? {
                          ...p,
                          documents: (p.documents ?? []).map((d) =>
                            d.id === documentId ? json.document : d
                          ),
                        }
                      : p
                  ),
                }
              : prev
          );
        }
        return json.document;
      } catch (err) {
        if (previous) setData(previous);
        const message =
          err instanceof Error ? err.message : "Failed to update document";
        toast({
          title: "Could not update document",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [projectId, data, toast]
  );

  const setHold = useCallback<UseProjectPhasesReturn["setHold"]>(
    async (input) => {
      if (!projectId) return;
      try {
        const response = await fetch(`/api/projects/${projectId}/hold`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to update hold state");
        }
        await fetchPhases();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update hold state";
        toast({
          title: "Could not update hold",
          description: message,
          variant: "destructive",
        });
      }
    },
    [projectId, fetchPhases, toast]
  );

  // -----------------------------------------------------------------------
  // Derived data: milestone slots + current phase
  // -----------------------------------------------------------------------

  const slots = useMemo<MilestoneSlot[]>(() => {
    if (!data) return [];
    const { catalog, phases } = data;
    const phaseByDef = new Map<string, ProjectPhaseFull>(
      phases.map((p) => [p.phase_definition_id, p])
    );
    const currentOrder =
      phases.find((p) => p.is_current)?.definition?.display_order ?? null;

    return catalog
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map<MilestoneSlot>((definition) => {
        const projectPhase = phaseByDef.get(definition.id) ?? null;
        let state: MilestoneVisualState = "irrelevant";
        if (projectPhase) {
          if (projectPhase.is_current) {
            state = "current";
          } else if (
            currentOrder !== null &&
            definition.display_order < currentOrder
          ) {
            state = "completed";
          } else {
            state = "upcoming";
          }
        }
        return {
          definition,
          projectPhase,
          state,
          isLocked: projectPhase?.is_locked ?? false,
        };
      });
  }, [data]);

  const currentPhase = useMemo<ProjectPhaseFull | null>(() => {
    if (!data) return null;
    return data.phases.find((p) => p.is_current) ?? null;
  }, [data]);

  return {
    phases: data?.phases ?? [],
    catalog: data?.catalog ?? [],
    hold:
      data?.hold ?? {
        is_on_hold: false,
        on_hold_by: null,
        on_hold_at: null,
        on_hold_note: null,
      },
    slots,
    currentPhase,
    loading,
    error,
    refresh: fetchPhases,
    addPhase,
    updatePhase,
    setHold,
    addPhaseDocument,
    removePhaseDocument,
    patchPhaseDocument,
  };
}
