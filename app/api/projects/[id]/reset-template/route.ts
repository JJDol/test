/**
 * Project Template Reset Route
 *
 * PURPOSE: Reset a project-specific template back to the original global template
 * - Removes the custom template entry from project
 * - Deletes the custom template file from storage
 * - Project will use the global template again
 *
 * ROUTE: POST /api/projects/[id]/reset-template
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';

export const dynamic = 'force-dynamic';

async function resetProjectTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Check permissions - only project leader, admin, or company admin can reset
    const canReset =
      currentUserProfile.role === 'ADMIN' ||
      currentUserProfile.role === 'COMPANY_ADMIN' ||
      project.leader_id === request.user.id;

    if (!canReset) {
      return NextResponse.json({
        message: 'You do not have permission to reset templates for this project'
      }, { status: 403 });
    }

    // Get template name from request body
    const body = await request.json();
    const { templateName } = body;

    if (!templateName) {
      return NextResponse.json({ message: 'Template name is required' }, { status: 400 });
    }

    // Check if there's a custom template for this project
    const customTemplates = project.custom_templates || {};
    const customTemplate = customTemplates[templateName];

    if (!customTemplate) {
      return NextResponse.json({
        message: 'No custom template found for this project'
      }, { status: 404 });
    }

    // Delete the custom template file from storage
    if (customTemplate.file_name) {
      try {
        await storageService.deleteFile(
          { companyId: currentUserProfile.company_id, isPublic: false },
          customTemplate.file_name
        );
      } catch (deleteError) {
        console.warn('Failed to delete custom template file:', deleteError);
        // Continue even if file deletion fails
      }
    }

    // Remove the custom template entry from project
    const updatedCustomTemplates = { ...customTemplates };
    delete updatedCustomTemplates[templateName];

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        custom_templates: updatedCustomTemplates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Project update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      message: 'Template reset to original successfully',
      templateName
    });

  } catch (error) {
    console.error('Error resetting project template:', error);
    return NextResponse.json({
      message: 'Failed to reset project template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(resetProjectTemplateHandler);
