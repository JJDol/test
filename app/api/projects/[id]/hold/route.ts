import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  withAuthDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import { setProjectHold } from "@/lib/phases/server";

/**
 * PATCH /api/projects/[id]/hold
 *   body: { is_on_hold: boolean, note?: string }
 *
 * Puts a project on or off hold. Restricted to the project leader or an
 * admin (COMPANY_ADMIN / super ADMIN). When on hold, the UI renders a
 * banner and surfaces hold metadata (who, when, why).
 */
async function patchHoldHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const { is_on_hold, note }: { is_on_hold?: boolean; note?: string } = body;

    if (typeof is_on_hold !== "boolean") {
      return NextResponse.json(
        { message: "is_on_hold (boolean) is required" },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, leader_id")
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
        { message: "Only the project leader or an admin can hold this project" },
        { status: 403 }
      );
    }

    const result = await setProjectHold(supabase, id, {
      is_on_hold,
      actorUserId: request.user.id,
      note: note ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[project hold PATCH] error:", error);
    return NextResponse.json(
      {
        message: "Failed to update hold state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthDynamic(patchHoldHandler);
