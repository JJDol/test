import { createClient } from '@/lib/supabase/server';
import { PostgrestError } from "@supabase/supabase-js";
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { VariableProcessor } from '@/lib/services/processors/project-variable-processor';

/**
 * Projects Collection API Routes
 * 
 * PURPOSE: Manage construction projects at the collection level
 * - List all projects with role-based access control
 * - Create new projects with template assignments
 * - Supports multi-tenant company isolation
 */

async function getProjectsHandler(request: AuthenticatedRequest) {
  const supabase = await createClient();

  try {
    // Get query parameters for ADMIN company filtering
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company_id');

    // Always fetch fresh user data from database to avoid stale JWT issues
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role');
    const serviceClient = createServiceRoleClient();
    
    const { data: userProfile, error: profileError } = await serviceClient
      .from('users')
      .select('role, assigned_projects, company_id')
      .eq('id', request.user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Failed to fetch user profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!userProfile.company_id && userProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Use service role client for queries (already imported above)
    const queryClient = serviceClient;

    // Build query with explicit company filtering
    let query = queryClient
      .from("projects")
      .select(`
        *,
        leader:leader_id (
          id,
          email,
          name,
          role
        )
      `);

    // ALWAYS apply company filtering first (security first)
    if (userProfile.role === 'ADMIN') {
      // ADMIN (developers) can filter by specific company or see all
      if (companyFilter) {
        query = query.eq('company_id', companyFilter);
      }
      // If no companyFilter, ADMIN sees all projects from all companies
      // Note: This is intentional for developer access
    } else {
      // All other roles are ALWAYS restricted to their company
      if (!userProfile.company_id) {
        return NextResponse.json({ 
          error: 'User not associated with any company' 
        }, { status: 403 });
      }
      query = query.eq('company_id', userProfile.company_id);
    }

    // Apply role-based filtering using optimized assigned_projects field
    // Both MANAGER and USER roles use the same logic - show only assigned projects
    if (userProfile.role === 'MANAGER' || userProfile.role === 'USER') {
      if (userProfile.assigned_projects && userProfile.assigned_projects.length > 0) {
        query = query.in('id', userProfile.assigned_projects);
      } else {
        // Fallback: no assigned projects, show empty result
        query = query.eq('id', 'no-projects'); //TODO: Fix this to handle error on dashboard
      }
    }
    // ADMIN sees all projects (filtered by company if specified)
    // COMPANY_ADMIN sees all projects from their company (no additional filtering)
    
    const { data, error } = await query;
    
    
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    const pgError = error as PostgrestError;
    return NextResponse.json({ error: pgError.message }, { status: 500 });
  }
}

async function createProjectHandler(request: AuthenticatedRequest) {
  const supabase = await createClient();

  try {
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

    const body = await request.json();
    const { name, location, deadline, assignedTo, selectedTemplates } = body;
    
    console.log('Creating project with input:', { name, location, deadline, assignedTo, selectedTemplates });

    // Find the assigned user and ensure they're in the same company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq."${assignedTo}",email.eq."${assignedTo}"`)
      .eq('company_id', currentUserProfile.company_id) // 🔑 MULTI-TENANT FILTER
      .single();

    if (userError) {
      console.error('Error querying users:', userError);
      throw userError;
    }

    if (!userData) {
      console.error('No user found with id/email in same company:', assignedTo);
      return NextResponse.json({ 
        error: 'User not found or not in your company',
        details: `No user found with provided identifier in your company: ${assignedTo}`,
      }, { status: 404 });
    }

    console.log('Found user:', userData);

    // Prepare template arrays based on selectedTemplates
    const architecture_templates: string[] = [];
    const constructions_templates: string[] = [];
    const fire_templates: string[] = [];
    const authority_processing_templates: string[] = [];
    const energy_templates: string[] = [];
    const hvac_templates: string[] = [];
    const execution_control_templates: string[] = [];
    
    // Collect all selected template names to fetch their details
    const allSelectedTemplateNames: string[] = [];

    // Process selected templates
    if (selectedTemplates && typeof selectedTemplates === 'object') {
      console.log('Processing selected templates:', selectedTemplates);
      
      // Get all selected project template names
      const projectTemplateEntries = Object.entries(selectedTemplates)
        .filter(([_, templateName]) => templateName && templateName !== 'none');
      
      console.log('Project template entries:', projectTemplateEntries);
      
      if (projectTemplateEntries.length > 0) {
        // Fetch all selected project templates at once
        const projectTemplateNames = projectTemplateEntries.map(([_, name]) => String(name));
        
        if (projectTemplateNames.length > 0) {
          // Fetch project templates to get their associated document templates
          const { data: projectTemplates, error: projectTemplateError } = await supabase
            .from('project_templates')
            .select('name, category, templates')
            .eq('company_id', currentUserProfile.company_id)
            .in('name', projectTemplateNames);
            
          if (projectTemplateError) {
            console.error('Error fetching project templates:', projectTemplateError);
          }
          else if (projectTemplates && projectTemplates.length > 0) {
            console.log('Found project templates:', projectTemplates);
            
            // Process each project template
            for (const projectTemplate of projectTemplates) {
              const category = projectTemplate.category.toLowerCase();
              const docTemplates = projectTemplate.templates || [];
              
              console.log(`Project template ${projectTemplate.name} (${category}) has ${docTemplates.length} document templates`);
              
            // Since project template category = document template category,
            // we can directly assign them without additional lookups or database queries
              if (Array.isArray(docTemplates) && docTemplates.length > 0) {
                // Add all document templates to the appropriate category array
                switch (category) {
                  case 'architecture':
                    architecture_templates.push(...docTemplates);
                    break;
                  case 'constructions':
                    constructions_templates.push(...docTemplates);
                    break;
                  case 'fire':
                    fire_templates.push(...docTemplates);
                    break;
                  case 'authority_processing':
                    authority_processing_templates.push(...docTemplates);
                    break;
                  case 'energy':
                    energy_templates.push(...docTemplates);
                    break;
                  case 'hvac':
                    hvac_templates.push(...docTemplates);
                    break;
                  case 'execution_control':
                    execution_control_templates.push(...docTemplates);
                    break;
                  default:
                    console.warn(`Unknown project template category: ${category}`);
                }
                
                // Also collect all template names for the final assignment
                allSelectedTemplateNames.push(...docTemplates);
              }
            }
          }
        }
      }
    }

    console.log('Final template arrays:', {
      architecture_templates,
      constructions_templates,
      fire_templates,
      authority_processing_templates,
      energy_templates,
      hvac_templates,
      execution_control_templates
    });

    // Validate that all selected templates exist (only the ones we actually collected)
    // TODO: Maybe this is duplicate
    if (allSelectedTemplateNames.length > 0) {
      const { data: existingTemplates, error: validationError } = await supabase
        .from('document_templates')
        .select('name')
        .in('name', allSelectedTemplateNames);

      if (validationError) {
        console.error('Template validation error:', validationError);
        throw validationError;
      }

      const existingTemplateNames = existingTemplates?.map(t => t.name) || [];
      const missingTemplates = allSelectedTemplateNames.filter(name => !existingTemplateNames.includes(name));

      if (missingTemplates.length > 0) {
        console.error('Missing templates:', missingTemplates);
        return NextResponse.json({
          error: 'Some selected templates do not exist',
          missingTemplates
        }, { status: 400 });
      }
    }

    // Create the project
    // TODO: Change id to be UUID type
    // TODO: Think about what we need to select from the project table
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        location,
        deadline,
        leader_id: userData.id,
        company_id: currentUserProfile.company_id, // 🔑 MULTI-TENANT ASSIGNMENT
        architecture_templates,
        constructions_templates,
        fire_templates,
        authority_processing_templates,
        energy_templates,
        hvac_templates,
        execution_control_templates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        leader:leader_id (
          id,
          email,
          name,
          role
        )
      `)
      .single();

    if (error) {
      console.error("Error creating project:", error);
      throw error;
    }

    console.log("Project created successfully:", data);

    // Detect and store general variables for the newly created project
    // TODO: Check if this works - VERY IMPORTANT
    if (allSelectedTemplateNames.length > 0) {
      try {
        const variableProcessor = new VariableProcessor();
        await variableProcessor.updateProjectGeneralVariables(
          data.id,
          data.company_id,
          request.user.id
        );
        console.log("General variables detected and stored for new project:", data.id);
      } catch (error) {
        console.error('Error detecting general variables for new project:', error);
        // Don't fail the project creation if general variable detection fails
      }
    }

    // Update the assigned user's assigned_projects array
    const { data: assignedUser, error: assignedUserError } = await supabase
      .from("users")
      .select("assigned_projects")
      .eq("id", userData.id)
      .single();

    if (!assignedUserError && assignedUser) {
      const currentAssignedProjects = assignedUser.assigned_projects || [];
      const updatedAssignedProjects = [...currentAssignedProjects, data.id];

      await supabase
        .from("users")
        .update({ 
          assigned_projects: updatedAssignedProjects,
          updated_at: new Date().toISOString()
        })
        .eq("id", userData.id);
    }

    return NextResponse.json(data);
  } catch (error) {
    const pgError = error as PostgrestError;
    console.log("Error in POST request:", pgError);
    return NextResponse.json({ error: pgError.message }, { status: 500 });
  }
}

// Handle CORS preflight for Word add-in
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Apply authentication wrappers
export const GET = withAuth(getProjectsHandler);
export const POST = withAuth(createProjectHandler); 