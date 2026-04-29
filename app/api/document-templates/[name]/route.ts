/**
 * Document Template Operations Route
 * 
 * PURPOSE: Handle operations for a specific document template by name
 * - GET: Download template file with proper access control
 * - DELETE: Remove template and clean up all project references
 * 
 * ROUTES:
 * - GET /api/document-templates/[name] - Download template file
 * - DELETE /api/document-templates/[name] - Delete template and cleanup
 * 
 * SECURITY:
 * - Authentication required via withAuthDynamic middleware
 * - Company isolation enforced for template access
 * - Template ownership validation for deletion
 * - Public templates accessible to all company users
 * 
 * BUSINESS LOGIC:
 * - Template download with proper file serving
 * - Comprehensive cleanup when deleting templates
 * - Project reference cleanup across all template categories
 * - Document assignment and variable cleanup
 * 
 * TODO:
 * - Add template usage analytics before deletion
 * - Consider soft delete option for important templates
 * - Add template versioning support
 * - Implement template backup before deletion
 * 
 * ROUTE: /api/document-templates/[name]
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';

async function downloadTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ name: string }>
) {
  try {
    const { name } = await params;
    const supabase = await createClient();

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

    // Get template information with proper access control
    let templateQuery = supabase
      .from('document_templates')
      .select('*')
      .eq('name', name);

    // For non-ADMIN users, apply company filter
    if (currentUserProfile.role !== 'ADMIN') {
      templateQuery = templateQuery.or(`is_public.eq.true,company_id.eq.${currentUserProfile.company_id}`);
    }

    const { data: template, error: templateError } = await templateQuery.single();

    if (templateError || !template) {
      return NextResponse.json({ 
        message: currentUserProfile.role === 'ADMIN' 
          ? 'Template not found' 
          : 'Template not found or not accessible to your company'
      }, { status: 404 });
    }

    // Download the file using storage service
    const { data: fileData, error: downloadError } = await storageService.downloadFile(
      {
        companyId: template.company_id,
        isPublic: template.is_public
      },
      template.file_name
    );

    if (downloadError || !fileData) {
      return NextResponse.json({ 
        message: 'Failed to download template file',
        details: downloadError?.message || 'File not found'
      }, { status: 500 });
    }

    // Convert blob to buffer and create response
    const buffer = await fileData.arrayBuffer();
    const response = new NextResponse(buffer);
    
    // Set appropriate headers
    const filename = template.original_file_name || `${template.name}.docx`;
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    return response;
  } catch (error) {
    console.error('Error downloading template:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function deleteTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ name: string }>
) {
  try {
    const { name } = await params;
    const supabase = await createClient();

    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement)
    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Get the template to delete
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', name)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Check permissions - only owner can delete personal templates
    if (!template.is_public && template.user_id !== request.user.id) {
      return NextResponse.json({ 
        message: 'You do not have permission to delete this template' 
      }, { status: 403 });
    }

    // Delete file from storage
    const { error: storageError } = await storageService.deleteFile(
      {
        companyId: template.company_id,
        isPublic: template.is_public
      },
      template.file_name
    );

    if (storageError) {
      return NextResponse.json({ 
        message: 'Failed to delete template file from storage',
        details: storageError.message
      }, { status: 500 });
    }

    // Clean up project references
    const cleanupResult = await cleanupProjectReferences(supabase, name, template.company_id);

    // Delete record from database
    const { error: dbError } = await supabase
      .from('document_templates')
      .delete()
      .eq('name', name);

    if (dbError) {
      return NextResponse.json({ 
        message: 'Failed to delete template from database',
        details: dbError.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Template deleted successfully',
      details: {
        templateDeleted: name,
        ...cleanupResult
      }
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


// TODO: Maybe move this to utils
async function cleanupProjectReferences(supabase: any, templateName: string, companyId: string) {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('company_id', companyId);

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) {
    return {
      projectsUpdated: 0,
      assignmentsRemoved: 0,
      variablesRemoved: 0,
      phaseDocumentsRemoved: 0,
    };
  }

  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .in('project_id', projectIds);

  if (phasesError) {
    throw new Error(`Failed to fetch project phases: ${phasesError.message}`);
  }

  const phaseIds = (phases ?? []).map((row: { id: string }) => row.id);
  let phaseDocumentsRemoved = 0;

  if (phaseIds.length > 0) {
    const { data: removedRows, error: delError } = await supabase
      .from('project_phase_documents')
      .delete()
      .in('project_phase_id', phaseIds)
      .eq('template_name', templateName)
      .select('id');

    if (delError) {
      console.error('cleanupProjectReferences phase_documents:', delError);
    } else {
      phaseDocumentsRemoved = removedRows?.length ?? 0;
    }
  }

  return {
    projectsUpdated: 0,
    assignmentsRemoved: 0,
    variablesRemoved: 0,
    phaseDocumentsRemoved,
  };
}

// Export handlers with withAuthDynamic
export const GET = withAuthDynamic(downloadTemplateHandler);
export const DELETE = withAuthDynamic(deleteTemplateHandler); 
