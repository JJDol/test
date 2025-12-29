import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

/**
 * Project Document Assignments API Route
 * 
 * PURPOSE: Manage document assignments within projects
 * - Assign users to specific document templates
 * - Set assignees and supervisors for document completion
 * - Enforce company-based assignment restrictions
 * 
 * ROUTE: /api/projects/[id]/assignments
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

    if (!template_name || !assignments) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Verify the project exists and apply company filter only for non-ADMIN users
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

    // Get user details for assignee and supervisor
    // All users (including ADMIN) must assign from the same company as the project
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

    // Check if assigned users exist in the project's company
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

    // First get current assignments
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('document_assignments')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching project:', fetchError);
      return NextResponse.json({ message: 'Failed to fetch project' }, { status: 500 });
    }

    // Update assignments for this template
    const currentAssignments = project.document_assignments || {};
    const updatedAssignments = {
      ...currentAssignments,
      [template_name]: {
        ...assignments,
        assignee_name: assigneeDetails?.data?.name || assigneeDetails?.data?.email,
        supervisor_name: supervisorDetails?.data?.name || supervisorDetails?.data?.email
      }
    };

    // Save updated assignments
    const { data, error } = await supabase
      .from('projects')
      .update({
        document_assignments: updatedAssignments
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating assignments:', error);
      return NextResponse.json({ message: 'Failed to update assignments' }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error in assignments handler:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Apply dynamic authentication wrapper
export const POST = withAuthDynamic(updateAssignmentsHandler); 