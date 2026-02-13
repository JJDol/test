// This is used for project variables
// 
// UPDATED: Now uses declared scope from template variables instead of auto-sorting
// Variables have their scope (global, category, local) defined in the template via Content Control tag property

import { createClient } from '@/lib/supabase/server';
import { DocumentVariable, VariableScope } from '@/lib/types/variable-types';
import { DocumentCategory, DocumentTemplate } from '@/lib/types/types';


export interface ProjectVariables {
  globalVariables: DocumentVariable[];
  documentSpecificVariables: DocumentVariable[];
  categoryVariables: { [category: string]: { variables: DocumentVariable[] } }
  variableRegistry: Map<string, {
    documents: string[];
    category: Set<DocumentCategory>;
    scope: VariableScope; // Now using declared scope instead of computed
    type: string;
  }>
  propagationSettings: {
    variable: DocumentVariable;
    propagationScope: string;
  }[];
}


export class VariableProcessor {
  /**
   * Main function to process project variables
   * 
   * UPDATED: Now uses declared scope from template variables instead of auto-sorting
   * The scope (global, category, local) is defined in the template via Content Control tag property
   */
  async processProjectVariables(
    projectId: string, 
    companyId: string, 
    userId: string
  ): Promise<ProjectVariables & { project: any, templates: DocumentTemplate[] }> {
    
    // RBAC Check - ensure user can access this project
    const hasAccess = await this.checkProjectAccess(projectId, companyId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to project');
    }
    
    // Get templates with company_id filter for multi-tenancy (Project-Aware)
    const { templates, project } = await this.getProjectTemplates(projectId, companyId, userId);

    // Build variable registry - now using declared scope from variables
    const variableRegistry = new Map<string, {
      documents: string[];
      category: Set<DocumentCategory>;
      scope: VariableScope;
      type: string;
    }>();
    
    templates.forEach(template => {
      const templateVariables = template.variables;
      
      templateVariables.forEach((variable: DocumentVariable) => {
        // Get the declared scope from the variable (defaults to 'local' if not set)
        const declaredScope: VariableScope = (variable as any).scope || 'local';
        
        if (variableRegistry.has(variable.name)) {
          const existing = variableRegistry.get(variable.name)!;
          existing.documents.push(template.name);
          existing.category.add(template.category);
          // If same variable appears in multiple templates, use the highest scope declared
          // (global > category > local) to ensure proper propagation
          existing.scope = this.getHigherScope(existing.scope, declaredScope);
        } else {
          variableRegistry.set(variable.name, {
            documents: [template.name],
            category: new Set([template.category]),
            scope: declaredScope,
            type: variable.type
          });
        }
      });
    });

    // Build arrays based on declared scope (no auto-sorting needed)
    const globalVariables = Array.from(variableRegistry.entries())
      .filter(([, data]) => data.scope === 'global')
      .map(([name, data]) => ({ name, type: data.type, scope: 'global' } as DocumentVariable));

    const categoryVariables: { [category: string]: { variables: DocumentVariable[] } } = {};
    Array.from(variableRegistry.entries())
      .filter(([, data]) => data.scope === 'category')
      .forEach(([name, data]) => {
        // Add to each category where this variable appears
        data.category.forEach(cat => {
          if (!categoryVariables[cat]) {
            categoryVariables[cat] = { variables: [] };
          }
          categoryVariables[cat].variables.push({ name, type: data.type, scope: 'category' } as DocumentVariable);
        });
      });

    const documentSpecificVariables = Array.from(variableRegistry.entries())
      .filter(([, data]) => data.scope === 'local')
      .map(([name, data]) => ({ name, type: data.type, scope: 'local' } as DocumentVariable));

    const propagationSettings = Array.from(variableRegistry.entries())
      .map(([name, data]) => ({
        variable: { name, type: data.type, scope: data.scope } as DocumentVariable,
        propagationScope: data.scope
      }));

    return { globalVariables, documentSpecificVariables, categoryVariables, variableRegistry: variableRegistry as any, propagationSettings, project, templates };
  }

