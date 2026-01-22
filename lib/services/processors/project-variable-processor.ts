// This is used for project variables

import { createClient } from '@/lib/supabase/server';
import { DocumentVariable} from '@/lib/types/variable-types';
import { DocumentCategory, DocumentTemplate } from '@/lib/types/types';


export interface ProjectVariables {
  globalVariables: DocumentVariable[];
  documentSpecificVariables: DocumentVariable[];
  categoryVariables: { [category: string]: { variables: DocumentVariable[] } }
  variableRegistry: Map<string, {
    documents: string[];
    category: Set<DocumentCategory>;
    isCategoryVariable: boolean;
    isGlobalVariable: boolean;
    type: string;
  }>
  propagationSettings: {
    variable: DocumentVariable;
    propagationScope: string;
  }[];
}


export class VariableProcessor {
  // This is the main function that will be used to process the project variables
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
    
    const categoryCounts = new Map<DocumentCategory, number>();
    templates.forEach(t => {
      categoryCounts.set(t.category, (categoryCounts.get(t.category) || 0) + 1);
    });
    const totalCategories = categoryCounts.size;

    const variableRegistry = new Map<string, {
      documents: string[];
      category: Set<DocumentCategory>;
      isCategoryVariable: boolean;
      isGlobalVariable: boolean;
      type: string;
    }>();
    
    templates.forEach(template => {
      const templateVariables = template.variables;
      
      templateVariables.forEach((variable: DocumentVariable) => {
        if (variableRegistry.has(variable.name)) {
          const existing = variableRegistry.get(variable.name)!;
          existing.documents.push(template.name);
          existing.category.add(template.category);
        } else {
          variableRegistry.set(variable.name, {
            documents: [template.name],
            category: new Set([template.category]),
            isCategoryVariable: false,
            isGlobalVariable: false,
            type: variable.type
          });
        }
      });
    });

    // Second pass to determine strict commonality
    variableRegistry.forEach((data, variableName) => {
      // isGlobalVariable: true only if it appears in ALL categories (and categories > 1)
      data.isGlobalVariable = totalCategories > 1 && data.category.size === totalCategories;

      if (data.isGlobalVariable) {
        data.isCategoryVariable = false;
      } else {
        // isCategoryVariable: true only if it appears in ALL documents of at least one category
        // and that category has more than one document.
        let isStrictCategory = false;
        data.category.forEach(cat => {
          const docsInThisCategory = data.documents.filter(docName => {
            const t = templates.find(temp => temp.name === docName);
            return t?.category === cat;
          });
          const totalDocsInCat = categoryCounts.get(cat) || 0;
          if (totalDocsInCat > 1 && docsInThisCategory.length === totalDocsInCat) {
            isStrictCategory = true;
          }
        });
        data.isCategoryVariable = isStrictCategory;
      }
    });

    const globalVariables = Array.from(variableRegistry.entries())
    .filter(([name, data]) => data.isGlobalVariable)
    .map(([name, data]) => ({ name, type: data.type } as DocumentVariable));

    const categoryVariables: { [category: string]: { variables: DocumentVariable[] } } = {};
    Array.from(variableRegistry.entries())
      .filter(([name, data]) => data.isCategoryVariable)
      .forEach(([name, data]) => {
        data.category.forEach(cat => {
          const docsInThisCategory = data.documents.filter(docName => {
            const t = templates.find(temp => temp.name === docName);
            return t?.category === cat;
          });
          const totalDocsInCat = categoryCounts.get(cat) || 0;
          
          if (totalDocsInCat > 1 && docsInThisCategory.length === totalDocsInCat) {
            if (!categoryVariables[cat]) {
              categoryVariables[cat] = { variables: [] };
            }
            categoryVariables[cat].variables.push({ name, type: data.type } as DocumentVariable);
          }
        });
      });

