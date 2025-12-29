import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { storageService } from '@/lib/services/integrations/storage-service';
import { processDocumentWithSmartProcessor } from '@/lib/services/processors/document-processor';
import { normalizeVariableName } from '@/lib/utils/variable-utils';

// TODO: Extract common document generation logic (template access, variable processing, file response) 
// to utils/document-generation/ to eliminate duplication with /api/projects/[id]/download/route.ts

async function generateDocumentHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
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
    // TODO: Figure out if we need normalizing
    Object.entries(variables).forEach(([key, value]) => {
      const normalizedKey = normalizeVariableName(key);
      
      // Handle different variable value formats
      let processedValue: any;
      if (typeof value === 'string') {
        processedValue = value;
      } else if (value && typeof value === 'object' && 'type' in value) {
        // Handle typed variables (image, date, etc.)
        const typedValue = value as { type: string; value: any };
        if (typedValue.type === 'image' && typedValue.value) {
          processedValue = typedValue.value;
        } else if (typedValue.type === 'date' && typedValue.value) {
          processedValue = typedValue.value;
        } else if (typedValue.type === 'dropdown' || typedValue.type === 'combobox') {
          processedValue = typedValue.value || '';
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

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFileName = `${project.name}_${template.name}_${timestamp}.docx`;

    console.log(`[GENERATE] Document generated successfully. Filename: ${outputFileName}, Size: ${processedBuffer.length} bytes`);

    // Return the generated document for immediate download
    // simpler response construction to avoid 405 errors on Vercel
    return new NextResponse(processedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
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