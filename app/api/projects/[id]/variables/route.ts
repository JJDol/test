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
    
    // Flatten general variables from category structure to flat structure for UI
    // TODO: Investigate if this logic is correct
    const flattenedGeneralValues: { [variableName: string]: { value: any; type: string } } = {};
    
    if (project.general_variables) {
      Object.values(project.general_variables).forEach((categoryVars: any) => {
        if (Array.isArray(categoryVars)) {
          categoryVars.forEach((variable: any) => {
            if (variable.name) {
              // Find the general value by looking for templates that use general mode for this variable
              let variableValue = null;
              let sourceTemplate = null;
              
              // Check each template that contains this variable
              for (const templateName of variable.documents || []) {
                const propagationSetting = project.variable_propagation_settings?.[templateName]?.[variable.name];
                const useGeneral = propagationSetting !== 'local'; // Default to general unless explicitly set to local
                
                if (useGeneral) {
                  const templateValue = project.template_variables?.[templateName]?.[variable.name];
                  if (templateValue !== null && templateValue !== undefined) {
                    // Check if the value is actually filled
                    const isFilled = typeof templateValue === 'string' 
                      ? templateValue.trim() !== ''
                      : templateValue && typeof templateValue === 'object' && 'value' in templateValue 
                        ? templateValue.value !== null && templateValue.value !== undefined
                        : false;
                    
                    if (isFilled) {
                      variableValue = templateValue;
                      sourceTemplate = templateName;
                      break; // Use the first filled value we find
                    }
                  }
                }
              }
              
              // If we found a value, propagate it to all templates that use this general variable
              if (variableValue && sourceTemplate) {
                const updatedTemplateVariables = { ...project.template_variables };
                let hasUpdates = false;
                
                variable.documents.forEach((templateName: string) => {
                  if (templateName !== sourceTemplate) {
                    const propagationSetting = project.variable_propagation_settings?.[templateName]?.[variable.name];
                    const useGeneral = propagationSetting !== 'local';
                    
                    if (useGeneral) {
                      const currentValue = project.template_variables?.[templateName]?.[variable.name];
                      const isCurrentValueEmpty = !currentValue || 
                        (typeof currentValue === 'string' && currentValue.trim() === '') ||
                        (currentValue && typeof currentValue === 'object' && 'value' in currentValue && !currentValue.value);
                      
                      if (isCurrentValueEmpty) {
                        if (!updatedTemplateVariables[templateName]) {
                          updatedTemplateVariables[templateName] = {};
                        }
                        updatedTemplateVariables[templateName][variable.name] = variableValue;
                        hasUpdates = true;
                      }
                    }
                  }
                });
                
                // Update the database if we have changes
                if (hasUpdates) {
                  supabase
                    .from('projects')
                    .update({ 
                      template_variables: updatedTemplateVariables,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', project.id)
                    .eq('company_id', userProfile.company_id)
                    .then(({ error }) => {
                      if (error) {
                        console.error('Error propagating general variable values:', error);
                      } else {
                        console.log(`Propagated general variable ${variable.name} from ${sourceTemplate} to other templates`);
                      }
                    });
                }
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
    
    // Update general variables (only if user has permission)
    // TODO: Investigate if this logic is correct
    if (generalVariables && permission) {
      // The generalVariables come in flattened format: {variableName: {value, type}}
      // But we need to store them back in the existing category structure
      // For now, we'll update the template_variables with these values since that's where they're actually stored
      // This is a temporary solution until we restructure the data storage
      
      const updatedTemplateVariables = { ...project.template_variables };
      
      // Update all templates that use each general variable
      Object.entries(generalVariables).forEach(([variableName, variableData]: [string, any]) => {
        const value = variableData.value;
        
        // Find all templates that use this general variable
        Object.values(project.general_variables || {}).forEach((categoryVars: any) => {
          if (Array.isArray(categoryVars)) {
            categoryVars.forEach((generalVar: any) => {
              if (generalVar.name === variableName && generalVar.documents) {
                // Update this variable in all templates that use it
                generalVar.documents.forEach((templateName: string) => {
                  if (!updatedTemplateVariables[templateName]) {
                    updatedTemplateVariables[templateName] = {};
                  }
                  updatedTemplateVariables[templateName][variableName] = value;
                });
              }
            });
          }
        });
      });
      
      updateData.template_variables = updatedTemplateVariables;
      console.log('Adding template_variables update for general variables:', updatedTemplateVariables);
    } else {
      console.log('Skipping general_variables update:', { 
        hasGeneralVariables: !!generalVariables, 
        canEditGeneral: permission 
      });
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