import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { storageService } from '@/lib/services/integrations/storage-service';
import { processDocumentWithSmartProcessor } from '@/lib/services/processors/document-processor';
import { normalizeVariableName } from '@/lib/utils/variable-utils';
import { DocumentVariable } from '@/lib/types/variable-types';

/**
 * LEGACY: Enhanced Document Generation Route
 * 
 * PURPOSE: This is a legacy version of document generation with some useful improvements
 * that should be extracted before deletion.
 * 
 * USEFUL ELEMENTS TO EXTRACT:
 * 1. Enhanced variable type handling (image, date, dropdown, checkbox, combobox)
 * 2. Project variable fallbacks (project_name, project_location, project_deadline, project_leader)
 * 3. Better error message structure
 * 
 * ISSUES WITH THIS ROUTE:
 * - Uses old authentication pattern (withAuth instead of withAuthDynamic)
 * - Incorrect template access control (doesn't enforce company boundaries properly)
 * - Manual pathname parsing instead of URL parameters
 * - Inconsistent company ID usage (user vs project company)
 * - Older response header pattern
 * 
 * TODO: 
 * - Extract useful variable type handling to utils/document-generation/
 * - Extract project variable fallbacks to utils/document-generation/
 * - Extract better error message structure
 * - Delete this route after extraction
 * - Update generate-document and download routes to use extracted utilities
 * 
 * ROUTE: POST /api/projects/[id]/generate-document-enhanced (LEGACY - TO BE DELETED)
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const projectId = request.nextUrl.pathname.split('/')[3];
    const { templateName, variables, category } = await request.json();

    if (!templateName || !category) {
      return NextResponse.json({ 
        message: 'Template name and category are required' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Get project with company access control
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ 
        message: 'Project not found or access denied' 
      }, { status: 404 });
    }

    // Get template with proper access control
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', templateName)
      .eq('category', category)
      .or(`is_public.eq.true,and(company_id.eq.${currentUserProfile.company_id},user_id.eq.${request.user.id})`)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ 
        message: 'Template not found or access denied' 
      }, { status: 404 });
    }

    // Download template file
    const { data: templateFile, error: templateDownloadError } = await storageService.downloadFile(
      {
        companyId: template.company_id,
        isPublic: template.is_public
      },
      template.file_name
    );
    
    if (templateDownloadError || !templateFile) {
      return NextResponse.json({ 
        message: 'Template file not found' 
      }, { status: 404 });
    }
    
    // Convert Blob to Buffer
    const templateBuffer = Buffer.from(await templateFile.arrayBuffer());

    // Prepare variables for processing - normalize the keys and add common project variables
    const allVariables: { [key: string]: any } = {};
    
    // Create a mapping from normalized names to original tag names for content controls
    const tagNameMapping: { [normalizedKey: string]: string } = {};
    if (template.variables && Array.isArray(template.variables)) {
      template.variables.forEach((templateVar: any) => {
        if (templateVar.originalTag && templateVar.name) {
          const normalizedName = normalizeVariableName(templateVar.name);
          tagNameMapping[normalizedName] = templateVar.originalTag;
        }
      });
    }
    
    console.log(`Template ${template.name} - Tag name mapping:`, tagNameMapping);
    
    // Add all template variables (already resolved with general/local logic)
    variables.forEach((variable: DocumentVariable) => {
      const variableName = variable.name;
      if (!variableName) return; // Skip variables without names
      
      const normalizedKey = normalizeVariableName(variableName);
      
      // Handle different variable value formats - only process text types
      let processedValue: any;
      if (variable.type === 'text') {
        processedValue = variable.value || '';
      } else {
        // Use placeholder for non-text types
        processedValue = `***${variableName}***`;
      }
      
      // Store with normalized key for content control processor
      allVariables[normalizedKey] = processedValue;
      
      // Also store with original tag name if it exists in the mapping
      if (tagNameMapping[normalizedKey]) {
        allVariables[tagNameMapping[normalizedKey]] = processedValue;
        console.log(`Mapped variable: ${normalizedKey} → ${tagNameMapping[normalizedKey]} = ${processedValue}`);
      }
    });

    // Add common project variables ONLY if not already provided by user
    if (!allVariables['project_name']) {
      allVariables['project_name'] = project.name;
    }
    if (!allVariables['project_location']) {
      allVariables['project_location'] = project.location;
    }
    if (!allVariables['project_deadline']) {
      allVariables['project_deadline'] = new Date(project.deadline).toLocaleDateString();
    }
    if (!allVariables['project_leader']) {
      allVariables['project_leader'] = project.leader?.name || 'Unassigned';
    }


    // Use the shared document processing function
    const processedBuffer = await processDocumentWithSmartProcessor(
      templateBuffer, 
      allVariables, 
      template, 
      currentUserProfile.company_id
    );

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFileName = `${project.name}_${template.name}_${timestamp}.docx`;

    // Return the file directly as a response (same as project download)
    const response = new NextResponse(processedBuffer as BodyInit);
    
    // Set response headers
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    response.headers.set('Content-Disposition', `attachment; filename="${outputFileName}"`);

    return response;

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({ 
      message: 'Failed to generate document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}); 