import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  withAuthDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import {
  findPhaseDocumentInProject,
  removePhaseDocument,
  updatePhaseDocument,
  type UpdatePhaseDocumentInput,
} from "@/lib/phases/server";

/**
 * Single phase-document operations.
 *
 *   PATCH  /api/projects/[id]/phases/[phaseId]/documents/[documentId]
 *     body: Partial<UpdatePhaseDocumentInput>
 *     → { document }
 *
 *   DELETE /api/projects/[id]/phases/[phaseId]/documents/[documentId]
 *     → { ok: true }
 *
 * PATCH is permissive (anyone on the project's company) so team members can
 * edit variables / assignments on documents they're responsible for. We still
 * block when the phase is locked or the project is on hold.
 *
 * DELETE is restricted to project leader / admin.
 */

type Params = { id: string; phaseId: string; documentId: string };

const ALLOWED_KEYS = new Set<keyof UpdatePhaseDocumentInput>([
  "responsible_discipline",
  "variables",
  "propagation_settings",
  "assignments",
  "review_status",
  "template_version_lock",
  "carryover_review_state",
]);

async function patchHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<Params>
) {
  try {
    const { id, phaseId, documentId } = await params;
    const supabase = await createClient();

    const gate = await resolveDocumentContext(supabase, id, phaseId, documentId);
    if ("error" in gate) return gate.error;
    const { project, phase } = gate;

    if (request.user.role !== "ADMIN" && request.user.company_id !== project.company_id) {
      return NextResponse.json(
        { message: "Project not accessible" },
        { status: 403 }
      );
    }
    if (project.is_on_hold) {
      return NextResponse.json(
        { message: "Project is on hold" },
        { status: 409 }
      );
    }
    if (phase.is_locked) {
      return NextResponse.json(
        { message: "Phase is locked" },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: UpdatePhaseDocumentInput = {};
    for (const key of Object.keys(body) as Array<keyof UpdatePhaseDocumentInput>) {
      if (ALLOWED_KEYS.has(key)) {
        // Cast is safe — we whitelisted the keys above.
        (patch as Record<string, unknown>)[key] = body[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { message: "No patchable fields in body" },
        { status: 400 }
      );
    }

    const document = await updatePhaseDocument(supabase, documentId, patch);
    return NextResponse.json({ document });
  } catch (error) {
    console.error("[phase document PATCH] error:", error);
    return NextResponse.json(
      {
        message: "Failed to update phase document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<Params>
) {
  try {
    const { id, phaseId, documentId } = await params;
    const supabase = await createClient();

    const gate = await resolveDocumentContext(supabase, id, phaseId, documentId);
    if ("error" in gate) return gate.error;
    const { project, phase } = gate;

    const role = request.user.role;
    const isAdmin = role === "ADMIN" || role === "COMPANY_ADMIN";
    const isLeader = project.leader_id === request.user.id;
    if (!isAdmin && !isLeader) {
      return NextResponse.json(
        { message: "Only the project leader or an admin can remove documents" },
        { status: 403 }
      );
    }
    if (project.is_on_hold) {
      return NextResponse.json(
        { message: "Project is on hold" },
        { status: 409 }
      );
    }
    if (phase.is_locked) {
      return NextResponse.json(
        { message: "Phase is locked" },
        { status: 409 }
      );
    }

    await removePhaseDocument(supabase, documentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[phase document DELETE] error:", error);
    return NextResponse.json(
      {
        message: "Failed to remove phase document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function resolveDocumentContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  phaseId: string,
  documentId: string
): Promise<
  | {
      error: NextResponse;
    }
  | {
      project: {
        id: number | string;
        leader_id: string | null;
        company_id: string;
        is_on_hold: boolean | null;
      };
      phase: {
        id: string;
        is_locked: boolean | null;
      };
    }
> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, leader_id, company_id, is_on_hold")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return {
      error: NextResponse.json(
        { message: "Project not found or not accessible" },
        { status: 404 }
      ),
    };
  }

  const { data: phase, error: phaseError } = await supabase
    .from("project_phases")
    .select("id, project_id, is_locked")
    .eq("id", phaseId)
    .single();

  if (phaseError || !phase || String(phase.project_id) !== String(projectId)) {
    return {
      error: NextResponse.json(
        { message: "Phase not found on this project" },
        { status: 404 }
      ),
    };
  }

  // Make sure the document belongs to this phase (belt-and-suspenders against
  // stale IDs and URL tampering).
  const doc = await findPhaseDocumentInProject(supabase, projectId, documentId);
  if (!doc || doc.project_phase_id !== phaseId) {
    return {
      error: NextResponse.json(
        { message: "Document not found on this phase" },
        { status: 404 }
      ),
    };
  }

  return { project, phase };
}

export const PATCH = withAuthDynamic(patchHandler);
export const DELETE = withAuthDynamic(deleteHandler);
