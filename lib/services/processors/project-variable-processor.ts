// This is used for project variables

import { createClient } from '@/lib/supabase/server';
import { DocumentVariable} from '@/lib/types/variable-types';
import { DocumentCategory, DocumentTemplate } from '@/lib/types/types';


export interface ProjectVariables {
  globalVariables: DocumentVariable[];
  documentSpecificVariables: DocumentVariable[];
  categoryVariables: { [category: string]: DocumentVariable[] }
  variableRegistry:Map<DocumentVariable, {
    documents: string[];
    category: Set<DocumentCategory>;
    isCategoryVariable: boolean;
    isGlobalVariable: boolean;
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
  ): Promise<ProjectVariables> {
    
    // RBAC Check - ensure user can access this project
    const hasAccess = await this.checkProjectAccess(projectId, companyId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to project');
    }
    
    // Get templates with company_id filter for multi-tenancy
    const templates = await this.getProjectTemplates(projectId, companyId, userId);
    
    const variableRegistry = new Map<DocumentVariable, {
      documents: string[];
      category: Set<DocumentCategory>;
      isCategoryVariable: boolean;
      isGlobalVariable: boolean;
    }>();
    
    templates.forEach(template => {
      // Parse variables with new | syntax
      const templateVariables = template.variables;
      
      templateVariables.forEach((variable: DocumentVariable) => {
        
        if (variableRegistry.has(variable)) {
          const existing = variableRegistry.get(variable)!;
          existing.documents.push(template.name);
          existing.category.add(template.category);
          
          // Check if it's a category variable (multiple docs in same category)
          const documentsInSameCategory = existing.documents.filter((docName: string) => {
            const docTemplate = templates.find(t => t.name === docName);
            return docTemplate?.category === template.category;
          });
          existing.isCategoryVariable = documentsInSameCategory.length > 1;
          
          // Check if it's a global variable (appears across multiple categories)
          existing.isGlobalVariable = existing.category.size > 1;
        } else {
          variableRegistry.set(variable, {
            documents: [template.name],
            category: new Set([template.category]),
            isCategoryVariable: false,
            isGlobalVariable: false
          });
        }
      });
    });

    // Use the data you already calculated in variableRegistry
    const globalVariables = Array.from(variableRegistry.entries())
    .filter(([variable, data]) => data.isGlobalVariable)
    .map(([variable]) => variable);

    const categoryVariables: { [category: string]: DocumentVariable[] } = {};
    Array.from(variableRegistry.entries())
      .filter(([variable, data]) => data.isCategoryVariable && !data.isGlobalVariable)
      .forEach(([variable, data]) => {
        // Group by category
        data.category.forEach(category => {
          if (!categoryVariables[category]) {
            categoryVariables[category] = [];
          }
          categoryVariables[category].push(variable);
        });
      });

    const documentSpecificVariables = Array.from(variableRegistry.entries())
    .filter(([variable, data]) => !data.isGlobalVariable && !data.isCategoryVariable)
    .map(([variable]) => variable);

    const propagationSettings = Array.from(variableRegistry.entries())
    .map(([variable, data]) => ({
      variable,
      propagationScope: data.isGlobalVariable 
        ? 'global' 
        : data.isCategoryVariable 
          ? 'category' 
          : 'local'
    }));


    return { globalVariables, documentSpecificVariables, categoryVariables, variableRegistry, propagationSettings };
    
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
  
  private async getProjectTemplates(projectId: string, companyId: string, userId: string): Promise<DocumentTemplate[]> {
    const supabase = await createClient();
    
    // Get project to find all template names
    // TODO: use API route for this
    const { data: project } = await supabase
      .from('projects')
      .select('architecture_templates, constructions_templates, fire_templates, authority_processing_templates, energy_templates, hvac_templates, execution_control_templates')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single();
    
    if (!project) return [];
    
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
    
    if (allTemplateNames.length === 0) return [];
    
    // Get templates that are accessible to the user:
    // 1. Company-wide templates (is_public = true) within the same company, OR
    // 2. Personal templates (is_public = false) created by the current user
    // TODO: use API route for this
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .in('name', allTemplateNames)
      .eq('company_id', companyId)
      .or(`is_public.eq.true,user_id.eq.${userId}`);
    
    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return [];
    }
    
    return templates || [];
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
      // RBAC Check
      const {globalVariables, documentSpecificVariables, categoryVariables, variableRegistry, propagationSettings} = await this.processProjectVariables(projectId, companyId, userId);
      

      // Get current project data to access existing variables
      // TODO: Use route for this
      const supabase = await createClient();
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('template_variables, global_variables, category_variables, variable_propagation_settings')
        .eq('id', projectId)
        .eq('company_id', companyId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }
      


      // Check if we have any general variables across all categories
      const hasGlobalVariables = globalVariables.length > 0;
      // Check if we have any category variables
      const hasCategoryVariables = Object.values(categoryVariables).some(variables => variables.length > 0);

      // Handle value propagation and scope changes
      let updatedTemplateVariables = { ...project.template_variables };
      let hasPropagationChanges = false;

      // Process each variable for value propagation and scope changes (hierarchical order: global → category → local)
      Array.from(variableRegistry.entries()).forEach(([variable, data]) => {
        const variableName = variable.name;
        const newScope = data.isGlobalVariable ? 'global' : 
                         data.isCategoryVariable ? 'category' : 'local';
        
        // Get current scope from database
        const currentScope = this.getCurrentVariableScope(variableName, project.variable_propagation_settings);
        
        console.log(`Processing variable ${variableName}: ${currentScope} → ${newScope}`);
        
        // Handle scope reduction (cleanup values from templates that no longer should have this variable)
        if (this.isScopeDecreasing(currentScope, newScope)) {
          console.log(`  Variable ${variableName} scope is decreasing, cleaning up...`);
          this.cleanupReducedScope(variableName, currentScope, newScope, data, updatedTemplateVariables);
          hasPropagationChanges = true;
        }
        
        // Find source value and propagate based on new scope
        const sourceValue = this.findSourceValue(variableName, data.documents, project.template_variables);
        
        if (sourceValue) {
          console.log(`  Found source value for ${variableName}: ${sourceValue.value}`);
          
          // Propagate based on scope (hierarchical precedence)
          this.propagateValueByScope(variableName, sourceValue, newScope, data, updatedTemplateVariables);
          hasPropagationChanges = true;
        } else {
          console.log(`  No source value found for ${variableName}`);
        }
      });

      // Prepare update data
      const updateData: any = {
        global_variables: hasGlobalVariables ? globalVariables : [],
        category_variables: hasCategoryVariables ? categoryVariables : {},
        variable_propagation_settings: propagationSettings.reduce((acc: any, setting: any) => {
          acc[setting.variable.name] = setting.propagationScope;
          return acc;
        }, {}),
        updated_at: new Date().toISOString()
      };

      // Include template variables if we have propagation changes
      if (hasPropagationChanges) {
        updateData.template_variables = updatedTemplateVariables;
      }

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
   * Check if the scope is decreasing (global → category → local)
   */
  private isScopeDecreasing(currentScope: string, newScope: string): boolean {
    const scopeLevels: Record<string, number> = { local: 1, category: 2, global: 3 };
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
    
    // Get all templates that currently have this variable
    const allTemplatesWithVariable = this.getAllTemplatesWithVariable(variableName, updatedTemplateVariables);
    
    // Determine which templates should keep the variable based on new scope
    const templatesToKeep = new Set(data.documents);
    
    // Remove variable from templates that shouldn't have it anymore
    allTemplatesWithVariable.forEach(templateName => {
      if (!templatesToKeep.has(templateName)) {
        console.log(`      Removing ${variableName} from ${templateName} (scope reduction)`);
        if (updatedTemplateVariables[templateName]) {
          delete updatedTemplateVariables[templateName][variableName];
          
          // Clean up empty template objects
          if (Object.keys(updatedTemplateVariables[templateName]).length === 0) {
            delete updatedTemplateVariables[templateName];
          }
        }
      }
    });
  }

  /**
   * Get all template names that currently have a specific variable
   */
  private getAllTemplatesWithVariable(variableName: string, templateVariables: any): string[] {
    const templates: string[] = [];
    
    Object.keys(templateVariables).forEach(templateName => {
      if (templateVariables[templateName] && templateVariables[templateName][variableName] !== undefined) {
        templates.push(templateName);
      }
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
    updatedTemplateVariables: any
  ): void {
    if (scope === 'global') {
      // Propagate to ALL templates that have this variable
      console.log(`    Propagating ${variableName} globally to ${data.documents.length} templates`);
      data.documents.forEach((templateName: string) => {
        this.setValueIfEmpty(templateName, variableName, sourceValue.value, updatedTemplateVariables);
      });
    } else if (scope === 'category') {
      // Propagate only within the same category
      console.log(`    Propagating ${variableName} within category to ${data.documents.length} templates`);
      data.documents.forEach((templateName: string) => {
        this.setValueIfEmpty(templateName, variableName, sourceValue.value, updatedTemplateVariables);
      });
    } else {
      // For 'local' scope, don't propagate (no action needed)
      console.log(`    Variable ${variableName} is local, no propagation needed`);
    }
  }

  /**
   * Set value if the current value is empty
   */
  private setValueIfEmpty(
    templateName: string, 
    variableName: string, 
    value: any, 
    updatedTemplateVariables: any
  ): void {
    const currentValue = updatedTemplateVariables[templateName]?.[variableName];
    const isCurrentValueEmpty = this.isValueEmpty(currentValue);
    
    if (isCurrentValueEmpty) {
      if (!updatedTemplateVariables[templateName]) {
        updatedTemplateVariables[templateName] = {};
      }
      updatedTemplateVariables[templateName][variableName] = value;
      console.log(`      Set ${variableName} in ${templateName}: ${value}`);
    } else {
      console.log(`      ${templateName} already has value for ${variableName}, skipping`);
    }
  }

  /**
   * Find the first non-empty value for a variable across templates
   */
  private findSourceValue(variableName: string, documentNames: string[], templateVariables: any): { value: any; template: string } | null {
    for (const templateName of documentNames) {
      const existingValue = templateVariables?.[templateName]?.[variableName];
      
      if (existingValue !== null && existingValue !== undefined) {
        const isFilled = typeof existingValue === 'string' 
          ? existingValue.trim() !== ''
          : existingValue && typeof existingValue === 'object' && 'value' in existingValue 
            ? existingValue.value !== null && existingValue.value !== undefined
            : false;
        
        if (isFilled) {
          return {
            value: existingValue,
            template: templateName
          };
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