  /**
   * Get the higher scope between two scopes
   * Hierarchy: global > category > local
   */
  private getHigherScope(scope1: VariableScope, scope2: VariableScope): VariableScope {
    const scopeLevels: Record<VariableScope, number> = { local: 1, category: 2, global: 3 };
    return scopeLevels[scope1] >= scopeLevels[scope2] ? scope1 : scope2;
  }
  
  // TODO: refactor this to centralize RBAC checks
  async checkProjectAccess(projectId: string, companyId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();
    
    // Check if user belongs to same company and has access to project
    // TODO: use API route for this
    const { data: project } = await supabase
      .from('projects')
      .select('company_id, leader_id, workers')
      .eq('id', projectId)
      .eq('company_id', companyId) // Multi-tenant filter
      .single();
    
    if (!project) return false;
    
    // Get user role for RBAC
    // TODO: use API route for this
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single();
    
    if (!user) return false;
    
    // RBAC: Check if user is admin, leader, or assigned worker
    return (
      user.role === 'ADMIN' ||
      user.role === 'COMPANY_ADMIN' ||
      project.leader_id === userId ||
      project.workers?.includes(userId)
    );
  }
  
  private async getProjectTemplates(projectId: string, companyId: string, userId: string): Promise<{ templates: DocumentTemplate[], project: any }> {
    const supabase = await createClient();
    
    // Get project to find all template names and custom templates
    const { data: project } = await supabase
      .from('projects')
      .select('architecture_templates, constructions_templates, fire_templates, authority_processing_templates, energy_templates, hvac_templates, execution_control_templates, custom_templates, company_id, leader_id, workers, template_variables, global_variables, category_variables, variable_propagation_settings')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single();
    
    if (!project) return { templates: [], project: null };
    
    // Collect all template names from all categories
    const allTemplateNames = [
      ...(project.architecture_templates || []),
      ...(project.constructions_templates || []),
      ...(project.fire_templates || []),
      ...(project.authority_processing_templates || []),
      ...(project.energy_templates || []),
      ...(project.hvac_templates || []),
      ...(project.execution_control_templates || [])
    ];
    
    if (allTemplateNames.length === 0) return { templates: [], project };
    
    // Get templates that are accessible to the user
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .in('name', allTemplateNames)
      .eq('company_id', companyId)
      .or(`is_public.eq.true,user_id.eq.${userId}`);
    
    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return { templates: [], project };
    }
    
    // Merge customizations: if project has custom variables for a template, use them
    const processedTemplates = (templates || []).map(template => {
      const customization = project.custom_templates?.[template.name];
      if (customization && customization.variables) {
        return {
          ...template,
          variables: customization.variables
        };
      }
      return template;
    });
    
