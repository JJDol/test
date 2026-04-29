import { NextResponse } from "next/server";
import {
  withAuthDynamic,
  withCompanyAdminDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import { createClient } from "@/lib/supabase/server";
import { isDiscipline } from "@/lib/team/disciplines";

/**
 * PATCH /api/team/members/:userId
 *
 * Updates the target user's professional `discipline`. COMPANY_ADMIN (or
 * global ADMIN) only. The target user must belong to the same company as the
 * caller. Body: `{ discipline: "Architect" | "Engineer" | "Fire" |
 * "Constructor" | null }`.
 */

async function patchMemberHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ userId: string }>
) {
  try {
    const params = await context.params;
    const targetUserId = params.userId;
    if (!targetUserId) {
      return NextResponse.json(
        { message: "Missing userId" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { discipline } = body as { discipline?: unknown };
    if (
      discipline !== null &&
      discipline !== undefined &&
      !isDiscipline(discipline)
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid discipline. Expected one of 'Architect', 'Engineer', 'Fire', 'Constructor', or null.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: callerRow, error: callerError } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", request.user.id)
      .single();

    if (callerError || !callerRow) {
      return NextResponse.json(
        { message: "Caller profile not found" },
        { status: 404 }
      );
    }

    const { data: targetRow, error: targetError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetRow) {
      return NextResponse.json(
        { message: "Target user not found" },
        { status: 404 }
      );
    }

    const isGlobalAdmin = callerRow.role === "ADMIN";
    const sameCompany =
      !!callerRow.company_id &&
      callerRow.company_id === targetRow.company_id;

    if (!isGlobalAdmin && !sameCompany) {
      return NextResponse.json(
        { message: "You can only edit members of your own company" },
        { status: 403 }
      );
    }

    const normalized = discipline === undefined ? null : discipline;

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ discipline: normalized })
      .eq("id", targetUserId)
      .select("id, name, email, role, discipline")
      .single();

    if (updateError) {
      console.error("Failed to update user discipline:", updateError);
      return NextResponse.json(
        {
          message: "Failed to update discipline",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ member: updated });
  } catch (error: any) {
    console.error("Error in PATCH /api/team/members/[userId]:", error);
    return NextResponse.json(
      {
        message: "Failed to update team member",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getMemberHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ userId: string }>
) {
  try {
    const params = await context.params;
    const targetUserId = params.userId;
    if (!targetUserId) {
      return NextResponse.json(
        { message: "Missing userId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: callerRow, error: callerError } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", request.user.id)
      .single();

    if (callerError || !callerRow) {
      return NextResponse.json(
        { message: "Caller profile not found" },
        { status: 404 }
      );
    }

    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id, name, email, role, discipline, company_id")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const isGlobalAdmin = callerRow.role === "ADMIN";
    const sameCompany =
      !!callerRow.company_id &&
      callerRow.company_id === targetUser.company_id;

    if (!isGlobalAdmin && !sameCompany) {
      return NextResponse.json(
        { message: "You can only view members of your own company" },
        { status: 403 }
      );
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, leader_id, workers, is_archived")
      .eq("company_id", targetUser.company_id)
      .eq("is_archived", false);

    const userProjects = (projects ?? []).filter(
      (p: { leader_id: string | null; workers: string[] | null }) =>
        p.leader_id === targetUserId ||
        (Array.isArray(p.workers) && p.workers.includes(targetUserId))
    );

    const projectIds = userProjects.map((p: { id: string }) => p.id);
    let docsByProject: Record<
      string,
      Array<{ template_name: string; category: string; role: string }>
    > = {};

    if (projectIds.length > 0) {
      const { data: phaseRows } = await supabase
        .from("project_phases")
        .select("id, project_id")
        .in("project_id", projectIds);

      const phases = phaseRows ?? [];
      const phaseToProject = new Map<string, string>();
      for (const p of phases)
        phaseToProject.set(
          p.id as string,
          p.project_id as unknown as string
        );

      if (phases.length > 0) {
        const { data: docRows } = await supabase
          .from("project_phase_documents")
          .select("project_phase_id, template_name, category, assignments")
          .in(
            "project_phase_id",
            phases.map((p: { id: string }) => p.id)
          );

        for (const doc of docRows ?? []) {
          const pId = phaseToProject.get(doc.project_phase_id);
          if (!pId) continue;
          const a = (doc.assignments ?? {}) as {
            assignee_id?: string;
            supervisor_id?: string;
          };
          const roles: string[] = [];
          if (a.assignee_id === targetUserId) roles.push("assignee");
          if (a.supervisor_id === targetUserId) roles.push("supervisor");
          if (roles.length === 0) continue;
          if (!docsByProject[pId]) docsByProject[pId] = [];
          for (const r of roles) {
            const exists = docsByProject[pId].some(
              (d) => d.template_name === doc.template_name && d.role === r
            );
            if (!exists) {
              docsByProject[pId].push({
                template_name: doc.template_name,
                category: doc.category,
                role: r,
              });
            }
          }
        }
      }
    }

    const projectDetails = userProjects.map(
      (p: {
        id: string;
        name: string;
        leader_id: string | null;
        workers: string[] | null;
      }) => ({
        projectId: p.id,
        projectName: p.name,
        isLeader: p.leader_id === targetUserId,
        isWorker:
          Array.isArray(p.workers) && p.workers.includes(targetUserId),
        documents: docsByProject[p.id] ?? [],
      })
    );

    return NextResponse.json({
      member: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        discipline: (targetUser as { discipline?: string | null }).discipline ?? null,
        projectCount: projectDetails.length,
        documentCount: Object.values(docsByProject).reduce(
          (sum, arr) => sum + arr.length,
          0
        ),
        projects: projectDetails,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/team/members/[userId]:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch team member detail",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAuthDynamic(getMemberHandler);
export const PATCH = withCompanyAdminDynamic<{ userId: string }>(
  patchMemberHandler
);
