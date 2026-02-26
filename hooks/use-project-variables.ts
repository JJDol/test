/**
 * 🏢 useProjectVariables - Project Variables Management Hook
 * 
 * PURPOSE: Handles all variable-related operations for project details
 * - Variable state management and updates
 * - Template variable propagation logic
 * - General variable management
 * - Progress calculations
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Focused on variable operations only
 * - Complex business logic isolated
 * - Reusable across project components
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { DocumentCategory, VariablePropagationScope } from "@/lib/types/types";
import { getVariableType } from "@/utils/project-utils";
import {
  Project,
  DocumentTemplate,
  ProjectVariablesState,
  ProjectVariablesActions,
  UseProjectVariablesReturn,
  ProjectDataState
} from "@/lib/types/types";
import {DocumentVariable} from "@/lib/types/variable-types";

export function useProjectVariables(
  project: Project | null,
  allTemplates: DocumentTemplate[],
  onProjectUpdate: (silent?: boolean) => Promise<void>,
  updateProjectState: (updater: (prev: ProjectDataState) => ProjectDataState) => void
): UseProjectVariablesReturn {
  const { toast } = useToast();

  // Track if collapsed states have been initialized (to prevent resetting on every update)
  const collapsedInitializedRef = useRef(false);

  // State management
  const [state, setState] = useState<ProjectVariablesState>({
    templateVariables: project?.template_variables || {} as any,
    collapsedTemplates: {} as any,
    collapsedGlobalSection: true, // Initially collapsed
    collapsedCategorySections: {} as any,
  });

  // Update template variables when project changes
  // NOTE: NOT USED - No component calls this function directly
  const setTemplateVariables = useCallback((variables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  }) => {
    setState(prev => ({ ...prev, templateVariables: variables }));
  }, []);

  // Initialize collapsed state for all templates and categories when project first loads
  // On subsequent updates, sync templateVariables and add new templates as collapsed
  useEffect(() => {
    if (project?.template_variables) {
      const templateVariables = project.template_variables;

      if (!collapsedInitializedRef.current) {
        // First initialization - set all templates as collapsed
        const collapsedTemplates: { [key in DocumentCategory]: boolean } = {} as any;
        const collapsedCategorySections: { [key in DocumentCategory]: boolean } = {} as any;

        Object.keys(templateVariables).forEach(category => {
          collapsedCategorySections[category as DocumentCategory] = true;

          const categoryTemplates = templateVariables[category as DocumentCategory];
          if (categoryTemplates) {
            Object.keys(categoryTemplates).forEach(templateName => {
              collapsedTemplates[templateName as DocumentCategory] = true;
            });
          }
        });

        setState(prev => ({
          ...prev,
          templateVariables,
          collapsedTemplates,
          collapsedCategorySections
        }));

        collapsedInitializedRef.current = true;
      } else {
        // Subsequent updates - sync templateVariables and add new templates as collapsed
        setState(prev => {
          const newCollapsedTemplates = { ...prev.collapsedTemplates } as { [key: string]: boolean };
          
          // Add any new templates as collapsed (default state)
          Object.keys(templateVariables).forEach(category => {
            const categoryTemplates = templateVariables[category as DocumentCategory];
            if (categoryTemplates) {
              Object.keys(categoryTemplates).forEach(templateName => {
                // Only add if not already in collapsedTemplates
                if (!(templateName in newCollapsedTemplates)) {
                  newCollapsedTemplates[templateName] = true;
                }
              });
            }
          });

          return {
            ...prev,
            templateVariables,
            collapsedTemplates: newCollapsedTemplates as any
          };
        });
      }
    }
  }, [project?.template_variables]);

  // Toggle template collapse - only one card open at a time
  const toggleTemplateCollapse = useCallback((templateName: string) => {
    setState(prev => {
      const currentlyCollapsed = (prev.collapsedTemplates as { [key: string]: boolean })[templateName] ?? true;
      const isOpening = currentlyCollapsed; // If currently collapsed, we're opening it
      
      if (isOpening) {
        // Close all templates and open only the clicked one
        const newCollapsedTemplates: { [key: string]: boolean } = {};
        Object.keys(prev.collapsedTemplates).forEach(key => {
          newCollapsedTemplates[key] = true; // Collapse all
        });
        newCollapsedTemplates[templateName] = false; // Open clicked one
        
        return {
          ...prev,
          collapsedTemplates: newCollapsedTemplates as any
        };
      } else {
        // Just close the clicked template
        return {
          ...prev,
          collapsedTemplates: {
            ...prev.collapsedTemplates,
            [templateName]: true
          } as any
        };
      }
    });
  }, []);

  // Collapse all templates - used when switching tabs
  const collapseAllTemplates = useCallback(() => {
    setState(prev => {
      const newCollapsedTemplates: { [key: string]: boolean } = {};
      Object.keys(prev.collapsedTemplates).forEach(key => {
        newCollapsedTemplates[key] = true; // Collapse all
      });
      return {
        ...prev,
        collapsedTemplates: newCollapsedTemplates as any
      };
    });
  }, []);

  // Toggle global section collapse
  const toggleGlobalSectionCollapse = useCallback(() => {
    setState(prev => ({
      ...prev,
      collapsedGlobalSection: !prev.collapsedGlobalSection
    }));
  }, []);

  // Toggle category section collapse
  const toggleCategorySectionCollapse = useCallback((category: DocumentCategory) => {
    setState(prev => ({
      ...prev,
      collapsedCategorySections: {
        ...prev.collapsedCategorySections,
        [category]: !((prev.collapsedCategorySections as { [key in DocumentCategory]: boolean })[category] ?? false)
      }
    }));
  }, []);

  // Update general variables
  // TODO: Investigate this
  // NOTE: NOT USED - No UI button calls this function
  const updateGeneralVariables = useCallback(async () => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/general-variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update general variables');
      }

      console.log('General variables updated successfully');
    } catch (error) {
      console.error('Error updating general variables:', error);
      // Don't fail the whole operation if general variable update fails
    }
  }, [project]);

  // Progress calculation functions
  const calculateOverallProgress = useCallback(() => {
    if (!project || !allTemplates.length) return 0;
  
    let totalVariables = 0;
    let filledVariables = 0;
  
    // Get all template names from all categories
    const categories = Object.values(DocumentCategory);
    categories.forEach(category => {
      const categoryTemplates = project?.template_variables?.[category] || {};
      
      Object.keys(categoryTemplates).forEach(templateName => {
        const template = allTemplates.find(t => t.name === templateName);
        if (template && template.variables) {
          totalVariables += template.variables.length;
          
          // Count filled variables from template_variables
          template.variables.forEach(variable => {
            const docVariable = project?.template_variables?.[category]?.[templateName]?.variables?.find(v => v.name === variable.name);
            if (docVariable) {
              if (isValueFilled(docVariable)) {
                filledVariables++;
              }
            }

          });
        }
      });
    });
  
    return totalVariables === 0 ? 0 : Math.round((filledVariables / totalVariables) * 100);
  }, [project, allTemplates]);

  // Function to update progress in database
  const updateProjectProgress = useCallback(async () => {
    if (!project) return;
    
    const newProgress = calculateOverallProgress();
    
    // Update progress in database if it has changed
    if (project.progress !== newProgress) {
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progress: newProgress
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update project progress');
        }

        // Update local state
        updateProjectState(prev => ({
          ...prev,
          project: {
            ...prev.project!,
            progress: newProgress
          }
        }));
      } catch (error) {
        console.error('Error updating project progress:', error);
        toast({
          title: "Error",
          description: "Failed to update project progress",
          variant: "destructive",
        });
      }
    }
  }, [project, calculateOverallProgress, updateProjectState, toast]);

  // Handle variable change
  const handleVariableChange = useCallback(async (templateName: string, name: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => {
    if (!project) return;
    
    const updatedTemplateVariables = { ...project.template_variables };

    if (isGlobal) {
      // Find all occurrences of this variable in all templates in project

      
      // Iterate through all categories and templates in the project
      Object.keys(project.template_variables || {}).forEach(category => {
        Object.keys(project.template_variables![category as DocumentCategory] || {}).forEach(templateName => {
          const templateVars = project.template_variables![category as DocumentCategory][templateName]?.variables || [];
          const hasVariable = templateVars.some(v => v.name === name);
          
          if (hasVariable) {
            // Check if this template has propagation setting set to global for this variable
            const propagationSetting = project.variable_propagation_settings?.[category as DocumentCategory]?.[templateName]?.[name];
            const usesGlobal = propagationSetting?.currentScope === VariablePropagationScope.GLOBAL;
            
            if (usesGlobal) {
              // Update the variable value in this template
              if (!updatedTemplateVariables[category as DocumentCategory]) {
                updatedTemplateVariables[category as DocumentCategory] = {};
              }
              if (!updatedTemplateVariables[category as DocumentCategory]![templateName]) {
                updatedTemplateVariables[category as DocumentCategory]![templateName] = { variables: [] };
              }
              
              const updatedVariables = templateVars.map(variable => 
                variable.name === name ? { ...variable, value } : variable
              );
              
              updatedTemplateVariables[category as DocumentCategory]![templateName].variables = updatedVariables;
            }
          }
        });
      });
      
      // Update the project state with the new template variables
      setState(prev => ({
        ...prev,
        templateVariables: updatedTemplateVariables as any
      }));
    }
    else if (isCategory) {
      // Find all occurrences of this variable in all templates in the same category
      Object.keys(project.template_variables![category] || {}).forEach(templateName => {
        const templateVars = project.template_variables![category][templateName]?.variables || [];
        const hasVariable = templateVars.some(v => v.name === name);
        
        if (hasVariable) {
          // Check if this template has propagation setting set to category for this variable
          const propagationSetting = project.variable_propagation_settings?.[category]?.[templateName]?.[name];
          const usesCategory = propagationSetting?.currentScope === VariablePropagationScope.CATEGORY;
          
          if (usesCategory) {
            // Update the variable value in this template
            if (!updatedTemplateVariables[category]) {
              updatedTemplateVariables[category] = {};
            }
            if (!updatedTemplateVariables[category]![templateName]) {
              updatedTemplateVariables[category]![templateName] = { variables: [] };
            }
            
            const updatedVariables = templateVars.map(variable => 
              variable.name === name ? { ...variable, value } : variable
            );
            
            updatedTemplateVariables[category]![templateName].variables = updatedVariables;
          }
        }
      });
    }
    else {
      // This is local value, so we need to update the local value in template variables only
      if (!updatedTemplateVariables[category]) {
        updatedTemplateVariables[category] = {};
      }
      if (!updatedTemplateVariables[category]![templateName]) {
        updatedTemplateVariables[category]![templateName] = { variables: [] };
      }
      
      const templateVars = project.template_variables?.[category]?.[templateName]?.variables || [];
      const variableExists = templateVars.some(variable => variable.name === name);
      
      let updatedVariables: DocumentVariable[];
      if (variableExists) {
        // Update existing variable
        updatedVariables = templateVars.map(variable => 
          variable.name === name ? { ...variable, value } : variable
        );
      } else {
        // Add new variable entry
        const variableType = getVariableType(templateName, name, allTemplates);
        updatedVariables = [...templateVars, { name, type: variableType, value } as DocumentVariable];
      }
      
      updatedTemplateVariables[category]![templateName].variables = updatedVariables;
    }

    // Update local state immediately for responsive UI (for all variable types)
    setState(prev => ({
      ...prev,
      templateVariables: updatedTemplateVariables as any
    }));

    // Update project state for optimistic UI update (so controlled inputs work correctly)
    updateProjectState(prev => ({
      ...prev,
      project: prev.project ? {
        ...prev.project,
        template_variables: updatedTemplateVariables as any
      } : null
    }));

    try {
      // Use the existing variables API route - it handles propagation logic
      const response = await fetch(`/api/projects/${project.id}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateVariables: updatedTemplateVariables
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save variable value');
      }

      // No need to refresh - optimistic update already applied
      
      // Update project progress in database
      await updateProjectProgress();
    } catch (error) {
      console.error('Error saving variable:', error);
      toast({
        title: "Error",
        description: "Failed to save variable value",
        variant: "destructive",
      });
      
      // Revert local state on error
      setState(prev => ({
        ...prev,
        templateVariables: project?.template_variables || {} as any
      }));
      
      // Revert project state on error
      updateProjectState(prev => ({
        ...prev,
        project: project
      }));
    }
  }, [project, toast, onProjectUpdate, updateProjectProgress, updateProjectState]);

  // Handle propagation change
  // TODO: Enhance this function for categories and phases
  const handlePropagationChange = useCallback(async (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => {
    if (!project) return;

    console.log("--------------------------------")
    console.log('handlePropagationChange called:', { templateCategory, templateName, variableName, useCategory, useLocal });
    console.log("--------------------------------")

    try {
      const updatedProject = { ...project };
      const updatedPropagationSettings = { ...project.variable_propagation_settings };
      const updatedTemplateVariables = { ...project.template_variables };


      if (useLocal) {
        // This is local value, we need to put local value to this specific template and category
        
        // 1. Update propagation settings to LOCAL
        if (updatedPropagationSettings[templateCategory]?.[templateName]?.[variableName]) {
          updatedPropagationSettings[templateCategory][templateName][variableName].currentScope = VariablePropagationScope.LOCAL;
          updatedPropagationSettings[templateCategory][templateName][variableName].isOverridden = true;
        }

        // 2. Update the project state
        updatedProject.variable_propagation_settings = updatedPropagationSettings as any;
        updatedProject.template_variables = updatedTemplateVariables as any;
      }
      else if (useCategory) {
        // This is category value - switch all templates in category to category scope
        // if we are going from global to category, we need to switch all templates in category to category scope
        // if we are going from local to category, we need to switch the triggering template to category scope and keep other templates as they are
        // Check if we're reverting from local to category (from the triggering template)        
        // Get template names for this category from the project
        const categoryTemplateNames = project[`${templateCategory.toLowerCase()}_templates` as keyof Project] as string[] || [];
        
        for (const categoryTemplateName of categoryTemplateNames) {
          // Find the template definition
          const template = allTemplates.find(t => t.name === categoryTemplateName && t.category === templateCategory);
          if (template) {
            const hasVariable = template.variables.some(v => v.name === variableName);
            if (hasVariable && updatedPropagationSettings[templateCategory]?.[categoryTemplateName]?.[variableName]) {
              const currentScope = updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].currentScope;
              const isOverridden = updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].isOverridden;
              
              if (categoryTemplateName === templateName && currentScope === VariablePropagationScope.LOCAL) {
                // This is the triggering template - revert from local to category
                // Check if any other template in the category is already using category scope
                const hasOtherCategoryTemplates = categoryTemplateNames.some(otherTemplateName => 
                  otherTemplateName !== templateName && 
                  updatedPropagationSettings[templateCategory]?.[otherTemplateName]?.[variableName]?.currentScope === VariablePropagationScope.CATEGORY
                );
                
                if (hasOtherCategoryTemplates) {
                  // Other templates use category scope - revert to category
                  const isGlobalVariable = project.global_variables?.variables?.some(v => v.name === variableName) || false;
                  updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].currentScope = VariablePropagationScope.CATEGORY;
                  updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].isOverridden = isGlobalVariable;
                  
                  // Copy the category value from another template that's using category scope
                  const otherCategoryTemplateName = categoryTemplateNames.find(otherTemplateName => 
                    otherTemplateName !== templateName && 
                    updatedPropagationSettings[templateCategory]?.[otherTemplateName]?.[variableName]?.currentScope === VariablePropagationScope.CATEGORY
                  );
                  
                  if (otherCategoryTemplateName) {
                    const categoryValue = project.template_variables?.[templateCategory]?.[otherCategoryTemplateName]?.variables?.find(v => v.name === variableName)?.value || 
                                        project.category_variables?.[templateCategory]?.variables?.find(v => v.name === variableName)?.value || '';
                    
                    // Ensure template_variables structure exists
                    if (!updatedTemplateVariables[templateCategory]) {
                      updatedTemplateVariables[templateCategory] = {};
                    }
                    if (!updatedTemplateVariables[templateCategory][categoryTemplateName]) {
                      updatedTemplateVariables[templateCategory][categoryTemplateName] = { variables: [] };
                    }
                    
                    // Find existing variable or create new one - clear custom dropdownOptions
                    const existingVarIndex = updatedTemplateVariables[templateCategory][categoryTemplateName].variables.findIndex((v: any) => v.name === variableName);
                    if (existingVarIndex >= 0) {
                      const existingVar = updatedTemplateVariables[templateCategory][categoryTemplateName].variables[existingVarIndex];
                      // Update value and remove dropdownOptions to revert to template defaults
                      updatedTemplateVariables[templateCategory][categoryTemplateName].variables[existingVarIndex] = {
                        name: existingVar.name,
                        type: existingVar.type,
                        value: categoryValue !== '' ? String(categoryValue) : existingVar.value
                      } as DocumentVariable;
                    } else if (categoryValue !== '') {
                      // Create new variable entry without custom dropdownOptions
                      const variableType = getVariableType(categoryTemplateName, variableName, allTemplates);
                      updatedTemplateVariables[templateCategory][categoryTemplateName].variables.push({
                        name: variableName,
                        type: variableType,
                        value: String(categoryValue)
                      } as DocumentVariable);
                    }
                  }
                } else {
                  // No other templates use category scope - revert to global
                  updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].currentScope = VariablePropagationScope.GLOBAL;
                  updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].isOverridden = false;
                  
                  // Copy the global value to template_variables and clear custom dropdownOptions
                  const globalValue = project.global_variables?.variables?.find(v => v.name === variableName)?.value || '';
                  
                  // Ensure template_variables structure exists
                  if (!updatedTemplateVariables[templateCategory]) {
                    updatedTemplateVariables[templateCategory] = {};
                  }
                  if (!updatedTemplateVariables[templateCategory][categoryTemplateName]) {
                    updatedTemplateVariables[templateCategory][categoryTemplateName] = { variables: [] };
                  }
                  
                  // Find existing variable or create new one - clear custom dropdownOptions
                  const existingVarIndex = updatedTemplateVariables[templateCategory][categoryTemplateName].variables.findIndex((v: any) => v.name === variableName);
                  if (existingVarIndex >= 0) {
                    const existingVar = updatedTemplateVariables[templateCategory][categoryTemplateName].variables[existingVarIndex];
                    // Update value and remove dropdownOptions to revert to template defaults
                    updatedTemplateVariables[templateCategory][categoryTemplateName].variables[existingVarIndex] = {
                      name: existingVar.name,
                      type: existingVar.type,
                      value: globalValue !== '' ? String(globalValue) : existingVar.value
                    } as DocumentVariable;
                  } else if (globalValue !== '') {
                    // Create new variable entry without custom dropdownOptions
                    const variableType = getVariableType(categoryTemplateName, variableName, allTemplates);
                    updatedTemplateVariables[templateCategory][categoryTemplateName].variables.push({
                      name: variableName,
                      type: variableType,
                      value: String(globalValue)
                    } as DocumentVariable);
                  }
                }
              } else if (!isOverridden) {
                // Other templates - only switch if not overridden (not in local mode)
                updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].currentScope = VariablePropagationScope.CATEGORY;
                updatedPropagationSettings[templateCategory][categoryTemplateName][variableName].isOverridden = true;
              }
            }
          }
        }

        // Update the project state
        updatedProject.variable_propagation_settings = updatedPropagationSettings as any;
        updatedProject.template_variables = updatedTemplateVariables as any;
      }
      else {
        // This is global value - revert from local/category to global scope
        // Handle the specific template that triggered the change (for LOCAL -> GLOBAL)
        if (updatedPropagationSettings[templateCategory]?.[templateName]?.[variableName]) {
          const currentScope = updatedPropagationSettings[templateCategory][templateName][variableName].currentScope;
          
          // Revert from LOCAL to GLOBAL for this specific template
          if (currentScope === VariablePropagationScope.LOCAL) {
            updatedPropagationSettings[templateCategory][templateName][variableName].currentScope = VariablePropagationScope.GLOBAL;
            updatedPropagationSettings[templateCategory][templateName][variableName].isOverridden = false;
            
            // Copy the global value to template_variables and clear custom dropdown options
            const globalValue = project.global_variables?.variables?.find(v => v.name === variableName)?.value || '';
            
            // Ensure template_variables structure exists
            if (!updatedTemplateVariables[templateCategory]) {
              updatedTemplateVariables[templateCategory] = {};
            }
            if (!updatedTemplateVariables[templateCategory][templateName]) {
              updatedTemplateVariables[templateCategory][templateName] = { variables: [] };
            }
            
            // Find existing variable or create new one
            const existingVarIndex = updatedTemplateVariables[templateCategory][templateName].variables.findIndex((v: any) => v.name === variableName);
            if (existingVarIndex >= 0) {
              // Update value and remove custom dropdownOptions to revert to template defaults
              const existingVar = updatedTemplateVariables[templateCategory][templateName].variables[existingVarIndex];
              updatedTemplateVariables[templateCategory][templateName].variables[existingVarIndex] = {
                name: existingVar.name,
                type: existingVar.type,
                value: globalValue !== '' ? String(globalValue) : existingVar.value
                // Note: dropdownOptions is intentionally NOT included - this reverts to template defaults
              } as DocumentVariable;
            } else if (globalValue !== '') {
              // Create new variable entry without custom dropdownOptions
              const variableType = getVariableType(templateName, variableName, allTemplates);
              updatedTemplateVariables[templateCategory][templateName].variables.push({
                name: variableName,
                type: variableType,
                value: String(globalValue)
              } as DocumentVariable);
            }
          }
        }
        
        // Also handle reverting from CATEGORY to GLOBAL across all categories and templates
        Object.values(DocumentCategory).forEach(category => {
          // Get template names for this category from the project
          const categoryTemplateNames = project[`${category.toLowerCase()}_templates` as keyof Project] as string[] || [];
          
          for (const catTemplateName of categoryTemplateNames) {
            // Find the template definition
            const template = allTemplates.find(t => t.name === catTemplateName && t.category === category);
            if (template) {
              const hasVariable = template.variables.some(v => v.name === variableName);
              if (hasVariable && updatedPropagationSettings[category]?.[catTemplateName]?.[variableName]) {
                const currentScope = updatedPropagationSettings[category][catTemplateName][variableName].currentScope;
                
                // Revert if currently using category scope
                if (currentScope === VariablePropagationScope.CATEGORY) {
                  updatedPropagationSettings[category][catTemplateName][variableName].currentScope = VariablePropagationScope.GLOBAL;
                  updatedPropagationSettings[category][catTemplateName][variableName].isOverridden = false;
                }
              }
            }
          }
        });

        // Update the project state
        updatedProject.variable_propagation_settings = updatedPropagationSettings as any;
        updatedProject.template_variables = updatedTemplateVariables as any;
      }



      // Apply optimistic update to parent project state
      updateProjectState(prev => ({ ...prev, project: updatedProject }));

      // TODO: Check this fetch
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variable_propagation_settings: updatedPropagationSettings,
          template_variables: updatedTemplateVariables
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update propagation settings');
      }

      toast({
        title: "Updated",
        description: useLocal 
          ? "Variable switched to local mode. You can now edit it independently."
          : "Variable switched to general mode.",
      });

      // No need to refresh - optimistic update already applied

    } catch (error) {
      console.error('Error updating propagation settings:', error);
      
      // Revert optimistic updates on error
      updateProjectState(prev => ({ ...prev, project }));
      
      toast({
        title: "Error",
        description: "Failed to update variable propagation settings",
        variant: "destructive",
      });
    }
  }, [project, toast, allTemplates]);

  // Handle dropdown options change
  const handleDropdownOptionsChange = useCallback(async (
    templateName: string, 
    variableName: string, 
    category: DocumentCategory, 
    options: { displayText: string; value: string }[]
  ) => {
    if (!project) return;

    try {
      const updatedTemplateVariables = { ...project.template_variables };
      
      // Ensure the structure exists
      if (!updatedTemplateVariables[category]) {
        updatedTemplateVariables[category] = {};
      }
      if (!updatedTemplateVariables[category][templateName]) {
        updatedTemplateVariables[category][templateName] = { variables: [] };
      }
      
      // Find or create the variable entry
      const variables = updatedTemplateVariables[category][templateName].variables || [];
      const existingVarIndex = variables.findIndex((v: any) => v.name === variableName);
      
      if (existingVarIndex >= 0) {
        // Update existing variable with new dropdown options
        variables[existingVarIndex] = {
          ...variables[existingVarIndex],
          dropdownOptions: options
        } as DocumentVariable;
      } else {
        // Create new variable entry with dropdown options
        const template = allTemplates.find(t => t.name === templateName);
        const originalVar = template?.variables.find(v => v.name === variableName);
        variables.push({
          name: variableName,
          type: originalVar?.type || 'dropdown',
          value: '',
          dropdownOptions: options
        } as DocumentVariable);
      }
      
      updatedTemplateVariables[category][templateName].variables = variables;
      
      // Apply optimistic update
      const updatedProject = { ...project };
      updatedProject.template_variables = updatedTemplateVariables as any;
      updateProjectState(prev => ({ ...prev, project: updatedProject }));
      
      // Save to database
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_variables: updatedTemplateVariables
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dropdown options');
      }

      toast({
        title: "Options Updated",
        description: `Dropdown options for "${variableName}" have been saved.`,
      });
      
    } catch (error) {
      console.error('Error updating dropdown options:', error);
      
      // Revert optimistic updates on error
      updateProjectState(prev => ({ ...prev, project }));
      
      toast({
        title: "Error",
        description: "Failed to update dropdown options",
        variant: "destructive",
      });
    }
  }, [project, toast, allTemplates]);

  // Cleanup cross-category variables
  // TODO: Find if we need this function, actually it is not used in the frontend anymore
  // NOTE: NOT USED - No UI button calls this function
  const cleanupCrossCategoryVariables = useCallback(async () => {
    if (!project) return;
    
    try {
      const updatedTemplateVariables = { ...project.template_variables };
      let hasChanges = false;
      
      // Get all templates and their categories
      const allTemplateNames = [
        ...(project.architecture_templates || []),
        ...(project.constructions_templates || []),
        ...(project.fire_templates || []),
        ...(project.authority_processing_templates || []),
        ...(project.energy_templates || []),
        ...(project.hvac_templates || []),
        ...(project.execution_control_templates || [])
      ];
      
      // Clean up each template's variables
      allTemplateNames.forEach(templateName => {
        const template = allTemplates.find(t => t.name === templateName);
        if (!template) return;
        
        const currentCategory = template.category;
        const categoryVars = project.global_variables?.variables || [];
        const validCategoryVariableNames = new Set(
          Array.isArray(categoryVars) ? categoryVars.map((gv: any) => gv.name) : []
        );
        
        // Remove variables that don't belong to this template's category
        const templateVars = updatedTemplateVariables[currentCategory]?.[templateName];
        if (templateVars) {
          Object.keys(templateVars).forEach(variableName => {
            if (!validCategoryVariableNames.has(variableName)) {
              console.log(`Removing cross-category variable ${variableName} from template ${templateName} (category: ${currentCategory})`);
              templateVars.variables = templateVars.variables.filter((v: DocumentVariable) => v.name !== variableName);
              hasChanges = true;
            }
          });
        }
      });
      
      // Update the database if we have changes
      if (hasChanges) {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_variables: updatedTemplateVariables,
            updated_at: new Date().toISOString()
          }),
        });
        
        if (response.ok) {
          // Update local state
          setState(prev => ({
            ...prev,
            templateVariables: updatedTemplateVariables as any
          }));
          
          toast({
            title: "Variables Cleaned Up",
            description: "Cross-category variables have been removed.",
          });
        } else {
          throw new Error('Failed to update database');
        }
      } else {
        toast({
          title: "No Cleanup Needed",
          description: "All variables are already properly categorized.",
        });
      }
    } catch (error) {
      console.error('Error cleaning up cross-category variables:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up cross-category variables.",
        variant: "destructive",
      });
    }
  }, [project, allTemplates, toast]);

  // Progress calculation functions
  const calculateTemplateProgress = useCallback((templateName: string, template: DocumentTemplate): number => {
    if (!project || !template.variables.length) return 0;

    const totalVariables = template.variables.length;
    let filledVariables = 0;

    template.variables.forEach(variable => {
      const templateVariable = project.template_variables?.[template.category]?.[templateName]?.variables?.find(v => v.name === variable.name);
      if (!templateVariable) return;
      if (isValueFilled(templateVariable)) {
        filledVariables++;
      }
    });
    
    return Math.round((filledVariables / totalVariables) * 100);
  }, [project, allTemplates]);

  // Helper function to check if a value is filled
  const isValueFilled = (docVariable: DocumentVariable): boolean => {
    const value = docVariable.value;
    const type = docVariable.type;

    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    
    if (typeof value === 'number') {
      return value !== undefined && value !== null;
    }
    
    if (typeof value === 'boolean') {
      return value !== undefined && value !== null;
    }
    
    // For undefined/null values, check based on type
    switch (type) {
      case 'dropdown':
      case 'date':
      case 'image':
      case 'text':
        return false; // These types require actual values
      case 'checkbox':
        return value !== false; // false is a valid value for checkbox
      case 'number':
        return false; // Numbers require actual values
      default:
        return false;
    }
  };

  const calculateCheckedProgress = useCallback(() => {
    if (!project) return 0;

    // Get all assigned templates from the project
    const assignedTemplates = [
      ...(project.architecture_templates || []),
      ...(project.constructions_templates || []),
      ...(project.fire_templates || []),
      ...(project.authority_processing_templates || []),
      ...(project.energy_templates || []),
      ...(project.hvac_templates || []),
      ...(project.execution_control_templates || [])
    ];

    const totalTemplates = assignedTemplates.length;
    if (totalTemplates === 0) return 0;

    // Count checked templates
    const checkedTemplates = assignedTemplates.filter(templateName => 
      project.document_assignments?.[templateName]?.supervisor_checked
    ).length;

    return Math.round((checkedTemplates / totalTemplates) * 100);
  }, [project]);

  // Utility functions - using imported utility
  const getVariableTypeForTemplate = useCallback((templateName: string, variableName: string): string => {
    return getVariableType(templateName, variableName, allTemplates);
  }, [allTemplates]);

  // Actions object
  const actions: ProjectVariablesActions = {
    handleVariableChange,
    handlePropagationChange,
    handleDropdownOptionsChange,
    updateGeneralVariables,
    cleanupCrossCategoryVariables,
    toggleTemplateCollapse,
    collapseAllTemplates,
    toggleGlobalSectionCollapse: toggleGlobalSectionCollapse,
    toggleCategorySectionCollapse,
    setTemplateVariables,
    updateProjectProgress,
  };

  return {
    // State
    templateVariables: state.templateVariables,
    collapsedTemplates: state.collapsedTemplates,
    collapsedGlobalSection: state.collapsedGlobalSection,
    collapsedCategorySections: state.collapsedCategorySections,
    
    // Computed values
    calculateTemplateProgress,
    calculateOverallProgress,
    calculateCheckedProgress,
    getVariableType: getVariableTypeForTemplate,
    
    // Actions
    actions,
  };
}
