import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DocumentCategory } from '@/lib/types/types';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

import { VariableProcessor } from '@/lib/services/processors/project-variable-processor';

/**
 * Individual Project Operations API Routes
 * 
 * PURPOSE: Manage individual projects by ID
 * - Get project details with worker information
 * - Update project settings and template assignments
 * - Supports multi-tenant company isolation
 */

type WorkerDetails = {
  id: string;
  name: string;
  email: string;
  role: string;
};

async function getProjectHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
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

    // Build project query
    let projectQuery = supabase
      .from("projects")
      .select(`
        *,
        leader:leader_id (
          id,
          email,
          name,
          role
        )
      `)
      .eq("id", id);

    // Apply company filter only for non-ADMIN users
    if (currentUserProfile.role !== 'ADMIN') {
      projectQuery = projectQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: project, error } = await projectQuery.single();

    if (error) throw error;
    if (!project) return NextResponse.json({ message: 'Project not found or not accessible' }, { status: 404 });

    // If there are workers, fetch their details
    let workerDetails: WorkerDetails[] = [];
    if (project.workers && project.workers.length > 0) {
      const { data: workers, error: workersError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", project.workers);

      if (workersError) throw workersError;
      workerDetails = workers || [];
    }

    const transformedProject = {
      ...project,
      workers_names: workerDetails.map(w => w.name || w.email),
      assignedTo: project.leader?.name || project.leader?.email || 'Unassigned',
      leaderName: project.leader?.name || project.leader?.email || 'Unassigned',
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function updateProjectHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {

  try {
    const { id } = await params;
    const rawUpdates = await request.json();

    // Issue 15 (D3 옵션 B): `projects.deadline` 컬럼은 제거되고 `start_date`로
    // 분리됨. 옛 클라이언트가 `deadline`을 보내도 start_date로 매핑해 호환
    // 유지. `current_phase_deadline`은 GET 응답 hydrate 필드라 PATCH로
    // 받지 않는다.
    const updates: Record<string, unknown> = { ...rawUpdates };
    if ('deadline' in updates) {
      const legacy = updates.deadline;
      delete updates.deadline;
      if (!('start_date' in updates) || updates.start_date == null) {
        updates.start_date = legacy ?? null;
      }
    }
    if ('current_phase_deadline' in updates) {
      delete updates.current_phase_deadline;
    }

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

    // Verify the project exists and apply company filter only for non-ADMIN users
    let projectCheckQuery = supabase
      .from('projects')
      .select('company_id')
      .eq('id', id);

    if (currentUserProfile.role !== 'ADMIN') {
      projectCheckQuery = projectCheckQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: projectCheck, error: projectCheckError } = await projectCheckQuery.single();

    if (projectCheckError) throw projectCheckError;
    if (!projectCheck) {
      return NextResponse.json({ message: 'Project not found or not accessible' }, { status: 404 });
    }

    // If the project is being archived, update users' assigned_projects
    if (updates.is_archived === true) {
      // First, get the project to find all associated users
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("leader_id, workers")
        .eq("id", id)
        .single();
      
      if (!projectError && project) {
        // Collect all users associated with the project
        const allUserIds = [
          project.leader_id,
          ...(project.workers || [])
        ].filter(Boolean); // Remove any null/undefined values
        
        // Update each user's assigned_projects to remove this project
        if (allUserIds.length > 0) {
          for (const userId of allUserIds) {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("assigned_projects")
              .eq("id", userId)
              .single();
              
            if (!userError && userData) {
              const updatedProjects = (userData.assigned_projects || [])
                .filter((projectId: string) => projectId !== id.toString());
                
              await supabase
                .from("users")
                .update({ 
                  assigned_projects: updatedProjects,
                  updated_at: new Date().toISOString()
                })
                .eq("id", userId);
            }
          }
        }
      }
    }

    // If leader_id is being updated, handle the assigned_projects updates
    if ('leader_id' in updates) {
      // First, get the current project to find the old leader
      const { data: currentProject, error: projectError } = await supabase
        .from('projects')
        .select('leader_id')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      // If there was a previous leader, remove this project from their assigned_projects
      if (currentProject?.leader_id) {
        const { data: oldLeader, error: oldLeaderError } = await supabase
          .from('users')
          .select('assigned_projects')
          .eq('id', currentProject.leader_id)
          .single();

        if (!oldLeaderError && oldLeader) {
          const updatedProjects = (oldLeader.assigned_projects || []).filter(
            (projectId: string) => projectId !== id
          );

          await supabase
            .from('users')
            .update({ assigned_projects: updatedProjects })
            .eq('id', currentProject.leader_id);
        }
      }

      // Add the project to the new leader's assigned_projects
      const { data: newLeader, error: newLeaderError } = await supabase
        .from('users')
        .select('assigned_projects')
        .eq('id', updates.leader_id)
        .single();

      if (!newLeaderError && newLeader) {
        const existingProjects = newLeader.assigned_projects || [];
        if (!existingProjects.includes(id)) {
          await supabase
            .from('users')
            .update({ 
              assigned_projects: [...existingProjects, id],
              updated_at: new Date().toISOString()
            })
            .eq('id', updates.leader_id);
        }
      }
    }

    // If workers are being updated, handle the assigned_projects updates
    if ('workers' in updates) {
      // Get the current project to find existing workers
      const { data: currentProject, error: projectError } = await supabase
        .from('projects')
        .select('workers')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      const currentWorkerIds: string[] = currentProject?.workers || [];
      const newWorkerIds: string[] = (updates.workers as string[] | undefined) || [];

      // Find added and removed workers
      const addedWorkers = newWorkerIds.filter((workerId: string) => !currentWorkerIds.includes(workerId));
      const removedWorkers = currentWorkerIds.filter((workerId: string) => !newWorkerIds.includes(workerId));

      // Update added workers' assigned_projects
      for (const workerId of addedWorkers) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('assigned_projects')
          .eq('id', workerId)
          .single();

        if (!userError && userData) {
          const currentProjects = userData.assigned_projects || [];
          if (!currentProjects.includes(id.toString())) {
            await supabase
              .from('users')
              .update({ 
                assigned_projects: [...currentProjects, id.toString()],
                updated_at: new Date().toISOString()
              })
              .eq('id', workerId);
          }
        }
      }

      // Update removed workers' assigned_projects
      for (const workerId of removedWorkers) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('assigned_projects')
          .eq('id', workerId)
          .single();

        if (!userError && userData) {
          const currentProjects = userData.assigned_projects || [];
          await supabase
            .from('users')
            .update({ 
              assigned_projects: currentProjects.filter((projectId: string) => projectId !== id.toString()),
              updated_at: new Date().toISOString()
            })
            .eq('id', workerId);
        }
      }
    }

    // Continue with the rest of the template validation logic
    const templateFields = [
      'architecture_templates',
      'constructions_templates',
      'fire_templates',
      'authority_processing_templates',
      'energy_templates',
      'hvac_templates',
      'execution_control_templates'
    ];

    // Handle variable-related fields
    const variableFields = [
      'template_variables',
      'variable_propagation_settings',
      'global_variables',
      'category_variables'
    ];

    // Validate variable fields if they exist in updates
    for (const field of variableFields) {
      if (field in updates) {
        console.log(`Processing ${field}:`, updates[field]);
        // Add any specific validation logic here if needed
        // For now, we'll just log and allow the update
      }
    }

    for (const field of templateFields) {
      if (field in updates) {
        if (!Array.isArray(updates[field])) {
          return NextResponse.json({ 
            message: `Invalid ${field} format. Expected array of strings.` 
          }, { status: 400 });
        }

        // Verify templates exist with proper multi-tenant access control
        const category = field.replace('_templates', '').toUpperCase() as DocumentCategory;
        
        console.log(`Validating templates for ${category}:`, {
          field,
          category,
          templateNames: updates[field],
          userId: request.user.id,
          companyId: currentUserProfile.company_id
        });
        
        // Use userSupabase to respect RLS policies, but also add explicit company filtering
        // Split the query into two parts: public templates and user's private templates
        const publicTemplatesQuery = supabase
          .from('document_templates')
          .select('name, category, is_public, user_id, company_id')
          .eq('category', category)
          .eq('company_id', currentUserProfile.company_id)
          .eq('is_public', true)
          .in('name', updates[field]);

        const privateTemplatesQuery = supabase
          .from('document_templates')
          .select('name, category, is_public, user_id, company_id')
          .eq('category', category)
          .eq('company_id', currentUserProfile.company_id)
          .eq('is_public', false)
          .eq('user_id', request.user.id)
          .in('name', updates[field]);

        const [publicResult, privateResult] = await Promise.all([
          publicTemplatesQuery,
          privateTemplatesQuery
        ]);

        let templates: any[] = [];
        let templateError: any = null;

        if (publicResult.error && privateResult.error) {
          templateError = publicResult.error;
        } else {
          templates = [
            ...(publicResult.data || []),
            ...(privateResult.data || [])
          ];
        }

        if (templateError) {
          console.error('Template validation error:', templateError);
          throw templateError;
        }

        console.log(`Found templates for ${category}:`, templates);

        const validTemplates = templates?.map(t => t.name) || [];
        const invalidTemplates = updates[field].filter(t => !validTemplates.includes(t));

        console.log(`Template validation result for ${category}:`, {
          validTemplates,
          invalidTemplates,
          requestedTemplates: updates[field]
        });

        if (invalidTemplates.length > 0) {
          return NextResponse.json({
            message: `Invalid templates found for ${category}`,
            invalidTemplates,
            debug: {
              category,
              requestedTemplates: updates[field],
              foundTemplates: templates,
              validTemplates,
              userId: request.user.id,
              companyId: currentUserProfile.company_id
            }
          }, { status: 400 });
        }
      }
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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

    if (error) throw error;
    if (!project) return NextResponse.json({ message: 'Project not found' }, { status: 404 });

    // Sync project name / address into global_variables
    if ('name' in updates || 'location' in updates) {
      try {
        const { data: freshProject } = await supabase
          .from('projects')
          .select('global_variables')
          .eq('id', id)
          .single();
        if (freshProject) {
          const gv: { variables?: Array<{ name: string; type: string; value?: unknown }> } =
            (freshProject.global_variables as { variables?: Array<{ name: string; type: string; value?: unknown }> }) ?? { variables: [] };
          const vars: Array<{ name: string; type: string; value?: unknown }> = Array.isArray(gv.variables) ? [...gv.variables] : [];
          const syncFields: Array<{ key: string; fieldName: keyof typeof updates }> = [
            { key: 'project_name', fieldName: 'name' },
            { key: 'project_address', fieldName: 'location' },
          ];
          for (const { key, fieldName } of syncFields) {
            if (!(fieldName in updates)) continue;
            const newValue = updates[fieldName];
            const idx = vars.findIndex((v) => v.name === key);
            if (idx >= 0) {
              vars[idx] = { ...vars[idx], value: newValue };
            } else {
              vars.push({ name: key, type: 'text', value: newValue });
            }
          }
          await supabase
            .from('projects')
            .update({ global_variables: { ...gv, variables: vars } })
            .eq('id', id);
        }
      } catch (syncError) {
        console.error('Failed to sync global_variables after project update:', syncError);
      }
    }

    // Trigger recalculation of general variables if any template arrays were changed
    const templateArraysChanged = templateFields.some(field => field in updates);
    if (templateArraysChanged) {
      try {
        const variableProcessor = new VariableProcessor();
        await variableProcessor.updateProjectGeneralVariables(
          id,
          currentUserProfile.company_id,
          request.user.id
        );
        console.log('General variables recalculated after project update');
      } catch (recalcError) {
        console.error('Failed to recalculate general variables after project update:', recalcError);
      }
    }

    // Transform the response to match frontend expectations
    const transformedProject = {
      ...project,
      assignedTo: project.leader?.name || project.leader?.email || 'Unassigned',
      leaderName: project.leader?.name || project.leader?.email || 'Unassigned'
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function deleteProjectHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
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
    
    // Get the project to find all associated users and apply company filter only for non-ADMIN users
    let projectQuery = supabase
      .from("projects")
      .select("leader_id, workers, company_id")
      .eq("id", id);

    if (currentUserProfile.role !== 'ADMIN') {
      projectQuery = projectQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: project, error: projectError } = await projectQuery.single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ 
        message: 'Failed to fetch project',
        details: projectError.message
      }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ 
        message: 'Project not found or not accessible' 
      }, { status: 404 });
    }
    
    // Collect all users associated with the project
    const allUserIds = [
      project.leader_id,
      ...(project.workers || [])
    ].filter(Boolean); // Remove any null/undefined values
    
    // Update each user's assigned_projects to remove this project
    if (allUserIds.length > 0) {
      for (const userId of allUserIds) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("assigned_projects")
          .eq("id", userId)
          .single();
          
        if (!userError && userData) {
          const updatedProjects = (userData.assigned_projects || [])
            .filter((projectId: string) => projectId !== id.toString());
            
          await supabase
            .from("users")
            .update({ 
              assigned_projects: updatedProjects,
              updated_at: new Date().toISOString()
            })
            .eq("id", userId);
        }
      }
    }
    
    // Delete the project
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply dynamic authentication wrappers
export const GET = withAuthDynamic(getProjectHandler);
export const PATCH = withAuthDynamic(updateProjectHandler);
export const DELETE = withAuthDynamic(deleteProjectHandler); 