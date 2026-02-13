import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { storageService } from '@/lib/services/integrations/storage-service';
import { processDocumentWithSmartProcessor } from '@/lib/services/processors/document-processor';
import { normalizeVariableName } from '@/lib/utils/variable-utils';

// Force Node.js runtime for Vercel
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds (max for Hobby plan usually, but good to set)

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// TODO: Extract common document generation logic (template access, variable processing, file response) 
// to utils/document-generation/ to eliminate duplication with /api/projects/[id]/download/route.ts

async function generateDocumentHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  // LOG ENTRY POINT
  console.log('[GENERATE] Handler started for path:', request.nextUrl?.pathname);

  try {
    const { id: projectId } = await params;
    console.log(`[GENERATE] Processing request for project: ${projectId}`);

    const { templateName, variables, category } = await request.json();

    console.log(`[GENERATE] Request body:`, { templateName, category });
    console.log(`[GENERATE] Variables received:`, JSON.stringify(variables, null, 2));

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

    /**
     * TEMPLATE ACCESS CONTROL LOGIC
     * 
     * Users can access templates for document generation if ANY of the following is true:
     * 1. Template is company-wide (is_public = true) within their company
     * 2. Template is personal (is_public = false) and belongs to them
     * 3. Template is used in the current project (regardless of ownership)
     * 
     * Note: is_public means company-wide, not cross-company. All templates are company-scoped.
     * 
     * This ensures that:
     * - Project members can generate documents from any template used in their project
     * - Personal templates remain private unless used in a project
     * - Company-wide templates are accessible to all company members
     * - Multi-tenancy is enforced (no cross-company access)
     */

    // First, try to get template with basic access control
    let { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', templateName)
      .eq('category', category)
      .eq('company_id', currentUserProfile.company_id) // Always filter by company
      .or(`is_public.eq.true,user_id.eq.${request.user.id}`) // Company-wide OR personal
      .single();

    // If template not found with basic access, check if it's used in this project
    if (templateError || !template) {
      // Get the template without access restrictions but still within company
      const { data: projectTemplate, error: projectTemplateError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('name', templateName)
        .eq('category', category)
        .eq('company_id', currentUserProfile.company_id) // Still enforce company boundary
        .single();

      if (projectTemplateError || !projectTemplate) {
        return NextResponse.json({
          message: 'Template not found'
        }, { status: 404 });
      }

      // Check if this template is used in the current project
      // Projects store template names in category-specific arrays (e.g., architecture_templates, construction_templates)
      const categoryField = `${category.toLowerCase()}_templates`;
      const projectTemplates = project[categoryField] || [];

      if (!projectTemplates.includes(templateName)) {
        return NextResponse.json({
          message: 'Template not found or access denied'
        }, { status: 404 });
      }

      // Template is used in project, allow access regardless of ownership
      template = projectTemplate;
    }

    // Check for custom template, version lock, and get the appropriate file
    // Priority: 1. Custom template, 2. Version lock, 3. Current version
    let templateFileName = template.file_name;
    let templateVariables = template.variables;
    let isCustomTemplate = false;

    // First, check if project has a custom template for this template name
    if (project.custom_templates && project.custom_templates[templateName]) {
      const customTemplate = project.custom_templates[templateName];
      console.log(`[GENERATE] Using custom project template for ${templateName}`);
      templateFileName = customTemplate.file_name;
      templateVariables = customTemplate.variables;
      isCustomTemplate = true;
    }
    // If no custom template, check for version lock
    else if (project.template_version_locks && project.template_version_locks[templateName]) {
      const lockedVersion = project.template_version_locks[templateName];
      console.log(`[GENERATE] Using locked version ${lockedVersion} for template ${templateName}`);

      // Fetch version-specific file from template_versions table
      const { data: versionData, error: versionError } = await supabase
        .from('template_versions')
        .select('file_name, variables')
        .eq('template_name', templateName)
        .eq('version', lockedVersion)
        .single();

      if (!versionError && versionData) {
        templateFileName = versionData.file_name;
        templateVariables = versionData.variables;
        console.log(`[GENERATE] Found version ${lockedVersion} file: ${templateFileName}`);
      } else {
        console.warn(`[GENERATE] Locked version ${lockedVersion} not found for ${templateName}, using current version`);
      }
    } else {
      console.log(`[GENERATE] No custom template or version lock for ${templateName}, using current version`);
    }

    // Download template file
    // Note: Custom templates are always stored as non-public (project-specific)
    const { data: templateFile, error: templateDownloadError } = await storageService.downloadFile(
      {
        companyId: template.company_id,
        isPublic: isCustomTemplate ? false : template.is_public
      },
      templateFileName
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
    if (templateVariables && Array.isArray(templateVariables)) {
      templateVariables.forEach((templateVar: any) => {
        if (templateVar.originalTag && templateVar.name) {
          const normalizedName = normalizeVariableName(templateVar.name);
          tagNameMapping[normalizedName] = templateVar.originalTag;
        }
      });
    }

    console.log(`Template ${template.name} - Tag name mapping:`, tagNameMapping);

    // Add all template variables (already resolved with general/local logic)
    // TODO: Figure out if we need normalizing
    Object.entries(variables).forEach(([key, value]) => {
      const normalizedKey = normalizeVariableName(key);

      // Handle different variable value formats
      let processedValue: any;
      if (typeof value === 'string') {
        processedValue = value;
      } else if (value && typeof value === 'object' && 'type' in value) {
        // Handle typed variables (image, date, etc.)
        const typedValue = value as { type: string; value: any; dropdownOptions?: { displayText: string; value: string }[] };
        if (typedValue.type === 'image' && typedValue.value) {
          // Keep the full image object for the image processor to detect
          processedValue = typedValue;
        } else if (typedValue.type === 'date' && typedValue.value) {
          processedValue = typedValue.value;
        } else if (typedValue.type === 'dropdown' || typedValue.type === 'combobox') {
          // Keep the full dropdown object to preserve dropdownOptions for document generation
          if (typedValue.dropdownOptions && typedValue.dropdownOptions.length > 0) {
            processedValue = {
              type: typedValue.type,
              value: typedValue.value || '',
              dropdownOptions: typedValue.dropdownOptions
            };
          } else {
            processedValue = typedValue.value || '';
          }
        } else if (typedValue.type === 'checkbox') {
          processedValue = typedValue.value ? 'Yes' : 'No';
        } else {
          processedValue = typedValue.value || '';
        }
      } else {
        processedValue = value;
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

    console.log(`Template ${template.name} - Final variables count: ${Object.keys(allVariables).length}`);

    // Use the shared document processing function
    const processedBuffer = await processDocumentWithSmartProcessor(
      templateBuffer,
      allVariables,
      template,
      project.company_id
    );

    // Generate output filename - sanitize to avoid special characters breaking HTTP headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedProjectName = project.name
      .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
      .replace(/\s+/g, '_')      // Replace spaces with underscores
      .substring(0, 50);         // Limit length
    const sanitizedTemplateName = template.name
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    const outputFileName = `${sanitizedProjectName}_${sanitizedTemplateName}_${timestamp}.docx`;

    console.log(`[GENERATE] Document generated successfully. Filename: ${outputFileName}, Size: ${processedBuffer.length} bytes`);

    // Return the generated document for immediate download
    // Use RFC 5987 encoding for filename to support Unicode characters
    const encodedFilename = encodeURIComponent(outputFileName);

    return new NextResponse(processedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${outputFileName}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({
      message: 'Failed to generate document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuthDynamic(generateDocumentHandler);