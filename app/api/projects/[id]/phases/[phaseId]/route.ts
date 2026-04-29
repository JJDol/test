import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  withAuthDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import {
  updateProjectPhase,
  setCurrentPhase,
} from "@/lib/phases/server";

/**
 * Single phase operations.
 *
 *   PATCH /api/projects/[id]/phases/[phaseId]
 *     body: {
 *       deadline?: string | null,
 *       is_current?: boolean,    // true to promote this phase to current
 *       is_locked?: boolean,
 *     }
 *
 * Only the project leader or a COMPANY_ADMIN / super ADMIN may mutate.
 */

type Params = { id: string; phaseId: string };

async function patchPhaseHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<Params>
) {
  try {
    const { id, phaseId } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, leader_id, company_id")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found or not accessible" },
        { status: 404 }
      );
    }

    const role = request.user.role;
    const isAdmin = role === "ADMIN" || role === "COMPANY_ADMIN";
    const isLeader = project.leader_id === request.user.id;
    if (!isAdmin && !isLeader) {
      return NextResponse.json(
        { message: "Only the project leader or an admin can modify phases" },
        { status: 403 }
      );
    }

    // Verify the phase actually belongs to this project before mutating.
    const { data: phase, error: phaseError } = await supabase
      .from("project_phases")
      .select("id, project_id")
      .eq("id", phaseId)
      .single();

    if (phaseError || !phase || String(phase.project_id) !== String(id)) {
      return NextResponse.json(
        { message: "Phase not found on this project" },
        { status: 404 }
      );
    }

    // Handle is_current separately so the partial-unique invariant is
    // maintained (setCurrentPhase clears the old one first).
    if (body.is_current === true) {
      await setCurrentPhase(supabase, id, phaseId);
    } else if (body.is_current === false) {
      // Rare: explicitly clearing current without promoting another. Allowed
      // for flexibility but leaves the project with no current phase until
      // someone flips another row. UI should prefer promotion.
      await updateProjectPhase(supabase, phaseId, {} as never);
      await supabase
        .from("project_phases")
        .update({ is_current: false })
        .eq("id", phaseId);
    }

    // Build the patch for deadline/lock in one shot.
    const patch: Record<string, unknown> = {};
    if ("deadline" in body) patch.deadline = body.deadline;
    if (typeof body.is_locked === "boolean") {
      patch.is_locked = body.is_locked;
      if (body.is_locked) {
        patch.locked_by = request.user.id;
        patch.locked_at = new Date().toISOString();
      } else {
        patch.locked_by = null;
        patch.locked_at = null;
      }
    }

    let updated = phase as unknown;
    if (Object.keys(patch).length > 0) {
      updated = await updateProjectPhase(supabase, phaseId, patch);
    }

    // Return the final joined row so callers can apply optimistic updates.
    const { data: full, error: fullError } = await supabase
      .from("project_phases")
      .select("*, definition:phase_definition_id (*)")
      .eq("id", phaseId)
      .single();

    if (fullError) throw fullError;
    return NextResponse.json(full ?? updated);
  } catch (error) {
    console.error("[phase PATCH] error:", error);
    return NextResponse.json(
      {
        message: "Failed to update phase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function deletePhaseHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<Params>
) {
  try {
    const { id, phaseId } = await params;
    const supabase = await createClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, leader_id, company_id")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found or not accessible" },
        { status: 404 }
      );
    }

    const role = request.user.role;
    const isAdmin = role === "ADMIN" || role === "COMPANY_ADMIN";
    const isLeader = project.leader_id === request.user.id;
    if (!isAdmin && !isLeader) {
      return NextResponse.json(
        { message: "Only the project leader or an admin can delete phases" },
        { status: 403 }
      );
    }

    const { data: phase, error: phaseError } = await supabase
      .from("project_phases")
      .select("id, project_id, is_current, phase_definition_id")
      .eq("id", phaseId)
      .single();

    if (phaseError || !phase || String(phase.project_id) !== String(id)) {
      return NextResponse.json(
        { message: "Phase not found on this project" },
        { status: 404 }
      );
    }

    if (phase.is_current) {
      return NextResponse.json(
        { message: "Cannot delete the current phase. Promote another phase first." },
        { status: 409 }
      );
    }

    const { data: def } = await supabase
      .from("phase_definitions")
      .select("display_order")
      .eq("id", phase.phase_definition_id)
      .single();

    if (def?.display_order === 1) {
      return NextResponse.json(
        { message: "Cannot delete the P1 phase." },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", phaseId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ deleted: true, phaseId });
  } catch (error) {
    console.error("[phase DELETE] error:", error);
    return NextResponse.json(
      {
        message: "Failed to delete phase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthDynamic(patchPhaseHandler);
export const DELETE = withAuthDynamic(deletePhaseHandler);