    const documentSpecificVariables = Array.from(variableRegistry.entries())
    .filter(([name, data]) => !data.isGlobalVariable && !data.isCategoryVariable)
    .map(([name, data]) => ({ name, type: data.type } as DocumentVariable));

    const propagationSettings = Array.from(variableRegistry.entries())
    .map(([name, data]) => ({
      variable: { name, type: data.type } as DocumentVariable,
      propagationScope: data.isGlobalVariable 
        ? 'global' 
        : data.isCategoryVariable 
          ? 'category' 
          : 'local'
    }));


    return { globalVariables, documentSpecificVariables, categoryVariables, variableRegistry: variableRegistry as any, propagationSettings, project, templates };
    
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
   * Detect and store general variables for a project when templates change
   * This should be called when templates are added/removed from a project
   */
  // TODO: FIX THIS FUNCTION - it is not efficient because it is scanning all templates and variables for each update
  async updateProjectGeneralVariables(
    projectId: string,
    companyId: string,
    userId: string
  ): Promise<void> {
    try {
      // Process variables with Project-Aware logic (Strict Commonality + Customizations)
      const {
        globalVariables, 
        categoryVariables, 
        variableRegistry, 
        propagationSettings, 
        project, 
        templates 
      } = await this.processProjectVariables(projectId, companyId, userId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if we have any general variables across all categories
      const hasGlobalVariables = globalVariables.length > 0;
      const categoryCounts = new Map<DocumentCategory, number>();
      templates.forEach(t => {
        categoryCounts.set(t.category, (categoryCounts.get(t.category) || 0) + 1);
      });

      // Handle value propagation and scope changes
      let updatedTemplateVariables = { ...project.template_variables };
      let hasPropagationChanges = false;

      // Prepare update data
      const updatedPropagationSettings = { ...(project.variable_propagation_settings || {}) };

      // Process each variable for value propagation and scope changes (hierarchical order: global → category → local)
      Array.from(variableRegistry.entries()).forEach(([variableName, data]) => {
        const newScope = data.isGlobalVariable ? 'GLOBAL' : 
                         data.isCategoryVariable ? 'CATEGORY' : 'LOCAL';
        
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
              
              const currentSetting = updatedPropagationSettings[cat][tName][variableName];
              
              // Calculate possible scopes
              const possibleScopes: string[] = ['LOCAL'];
              // Check if it's strict category variable for this category
              const totalDocsInCat = categoryCounts.get(cat) || 0;
              const docsInThisCat = data.documents.filter(d => templates.find(t => t.name === d)?.category === cat);
              if (totalDocsInCat > 1 && docsInThisCat.length === totalDocsInCat) {
                possibleScopes.push('CATEGORY');
              }
              // Check if it's strict global
              if (data.isGlobalVariable) {
                possibleScopes.push('GLOBAL');
              }

              updatedPropagationSettings[cat][tName][variableName] = {
                possibleScopes: possibleScopes,
                currentScope: newScope,
                isOverridden: currentSetting?.isOverridden || false
              };
            }
          });
        });

        // Get current scope for propagation logic (using first template as reference)
        const firstTemplate = data.documents[0];
        const firstCat = templates.find(t => t.name === firstTemplate)?.category;
        const currentScope = firstCat ? (project.variable_propagation_settings?.[firstCat]?.[firstTemplate]?.[variableName]?.currentScope || 'LOCAL') : 'LOCAL';
        
        console.log(`Processing variable ${variableName}: ${currentScope} → ${newScope}`);
        
        // Handle scope reduction
        if (this.isScopeDecreasing(currentScope, newScope)) {
          console.log(`  Variable ${variableName} scope is decreasing, cleaning up...`);
          this.cleanupReducedScope(variableName, currentScope, newScope, data, updatedTemplateVariables);
          hasPropagationChanges = true;
        }
        
        // Find source value and propagate based on new scope
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

      console.log(`Updated general variables for project ${projectId}. Has general variables: ${hasGlobalVariables}, Propagation changes: ${hasPropagationChanges}`);
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