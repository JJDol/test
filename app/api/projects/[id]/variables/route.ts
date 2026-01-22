import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { VariableProcessor } from '@/lib/services/processors/project-variable-processor';

/**
 * Project Variables API Routes
 * 
 * PURPOSE: Manage template variables for individual projects
 * - Get processed variables for all project templates
 * - Update variable values with proper validation
 * - Handle general vs local variable propagation
 */

async function getVariablesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    
    // Get user's company for multi-tenancy
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();
    
    if (profileError || !userProfile?.company_id) {
      return NextResponse.json({ error: "User not assigned to company" }, { status: 403 });
    }
    
    // Verify project belongs to user's company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', userProfile.company_id)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // RBAC: Check access permissions
    const canAccess = (
      userProfile.role === 'ADMIN' ||
      userProfile.role === 'COMPANY_ADMIN' ||
      project.leader_id === request.user.id ||
      project.workers?.includes(request.user.id)
    );
    
    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Process variables using the new service
    const variableProcessor = new VariableProcessor();
    const processedVariables = await variableProcessor.processProjectVariables(
      projectId, 
      userProfile.company_id, 
      request.user.id
    );
    
    // Helper to get variable name regardless of object structure
    const varName = (v: any) => typeof v === 'string' ? v : v.name;

    // Flatten global and category variables for UI
    const flattenedGeneralValues: { [variableName: string]: { value: any; type: string } } = {};
    
    // Process global variables
    if (project.global_variables?.variables) {
      project.global_variables.variables.forEach((variable: any) => {
        if (variable.name) {
          // Find the value from template_variables (all templates with this global var should have the same value)
          let variableValue = '';
          const categories = Object.keys(project.template_variables || {});
          
          for (const cat of categories) {
            const templates = Object.keys(project.template_variables[cat] || {});
            for (const tName of templates) {
              const vars = project.template_variables[cat][tName]?.variables || [];
              const v = vars.find((varObj: any) => varName(varObj) === variable.name);
              if (v && v.value) {
                variableValue = v.value;
                break;
              }
            }
            if (variableValue) break;
          }

          flattenedGeneralValues[variable.name] = {
            value: variableValue,
            type: variable.type || 'text'
          };
        }
      });
    }

    // Process category variables
    if (project.category_variables) {
      Object.values(project.category_variables).forEach((catObj: any) => {
        if (catObj.variables) {
          catObj.variables.forEach((variable: any) => {
            if (variable.name && !flattenedGeneralValues[variable.name]) {
              // Find the value from template_variables
              let variableValue = '';
              const categories = Object.keys(project.template_variables || {});
              for (const cat of categories) {
                const templates = Object.keys(project.template_variables[cat] || {});
                for (const tName of templates) {
                  const vars = project.template_variables[cat][tName]?.variables || [];
                  const v = vars.find((varObj: any) => varName(varObj) === variable.name);
                  if (v && v.value) {
                    variableValue = v.value;
                    break;
                  }
                }
                if (variableValue) break;
              }

              flattenedGeneralValues[variable.name] = {
                value: variableValue,
                type: variable.type || 'text'
              };
            }
          });
        }
      });
    }

    return NextResponse.json({
      generalVariables: processedVariables.globalVariables,
      documentSpecificVariables: processedVariables.documentSpecificVariables,
      generalVariablesByCategory: processedVariables.categoryVariables,
      currentValues: {
        general: flattenedGeneralValues,
        template: project.template_variables || {},
        propagation: project.variable_propagation_settings || {}
      },
    });
    
  } catch (error) {
    console.error('Error fetching variables:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function updateVariablesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const { generalVariables = null, templateVariables = null, propagationSettings = null } = await request.json();
    
    console.log('API received data:', {
      projectId,
      generalVariables,
      templateVariables,
      propagationSettings
    });
    
    const supabase = await createClient();
    
    // Get user's company for multi-tenancy
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();
    
    if (profileError || !userProfile?.company_id) {
      return NextResponse.json({ error: "User not assigned to company" }, { status: 403 });
    }
    
    // Verify project belongs to user's company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', userProfile.company_id)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Check edit permissions
    const variableProcessor = new VariableProcessor();
    const permission = await variableProcessor.checkProjectAccess(
      projectId,
      userProfile.company_id,
      request.user.id
    );
    
    if (!permission) {
      return NextResponse.json({ error: "Edit access denied" }, { status: 403 });
    }
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    console.log('User permissions:', permission);
    
    // Update global/category variables (only if user has permission)
    if (generalVariables && permission) {
      const updatedTemplateVariables = { ...project.template_variables };
      
      // Update all templates that use each general variable
      Object.entries(generalVariables).forEach(([variableName, variableData]: [string, any]) => {
        const value = variableData.value;
        
        // Update in global variables
        const isGlobal = project.global_variables?.variables?.some((v: any) => v.name === variableName);
        
        if (isGlobal) {
          // Find all templates that have this variable and are in GLOBAL scope
          Object.keys(project.template_variables || {}).forEach(cat => {
            Object.keys(project.template_variables[cat] || {}).forEach(tName => {
              const scope = project.variable_propagation_settings?.[cat]?.[tName]?.[variableName]?.currentScope;
              if (scope === 'GLOBAL') {
                if (!updatedTemplateVariables[cat][tName]) {
                  updatedTemplateVariables[cat][tName] = { variables: [] };
                }
                const vIndex = updatedTemplateVariables[cat][tName].variables.findIndex((v: any) => v.name === variableName);
                if (vIndex >= 0) {
                  updatedTemplateVariables[cat][tName].variables[vIndex].value = value;
                }
              }
            });
          });
        }

        // Update in category variables
        Object.keys(project.category_variables || {}).forEach(cat => {
          const isCategoryVar = project.category_variables[cat]?.variables?.some((v: any) => v.name === variableName);
          if (isCategoryVar) {
            Object.keys(project.template_variables[cat] || {}).forEach(tName => {
              const scope = project.variable_propagation_settings?.[cat]?.[tName]?.[variableName]?.currentScope;
              if (scope === 'CATEGORY') {
                if (!updatedTemplateVariables[cat][tName]) {
                  updatedTemplateVariables[cat][tName] = { variables: [] };
                }
                const vIndex = updatedTemplateVariables[cat][tName].variables.findIndex((v: any) => v.name === variableName);
                if (vIndex >= 0) {
                  updatedTemplateVariables[cat][tName].variables[vIndex].value = value;
                }
              }
            });
          }
        });
      });
      
      updateData.template_variables = updatedTemplateVariables;
    }
    
    // Update template variables (if provided)
    if (templateVariables) {
      // Merge with any general variable updates
      const finalTemplateVariables = updateData.template_variables 
        ? { ...updateData.template_variables, ...templateVariables }
        : templateVariables;
      
      updateData.template_variables = finalTemplateVariables;
      console.log('Adding template_variables to update:', finalTemplateVariables);
    }
    
    // Update propagation settings (only if user has permission)
    if (propagationSettings && permission) {
      updateData.variable_propagation_settings = propagationSettings;
      console.log('Adding variable_propagation_settings to update:', propagationSettings);
    } else {
      console.log('Skipping propagation_settings update:', { 
        hasPropagationSettings: !!propagationSettings, 
        canEditGeneral: permission 
      });
    }
    
    console.log('Final updateData:', updateData);
    
    // Update project with new variables
    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('company_id', userProfile.company_id); // Multi-tenant safety
    
    if (updateError) {
      console.error('Error updating project variables:', updateError);
      return NextResponse.json({ 
        error: "Failed to update variables",
        details: updateError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Variables updated successfully"
    });
    
  } catch (error) {
    console.error('Error updating variables:', error);
    return NextResponse.json({ 
      error: "Failed to update variables",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const GET = withAuthDynamic(getVariablesHandler);
export const POST = withAuthDynamic(updateVariablesHandler); 