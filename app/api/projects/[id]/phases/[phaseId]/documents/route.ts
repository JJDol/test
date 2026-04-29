import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  withAuthDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import {
  addPhaseDocument,
  listPhaseDocuments,
} from "@/lib/phases/server";

/**
 * Phase-scoped document list.
 *
 *   GET  /api/projects/[id]/phases/[phaseId]/documents
 *     → { documents: ProjectPhaseDocument[] }
 *
 *   POST /api/projects/[id]/phases/[phaseId]/documents
 *     body: {
 *       template_name: string,
 *       category: string,                 // DocumentCategory enum value
 *       responsible_discipline?: string | null,
 *     }
 *     → { document: ProjectPhaseDocument }
 *
 * Read is allowed for any authenticated member of the project's company.
 * Write requires leader-or-admin AND the phase must not be locked / project
 * must not be on hold.
 */

type Params = { id: string; phaseId: string };

async function getHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<Params>
) {
  try {
    const { id, phaseId } = await params;
    const supabase = await createClient();

    const gate = await loadProjectAndPhase(supabase, id, phaseId);
    if ("error" in gate) return gate.error;
    const { project } = gate;

    if (request.user.role !== "ADMIN" && request.user.company_id !== project.company_id) {
      return NextResponse.json(
        { message: "Project not accessible" },
        { status: 403 }
      );
    }

    const documents = await listPhaseDocuments(supabase, phaseId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[phase documents GET] error:", error);
    return NextResponse.json(
      {
        message: "Failed to load phase documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function postHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<Params>
) {
  try {
    const { id, phaseId } = await params;
    const supabase = await createClient();

    const gate = await loadProjectAndPhase(supabase, id, phaseId);
    if ("error" in gate) return gate.error;
    const { project, phase } = gate;

    const role = request.user.role;
    const isAdmin = role === "ADMIN" || role === "COMPANY_ADMIN";
    const isLeader = project.leader_id === request.user.id;
    if (!isAdmin && !isLeader) {
      return NextResponse.json(
        { message: "Only the project leader or an admin can add documents" },
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

    const body = await request.json().catch(() => ({}));
    const templateName =
      typeof body.template_name === "string" ? body.template_name.trim() : "";
    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    if (!templateName || !category) {
      return NextResponse.json(
        { message: "template_name and category are required" },
        { status: 400 }
      );
    }

    const discipline =
      body.responsible_discipline === null
        ? null
        : typeof body.responsible_discipline === "string"
          ? body.responsible_discipline
          : undefined;

    // Optional seed payloads. The client uses these when attaching a template
    // so we can materialise the initial variables/propagation/assignments in
    // a single round-trip instead of POST-then-PATCH.
    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null && !Array.isArray(v);

    const document = await addPhaseDocument(supabase, phaseId, {
      templateName,
      category,
      responsibleDiscipline: discipline ?? null,
      variables: isRecord(body.variables) ? body.variables : undefined,
      propagationSettings: isRecord(body.propagation_settings)
        ? body.propagation_settings
        : undefined,
      assignments: isRecord(body.assignments) ? body.assignments : undefined,
      reviewStatus: isRecord(body.review_status) ? body.review_status : undefined,
      templateVersionLock:
        typeof body.template_version_lock === "number"
          ? body.template_version_lock
          : undefined,
      originPhaseId:
        typeof body.origin_phase_id === "string" ? body.origin_phase_id : undefined,
      originDocumentId:
        typeof body.origin_document_id === "string"
          ? body.origin_document_id
          : undefined,
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error("[phase documents POST] error:", error);
    return NextResponse.json(
      {
        message: "Failed to add phase document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Resolve the project + phase in a single pass, including the permission
 * context used by both read and write paths.
 */
async function loadProjectAndPhase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  phaseId: string
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
        project_id: number | string;
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

  return { project, phase };
}

export const GET = withAuthDynamic(getHandler);
export const POST = withAuthDynamic(postHandler);
