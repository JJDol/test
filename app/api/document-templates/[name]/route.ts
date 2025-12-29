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
  // Find all projects in the company that use this template
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, architecture_templates, constructions_templates, fire_templates, authority_processing_templates, energy_templates, hvac_templates, execution_control_templates, document_assignments, template_variables')
    .eq('company_id', companyId);

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  const categoryFields = [
    'architecture_templates',
    'constructions_templates', 
    'fire_templates',
    'authority_processing_templates',
    'energy_templates',
    'hvac_templates',
    'execution_control_templates'
  ];

  let updatedProjectsCount = 0;
  let updatedAssignmentsCount = 0;
  let updatedVariablesCount = 0;

  // Process each project
  for (const project of projects || []) {
    let hasChanges = false;
    const updates: any = {};

    // Remove template from category arrays
    for (const field of categoryFields) {
      const templates = project[field as keyof typeof project] as string[];
      if (templates && templates.includes(templateName)) {
        updates[field] = templates.filter(t => t !== templateName);
        hasChanges = true;
      }
    }

    // Remove template from document_assignments
    if (project.document_assignments && project.document_assignments[templateName]) {
      const { [templateName]: removed, ...remainingAssignments } = project.document_assignments;
      updates.document_assignments = remainingAssignments;
      hasChanges = true;
      updatedAssignmentsCount++;
    }

    // Remove template from template_variables
    if (project.template_variables && project.template_variables[templateName]) {
      const { [templateName]: removed, ...remainingVariables } = project.template_variables;
      updates.template_variables = remainingVariables;
      hasChanges = true;
      updatedVariablesCount++;
    }

    // Update project if there are changes
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', project.id);

      if (updateError) {
        console.error(`Error updating project ${project.id}:`, updateError);
        // Continue with other projects even if one fails
      } else {
        updatedProjectsCount++;
      }
    }
  }

  return {
    projectsUpdated: updatedProjectsCount,
    assignmentsRemoved: updatedAssignmentsCount,
    variablesRemoved: updatedVariablesCount
  };
}

// Export handlers with withAuthDynamic
export const GET = withAuthDynamic(downloadTemplateHandler);
export const DELETE = withAuthDynamic(deleteTemplateHandler); 
