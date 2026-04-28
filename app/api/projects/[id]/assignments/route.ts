import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { updatePhaseDocument } from '@/lib/phases/server';

/**
 * Project document assignments — writes to the **current phase** row in
 * `project_phase_documents.assignments` (finalize migration drops
 * `projects.document_assignments`).
 *
 * ROUTE: POST /api/projects/[id]/assignments
 * Body: { template_name: string, assignments: Record<string, unknown> }
 */

async function updateAssignmentsHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { template_name, assignments } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
    }

    if (!template_name || !assignments || typeof assignments !== 'object') {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    let projectCheckQuery = supabase
      .from('projects')
      .select('company_id')
      .eq('id', id);

    if (currentUserProfile.role !== 'ADMIN') {
      projectCheckQuery = projectCheckQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: projectCheck, error: projectCheckError } = await projectCheckQuery.single();

    if (projectCheckError || !projectCheck) {
      return NextResponse.json({ message: 'Project not found or not accessible' }, { status: 404 });
    }

    const userCompanyFilter = { company_id: projectCheck.company_id };

    const [assigneeDetails, supervisorDetails] = await Promise.all([
      assignments.assignee_id ? supabase
        .from('users')
        .select('name, email')
        .eq('id', assignments.assignee_id)
        .match(userCompanyFilter)
        .single() : null,
      assignments.supervisor_id ? supabase
        .from('users')
        .select('name, email')
        .eq('id', assignments.supervisor_id)
        .match(userCompanyFilter)
        .single() : null
    ]);

    if (assignments.assignee_id && assigneeDetails?.error) {
      return NextResponse.json({
        message: 'Assignee not found or not in the project\'s company'
      }, { status: 404 });
    }

    if (assignments.supervisor_id && supervisorDetails?.error) {
      return NextResponse.json({
        message: 'Supervisor not found or not in the project\'s company'
      }, { status: 404 });
    }

    const { data: currentPhase, error: phaseError } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', id)
      .eq('is_current', true)
      .maybeSingle();

    if (phaseError) {
      console.error('assignments phase lookup:', phaseError);
      return NextResponse.json({ message: 'Failed to resolve current phase' }, { status: 500 });
    }

    if (!currentPhase?.id) {
      return NextResponse.json(
        { message: 'No current project phase; cannot update assignments' },
        { status: 409 }
      );
    }

    const { data: phaseDoc, error: docError } = await supabase
      .from('project_phase_documents')
      .select('id, assignments')
      .eq('project_phase_id', currentPhase.id)
      .eq('template_name', template_name)
      .maybeSingle();

    if (docError) {
      console.error('assignments doc lookup:', docError);
      return NextResponse.json({ message: 'Failed to load phase document' }, { status: 500 });
    }

    if (!phaseDoc) {
      return NextResponse.json(
        { message: 'Template is not part of the current phase' },
        { status: 404 }
      );
    }

    const prev = (phaseDoc.assignments ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...prev,
      ...assignments,
    };
    if (assignments.assignee_id) {
      merged.assignee_name =
        assigneeDetails?.data?.name || assigneeDetails?.data?.email;
    }
    if (assignments.supervisor_id) {
      merged.supervisor_name =
        supervisorDetails?.data?.name || supervisorDetails?.data?.email;
    }

    const updated = await updatePhaseDocument(supabase, phaseDoc.id, {
      assignments: merged,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in assignments handler:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuthDynamic(updateAssignmentsHandler);
