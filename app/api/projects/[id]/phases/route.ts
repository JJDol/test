import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  withAuthDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import {
  listCompanyPhaseDefinitions,
  listProjectPhasesWithDocuments,
  addProjectPhase,
} from "@/lib/phases/server";

/**
 * Phase collection endpoint for a project.
 *
 *   GET   /api/projects/[id]/phases
 *     -> {
 *          phases: ProjectPhaseFull[],       // project's selected phases with docs
 *          catalog: PhaseDefinition[],       // the company's full phase catalog
 *        }
 *
 *   POST  /api/projects/[id]/phases
 *     body: { phase_definition_id: string, deadline?: string, make_current?: boolean }
 *     -> ProjectPhaseWithDefinition
 *
 * The GET response intentionally bundles the catalog so the milestone bar can
 * render all slots (including "irrelevant") from a single request.
 */

async function getPhasesHandler(
  _request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Resolve the project's company so we can load its catalog.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, company_id, is_on_hold, on_hold_by, on_hold_at, on_hold_note")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found or not accessible" },
        { status: 404 }
      );
    }

    const [phases, catalog] = await Promise.all([
      listProjectPhasesWithDocuments(supabase, id),
      listCompanyPhaseDefinitions(supabase, project.company_id),
    ]);

    return NextResponse.json({
      phases,
      catalog,
      hold: {
        is_on_hold: project.is_on_hold,
        on_hold_by: project.on_hold_by,
        on_hold_at: project.on_hold_at,
        on_hold_note: project.on_hold_note,
      },
    });
  } catch (error) {
    console.error("[phases GET] error:", error);
    return NextResponse.json(
      {
        message: "Failed to load phases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function postPhasesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const {
      phase_definition_id,
      deadline,
      make_current,
    }: {
      phase_definition_id?: string;
      deadline?: string | null;
      make_current?: boolean;
    } = body;

    if (!phase_definition_id) {
      return NextResponse.json(
        { message: "phase_definition_id is required" },
        { status: 400 }
      );
    }

    // Permission: only project leader, COMPANY_ADMIN, or super ADMIN may add phases.
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
        { message: "Only the project leader or an admin can add phases" },
        { status: 403 }
      );
    }

    // Sanity: the phase definition must belong to the project's company.
    const { data: definition, error: defError } = await supabase
      .from("phase_definitions")
      .select("id, company_id")
      .eq("id", phase_definition_id)
      .single();
    if (defError || !definition) {
      return NextResponse.json(
        { message: "Phase definition not found" },
        { status: 404 }
      );
    }
    if (definition.company_id !== project.company_id) {
      return NextResponse.json(
        { message: "Phase definition belongs to a different company" },
        { status: 400 }
      );
    }

    const phase = await addProjectPhase(supabase, id, {
      phaseDefinitionId: phase_definition_id,
      deadline: deadline ?? null,
      makeCurrent: !!make_current,
    });

    return NextResponse.json(phase);
  } catch (error) {
    console.error("[phases POST] error:", error);
    return NextResponse.json(
      {
        message: "Failed to add phase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAuthDynamic(getPhasesHandler);
export const POST = withAuthDynamic(postPhasesHandler);