    return { templates: processedTemplates, project };
  }
  

  /**
   * Update general variables for a project when templates change
   * This should be called when templates are added/removed from a project
   * 
   * UPDATED: Now uses declared scope from template variables instead of auto-sorting
   */
  async updateProjectGeneralVariables(
    projectId: string,
    companyId: string,
    userId: string
  ): Promise<void> {
    try {
      // Process variables - now using declared scope from templates
      const {
        globalVariables, 
        categoryVariables, 
        variableRegistry, 
        project, 
        templates 
      } = await this.processProjectVariables(projectId, companyId, userId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if we have any global variables
      const hasGlobalVariables = globalVariables.length > 0;

      // Handle value propagation based on declared scope
      let updatedTemplateVariables = { ...project.template_variables };
      let hasPropagationChanges = false;

      // Prepare update data for propagation settings
      const updatedPropagationSettings = { ...(project.variable_propagation_settings || {}) };

      // Process each variable for value propagation using declared scope
      Array.from(variableRegistry.entries()).forEach(([variableName, data]) => {
        // Use the declared scope (already in lowercase: global, category, local)
        const declaredScope = data.scope;
        const newScope = declaredScope.toUpperCase(); // Convert to uppercase for DB storage consistency
        
        // Update propagation settings for each template that has this variable
        data.category.forEach(cat => {
          if (!updatedPropagationSettings[cat]) {
            updatedPropagationSettings[cat] = {};
          }
          
          data.documents.forEach(tName => {
            // Only update if the template belongs to this category
            const template = templates.find(t => t.name === tName);
            if (template?.category === cat) {
              if (!updatedPropagationSettings[cat][tName]) {
                updatedPropagationSettings[cat][tName] = {};
              }
              
              // With declared scope, the scope is fixed - no possibleScopes calculation needed
              updatedPropagationSettings[cat][tName][variableName] = {
                declaredScope: declaredScope, // Store the original declared scope
                currentScope: newScope,
                isOverridden: false // Declared scope cannot be overridden
              };
            }
          });
        });

        // Get previous scope for comparison (if any)
        const firstTemplate = data.documents[0];
        const firstCat = templates.find(t => t.name === firstTemplate)?.category;
        const previousScope = firstCat 
          ? (project.variable_propagation_settings?.[firstCat]?.[firstTemplate]?.[variableName]?.currentScope || 'LOCAL') 
          : 'LOCAL';
        
        console.log(`Processing variable ${variableName}: scope = ${declaredScope} (previous: ${previousScope})`);
        
        // Handle scope changes (for migration from old system or template updates)
        if (this.isScopeDecreasing(previousScope, newScope)) {
          console.log(`  Variable ${variableName} scope decreased, cleaning up...`);
          this.cleanupReducedScope(variableName, previousScope, newScope, data, updatedTemplateVariables);
          hasPropagationChanges = true;
        }
        
        // Find source value and propagate based on declared scope
        const sourceValue = this.findSourceValue(variableName, data.documents, project.template_variables);
        
        if (sourceValue) {
          console.log(`  Found source value for ${variableName}: ${sourceValue.value}`);
          this.propagateValueByScope(variableName, sourceValue, newScope, data, updatedTemplateVariables, templates);
          hasPropagationChanges = true;
        }
      });

      // Prepare final update data
      const updateData: any = {
        global_variables: hasGlobalVariables ? { variables: globalVariables } : { variables: [] },
        category_variables: categoryVariables,
        variable_propagation_settings: updatedPropagationSettings,
        updated_at: new Date().toISOString()
      };

      // Include template variables if we have propagation changes
      if (hasPropagationChanges) {
        updateData.template_variables = updatedTemplateVariables;
      }

      const supabase = await createClient();
      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error updating project general variables:', error);
        throw new Error('Failed to update general variables');
      }

      console.log(`Updated variables for project ${projectId}. Global: ${hasGlobalVariables}, Changes: ${hasPropagationChanges}`);
    } catch (error) {
      console.error('Error in updateProjectGeneralVariables:', error);
      throw error;
    }
  }

  /**
   * Get the current scope of a variable from the database
   */
  private getCurrentVariableScope(variableName: string, propagationSettings: any): string {
    if (!propagationSettings || !propagationSettings[variableName]) {
      return 'local'; // Default to local if not found
    }
    return propagationSettings[variableName];
  }

  /**
   * Check if the scope is decreasing (GLOBAL → CATEGORY → LOCAL)
   */
  private isScopeDecreasing(currentScope: string, newScope: string): boolean {
    const scopeLevels: Record<string, number> = { LOCAL: 1, CATEGORY: 2, GLOBAL: 3 };
    return scopeLevels[newScope] < scopeLevels[currentScope];
  }

  /**
   * Clean up values when scope is reduced
   */
  private cleanupReducedScope(
    variableName: string,
    currentScope: string,
    newScope: string,
    data: any,
    updatedTemplateVariables: any
  ): void {
    console.log(`    Cleaning up ${variableName} from ${currentScope} to ${newScope}`);
    
    // Get all templates that currently have this variable in their data
    const allTemplatesWithVariable = this.getAllTemplatesWithVariable(variableName, updatedTemplateVariables);
    
    // Determine which templates should keep the variable based on the template's own definition
    const templatesToKeep = new Set(data.documents);
    
    // Remove variable data from templates that shouldn't have it anymore (orphans)
    allTemplatesWithVariable.forEach(({category, templateName}) => {
      if (!templatesToKeep.has(templateName)) {
        console.log(`      Removing ${variableName} from ${templateName} (scope reduction)`);
        if (updatedTemplateVariables[category]?.[templateName]) {
          const vars = updatedTemplateVariables[category][templateName].variables || [];
          updatedTemplateVariables[category][templateName].variables = vars.filter((v: any) => v.name !== variableName);
        }
      }
    });
  }

  /**
   * Get all template names that currently have a specific variable data
   */
  private getAllTemplatesWithVariable(variableName: string, templateVariables: any): {category: string, templateName: string}[] {
    const templates: {category: string, templateName: string}[] = [];
    
    Object.keys(templateVariables).forEach(category => {
      Object.keys(templateVariables[category]).forEach(templateName => {
        const vars = templateVariables[category][templateName]?.variables || [];
        if (vars.some((v: any) => v.name === variableName)) {
          templates.push({category, templateName});
        }
      });
    });
    
    return templates;
  }

  /**
   * Propagate value based on scope (hierarchical precedence)
   */
  private propagateValueByScope(
    variableName: string, 
    sourceValue: { value: any; template: string }, 
    scope: string, 
    data: any, 
    updatedTemplateVariables: any,
    templates: DocumentTemplate[]
  ): void {
    if (scope === 'GLOBAL') {
      // Propagate to ALL templates that have this variable
      console.log(`    Propagating ${variableName} globally to ${data.documents.length} templates`);
      data.documents.forEach((templateName: string) => {
        const cat = templates.find(t => t.name === templateName)?.category;
        if (cat) {
          this.setValueIfEmpty(cat, templateName, variableName, sourceValue.value, updatedTemplateVariables);
        }
      });
    } else if (scope === 'CATEGORY') {
      // Propagate only within categories where it's strict
      console.log(`    Propagating ${variableName} within category...`);
      data.category.forEach((cat: DocumentCategory) => {
        const docsInThisCat = data.documents.filter((d: string) => templates.find(t => t.name === d)?.category === cat);
        // Only propagate if it's in all documents of this category
        // (Wait, if scope is CATEGORY, it means it's strict in at least one category)
        docsInThisCat.forEach((templateName: string) => {
          this.setValueIfEmpty(cat, templateName, variableName, sourceValue.value, updatedTemplateVariables);
        });
      });
    } else {
      // For 'LOCAL' scope, don't propagate (no action needed)
      console.log(`    Variable ${variableName} is local, no propagation needed`);
    }
  }

  /**
   * Set value if the current value is empty
   */
  private setValueIfEmpty(
    category: string,
    templateName: string, 
    variableName: string, 
    value: any, 
    updatedTemplateVariables: any
  ): void {
    if (!updatedTemplateVariables[category]) {
      updatedTemplateVariables[category] = {};
    }
    if (!updatedTemplateVariables[category][templateName]) {
      updatedTemplateVariables[category][templateName] = { variables: [] };
    }

    const vars = updatedTemplateVariables[category][templateName].variables || [];
    const varObj = vars.find((v: any) => v.name === variableName);
    
    if (varObj) {
      if (this.isValueEmpty(varObj.value)) {
        varObj.value = value;
        console.log(`      Set ${variableName} in ${templateName}: ${value}`);
      } else {
        console.log(`      ${templateName} already has value for ${variableName}, skipping`);
      }
    } else {
      // Variable not in template variables yet, but it should be since it's in the template
      vars.push({
        name: variableName,
        value: value
      });
      console.log(`      Added ${variableName} to ${templateName} with value: ${value}`);
    }
  }

  /**
   * Find the first non-empty value for a variable across templates
   */
  private findSourceValue(variableName: string, documentNames: string[], templateVariables: any): { value: any; template: string } | null {
    for (const templateName of documentNames) {
      // Find which category this template belongs to in the data
      for (const category of Object.keys(templateVariables || {})) {
        const templateData = templateVariables[category]?.[templateName];
        const existingVar = templateData?.variables?.find((v: any) => v.name === variableName);
        const existingValue = existingVar?.value;
        
        if (existingValue !== null && existingValue !== undefined) {
          const isFilled = typeof existingValue === 'string' 
            ? existingValue.trim() !== ''
            : true; // For other types, assume non-null is filled
          
          if (isFilled) {
            return {
              value: existingValue,
              template: templateName
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Check if a value is empty
   */
  private isValueEmpty(value: any): boolean {
    if (!value) return true;
    
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    
    if (value && typeof value === 'object' && 'value' in value) {
      return value.value === null || value.value === undefined || 
             (typeof value.value === 'string' && value.value.trim() === '');
    }
    
    return false;
  }
} 