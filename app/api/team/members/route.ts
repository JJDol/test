import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth/auth-middleware";
import { createClient } from "@/lib/supabase/server";
import { DocumentCategory } from "@/lib/types/types";

/**
 * GET /api/team/members
 *
 * Returns every member of the caller's company together with an aggregated
 * view of their project- and document-level assignments.
 *
 * For each user we return:
 *   - basic profile (id, name, email, role, discipline)
 *   - a list of projects they are involved in, with
 *       isLeader   — they are the project leader
 *       isWorker   — they are in the `workers` array on the project
 *       templates  — templates on that project where the user is assignee
 *                    or supervisor, each annotated with its DocumentCategory
 *
 * PR 3c: aggregation now pulls templates + assignments from
 * `project_phase_documents` rather than the retired `projects.*_templates[]`
 * and `projects.document_assignments` columns. A user's assignment on the
 * same template in multiple phases is represented as a single template entry;
 * phase granularity is intentionally hidden from this summary.
 */

interface ProjectRow {
  id: string;
  name: string;
  leader_id: string | null;
  workers: string[] | null;
  is_archived: boolean | null;
}

interface PhaseDocRow {
  project_phase_id: string;
  template_name: string;
  category: DocumentCategory;
  assignments: { assignee_id?: string; supervisor_id?: string } | null;
}

interface PhaseRow {
  id: string;
  project_id: string;
}

async function getTeamMembersHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", request.user.id)
      .single();
    if (userError || !currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    if (!currentUser.company_id && currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { message: "User not assigned to a company" },
        { status: 403 }
      );
    }

    const [usersResponse, projectsResponse] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, role, discipline")
        .eq("company_id", currentUser.company_id)
        .neq("role", "ADMIN")
        .order("name"),
      supabase
        .from("projects")
        .select("id, name, leader_id, workers, is_archived")
        .eq("company_id", currentUser.company_id)
        .eq("is_archived", false),
    ]);

    if (usersResponse.error) {
      return NextResponse.json(
        { message: "Failed to fetch users", error: usersResponse.error.message },
        { status: 500 }
      );
    }
    if (projectsResponse.error) {
      return NextResponse.json(
        { message: "Failed to fetch projects", error: projectsResponse.error.message },
        { status: 500 }
      );
    }

    const projects = (projectsResponse.data || []) as ProjectRow[];
    if (projects.length === 0) {
      return NextResponse.json({
        members: (usersResponse.data || []).map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          discipline: (user as { discipline?: string | null }).discipline ?? null,
          assignments: [],
        })),
      });
    }

    // ---- Pull phase documents across all active projects. ----------------
    const projectIds = projects.map((p) => p.id);
    const { data: phaseRows, error: phasesError } = await supabase
      .from("project_phases")
      .select("id, project_id")
      .in("project_id", projectIds);
    if (phasesError) {
      return NextResponse.json(
        { message: "Failed to fetch project phases", error: phasesError.message },
        { status: 500 }
      );
    }
    const phases = (phaseRows ?? []) as PhaseRow[];
    const phaseToProject = new Map<string, string>();
    for (const p of phases) phaseToProject.set(p.id, p.project_id);

    let docs: PhaseDocRow[] = [];
    if (phases.length > 0) {
      const { data: docRows, error: docsError } = await supabase
        .from("project_phase_documents")
        .select("project_phase_id, template_name, category, assignments")
        .in(
          "project_phase_id",
          phases.map((p) => p.id)
        );
      if (docsError) {
        return NextResponse.json(
          {
            message: "Failed to fetch phase documents",
            error: docsError.message,
          },
          { status: 500 }
        );
      }
      docs = (docRows ?? []) as PhaseDocRow[];
    }

    // Roll up to one entry per (projectId, templateName, userId → isAssignee/isSupervisor).
    // `templateKey` collapses the same template across multiple phases — a
    // user assigned to it in any phase shows up once.
    interface UserTemplateRecord {
      templateName: string;
      category: DocumentCategory;
      isAssignee: boolean;
      isSupervisor: boolean;
    }
    type ProjectTemplates = Map<string, UserTemplateRecord>; // templateName → record
    const perUserPerProject = new Map<string, Map<string, ProjectTemplates>>();

    const upsert = (
      userId: string,
      projectId: string,
      templateName: string,
      category: DocumentCategory,
      role: "assignee" | "supervisor"
    ) => {
      let byProject = perUserPerProject.get(userId);
      if (!byProject) {
        byProject = new Map();
        perUserPerProject.set(userId, byProject);
      }
      let tmpls = byProject.get(projectId);
      if (!tmpls) {
        tmpls = new Map();
        byProject.set(projectId, tmpls);
      }
      const existing = tmpls.get(templateName) ?? {
        templateName,
        category,
        isAssignee: false,
        isSupervisor: false,
      };
      if (role === "assignee") existing.isAssignee = true;
      if (role === "supervisor") existing.isSupervisor = true;
      tmpls.set(templateName, existing);
    };

    for (const doc of docs) {
      const projectId = phaseToProject.get(doc.project_phase_id);
      if (!projectId) continue;
      const a = doc.assignments ?? {};
      if (a.assignee_id) {
        upsert(a.assignee_id, projectId, doc.template_name, doc.category, "assignee");
      }
      if (a.supervisor_id) {
        upsert(a.supervisor_id, projectId, doc.template_name, doc.category, "supervisor");
      }
    }

    const members = (usersResponse.data || []).map((user) => {
      const byProject: Map<string, ProjectTemplates> =
        perUserPerProject.get(user.id) ?? new Map();

      const assignments: Array<{
        projectId: string;
        projectName: string;
        isLeader: boolean;
        isWorker: boolean;
        templates: Array<{
          templateName: string;
          category: DocumentCategory | null;
          isAssignee: boolean;
          isSupervisor: boolean;
        }>;
      }> = [];

      for (const project of projects) {
        const isLeader = project.leader_id === user.id;
        const isWorker =
          Array.isArray(project.workers) && project.workers.includes(user.id);
        const tmpls = byProject.get(project.id);
        const templates = tmpls ? Array.from(tmpls.values()) : [];

        if (isLeader || isWorker || templates.length > 0) {
          assignments.push({
            projectId: project.id,
            projectName: project.name,
            isLeader,
            isWorker,
            templates: templates.map((t) => ({
              templateName: t.templateName,
              category: t.category as DocumentCategory | null,
              isAssignee: t.isAssignee,
              isSupervisor: t.isSupervisor,
            })),
          });
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        discipline: (user as { discipline?: string | null }).discipline ?? null,
        assignments,
      };
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Error in GET /api/team/members:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch team members",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getTeamMembersHandler);
