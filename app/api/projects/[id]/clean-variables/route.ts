import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

/**
 * Project Clean Variables API Route
 * 
 * PURPOSE: Clean and normalize project template variables
 * - Remove unused variables from project templates
 * - Set empty values to null for consistency
 * - Ensure all template variables are properly structured
 * ROUTE: /api/projects/[id]/clean-variables
 */
// TODO: This function might not be used in the future, it was for handling empty text field after deleting text from the text field
async function cleanVariablesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        url: !!supabaseUrl, 
        key: !!supabaseServiceKey 
      });
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    // Get current user profile (auth middleware already verified user exists)
    const userSupabase = await createClient();
    const { data: currentUserProfile, error: currentUserError } = await userSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Get the specific project and apply company filter only for non-ADMIN users
    let projectQuery = supabase
      .from('projects')
      .select('id, template_variables, architecture_templates, construction_templates, fire_safety_templates, plumbing_templates, electrical_templates, ventilation_templates, energy_templates, documentation_templates, company_id')
      .eq('id', projectId);

    if (currentUserProfile.role !== 'ADMIN') {
      projectQuery = projectQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: project, error: projectError } = await projectQuery.single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ 
        message: currentUserProfile.role === 'ADMIN' 
          ? 'Project not found' 
          : 'Project not found or not accessible in your company' 
      }, { status: 404 });
    }

    // Get all templates with their variables
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('name, variables');

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json({ message: 'Failed to fetch templates' }, { status: 500 });
    }

    // Create a map of template names to their variables
    // Handle both old format (string[]) and new format (VariableWithType[])
    const templateVariables = new Map(
      templates.map(template => [
        template.name, 
        template.variables.map((variable: any) => 
          typeof variable === 'string' ? variable.split('|')[0].trim() : variable.name
        )
      ])
    );

    const allTemplateNames = [
      ...project.architecture_templates || [],
      ...project.construction_templates || [],
      ...project.fire_safety_templates || [],
      ...project.plumbing_templates || [],
      ...project.electrical_templates || [],
      ...project.ventilation_templates || [],
      ...project.energy_templates || [],
      ...project.documentation_templates || []
    ];

    // Clean up variables: set empty strings to null, ensure all template variables exist
    const cleanedVariables: Record<string, Record<string, string | null>> = {};

    // Process all templates that are actually used in the project
    for (const templateName of allTemplateNames) {
      const currentTemplateVars = templateVariables.get(templateName);
      if (currentTemplateVars) {
        cleanedVariables[templateName] = {};
        
        // Process all variables that exist in the current template
        for (const varName of currentTemplateVars) {
          const existingValue = project.template_variables?.[templateName]?.[varName];
          
          if (existingValue !== undefined && existingValue !== null && existingValue.trim() !== '') {
            // Keep non-empty values as-is
            cleanedVariables[templateName][varName] = existingValue;
          } else {
            // Set empty/missing values to null
            cleanedVariables[templateName][varName] = null;
          }
        }
      }
    }

    // Update the project with cleaned variables
    const { error: updateError } = await supabase
      .from('projects')
      .update({ template_variables: cleanedVariables })
      .eq('id', projectId);

    if (updateError) {
      console.error(`Error updating project ${projectId}:`, updateError);
      return NextResponse.json({ 
        message: 'Failed to update project',
        error: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Variables cleaned up successfully - empty values set to null, all template variables initialized',
      template_variables: cleanedVariables
    });

  } catch (error) {
    console.error('Error cleaning up variables:', error);
    return NextResponse.json({ 
      message: 'Failed to clean up variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuthDynamic(cleanVariablesHandler); 