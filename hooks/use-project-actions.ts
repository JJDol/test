/**
 * 🏢 useProjectActions - Project Actions Management Hook
 * 
 * PURPOSE: Handles all action operations for project details
 * - Download and generation operations
 * - Template management actions
 * - Project lifecycle actions
 * - Navigation and cleanup operations
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Focused on action operations only
 * - Reusable across project components
 * - Clear error handling
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { DocumentCategory, VariablePropagationScope } from "@/lib/types/types";
import { 
  Project, 
  DocumentTemplate,
  ProjectTemplate,
  ProjectActionsState, 
  ProjectActionsActions, 
  UseProjectActionsReturn,
  ProjectDataState
} from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

export function useProjectActions(
  project: Project | null,
  allTemplates: DocumentTemplate[],
  onProjectUpdate: (silent?: boolean) => Promise<void>,
  updateProjectState: (updater: (prev: ProjectDataState) => ProjectDataState) => void
): UseProjectActionsReturn {
  const router = useRouter();
  const { toast } = useToast();
  
  // State management
  const [state, setState] = useState<ProjectActionsState>({
    loadingAction: "none",
  });

  // Handle download project
  const handleDownloadProject = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loadingAction: "download" }));
      
      toast({
        title: "Preparing Download",
        description: "We're generating your project documents...",
      });

      const response = await fetch(`/api/projects/${project?.id}/download`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to download project');
      }

      // Get the filename from the content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `project-${project?.id}.zip`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your project documents are being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading project:', error);
      toast({
        title: "Error",
        description: "Failed to download project documents",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, loadingAction: "none" }));
    }
  }, [project, toast]);

  // Handle generate document
  const handleGenerateDocument = useCallback(async (templateName: string, category: DocumentCategory) => {
    if (!project) return;

    try {
      setState(prev => ({ ...prev, loadingAction: "generate" }));
      
      toast({
        title: "Generating Document",
        description: `Generating ${templateName}...`,
      });

      // Get variables for this template
      const templateVariables = project.template_variables?.[category]?.[templateName]?.variables || [];
      
      // Convert array of variables to object format expected by generate-document endpoint
      const variablesObject: { [key: string]: any } = {};
      templateVariables.forEach((variable: any) => {
        if (variable.name) {
          variablesObject[variable.name] = variable.type === 'text' ? (variable.value || '') : variable;
        }
      });

      const response = await fetch(`/api/projects/${project.id}/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName,
          category,
          variables: variablesObject
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate document');
      }

      // Get the filename from the content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${templateName}.docx`;

      // Download the file directly
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Document Generated",
        description: `${templateName} has been generated and downloaded.`,
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, loadingAction: "none" }));
    }
  }, [project, toast]);

  // Handle project template (package) selected
  const handleProjectTemplateSelected = useCallback(async (projectTemplate: ProjectTemplate) => {
    if (!project) {
      console.error('Project is not loaded');
      return;
    }

    try {
      toast({
        title: "Adding Package",
        description: `Adding templates from ${projectTemplate.name}...`,
      });

      // Get the document templates that belong to this package
      const templatesToAdd = allTemplates.filter(t => 
        projectTemplate.templates.includes(t.name) && t.category === projectTemplate.category
      );

      if (templatesToAdd.length === 0) {
        toast({
          title: "No Templates Found",
          description: "No matching document templates found in this package.",
          variant: "destructive",
        });
        return;
      }

      // Get the array field name for the category
      const categoryField = `${projectTemplate.category.toLowerCase()}_templates` as keyof Project;
      const currentTemplates = project[categoryField] as string[];
      
      // Identify templates that are actually new
      const newTemplates = templatesToAdd.filter(t => !currentTemplates.includes(t.name));
      
      if (newTemplates.length === 0) {
        toast({
          title: "Already Added",
          description: "All templates from this package are already in the project.",
        });
        return;
      }

      // Initialize state clones for batch update
      let updatedTemplateVariables = { ...(project.template_variables || {}) };
      let updatedPropagationSettings = { ...(project.variable_propagation_settings || {}) };
      let updatedGlobalVariables = { ...project.global_variables };
      let updatedCategoryVariables = { ...project.category_variables };
      let updatedVersionLocks = { ...(project.template_version_locks || {}) };

      // Helper to get currently assigned templates for propagation logic
      const getAssignedTemplates = (currentVars: any) => {
        return Object.keys(currentVars).flatMap(cat => 
          Object.keys(currentVars[cat as DocumentCategory] || {}).map(templateName => ({
            name: templateName,
            category: cat as DocumentCategory,
            variables: currentVars[cat as DocumentCategory][templateName]?.variables || []
          }))
        );
      };

      // Process each new template
      for (const template of newTemplates) {
        const currentCategory = template.category;
        
        // Refresh assigned templates in each iteration to include recently added ones in this loop
        const assignedTemplates = getAssignedTemplates(updatedTemplateVariables);
        
        const otherCategoryTemplates = assignedTemplates.filter(t => t.category !== currentCategory);
        const otherCategoryVars = otherCategoryTemplates.map(t => t.variables).flat();
        
        const sameCategoryTemplates = assignedTemplates.filter(t => t.category === currentCategory);
        const sameCategoryVars = sameCategoryTemplates.map(t => t.variables).flat();
        
        const validCategoryVariableNames = new Set(
          Array.isArray(sameCategoryVars) ? sameCategoryVars.map(gv => gv.name) : []
        );

        const validOtherCategoryVariableNames = new Set(
          Array.isArray(otherCategoryVars) ? otherCategoryVars.map(gv => gv.name) : []
        );

        // Process template variables
        if (!updatedTemplateVariables[template.category]) {
          updatedTemplateVariables[template.category] = {};
        }
        if (!updatedTemplateVariables[template.category]![template.name]) {
          updatedTemplateVariables[template.category]![template.name] = { variables: [] };
        }

        if (!updatedPropagationSettings[template.category]) {
          updatedPropagationSettings[template.category] = {};
        }
        if (!updatedPropagationSettings[template.category]![template.name]) {
          updatedPropagationSettings[template.category]![template.name] = {};
        }

        template.variables.forEach(variable => {
          let variableValue: any = undefined;
          let possibleScopes: VariablePropagationScope[] = [VariablePropagationScope.LOCAL];
          let currentScope: VariablePropagationScope = VariablePropagationScope.LOCAL;
          let isOverridden: boolean = false;
          
          const isGlobal = validOtherCategoryVariableNames.has(variable.name);
          const isCategory = validCategoryVariableNames.has(variable.name);
          
          if (isGlobal) {
            possibleScopes.push(VariablePropagationScope.GLOBAL);
            currentScope = VariablePropagationScope.GLOBAL;
          }
          if (isCategory) {
            possibleScopes.push(VariablePropagationScope.CATEGORY);
            if (currentScope === VariablePropagationScope.LOCAL) {
              currentScope = VariablePropagationScope.CATEGORY;
            }
          }
          
          // Determine value based on existing global usage
          if (isGlobal) {
            Object.keys(updatedTemplateVariables).forEach((cat) => {
              Object.keys(updatedTemplateVariables[cat as DocumentCategory] || {}).forEach(tName => {
                if (tName !== template.name && variableValue === undefined) {
                  const tVars = updatedTemplateVariables[cat as DocumentCategory]![tName]?.variables || [];
                  const existingVar = tVars.find(v => v.name === variable.name);
                  
                  if (existingVar && existingVar.value !== null && existingVar.value !== undefined) {
                    const existingPropagationMode = updatedPropagationSettings[cat as DocumentCategory]?.[tName]?.[variable.name];
                    if (existingPropagationMode?.currentScope === VariablePropagationScope.GLOBAL) {
                      variableValue = existingVar.value;
                    }
                  }
                }
              });
            });
          }
          
          // Determine value based on category usage if still undefined
          if (isCategory && variableValue === undefined) {
            Object.keys(updatedTemplateVariables[template.category] || {}).forEach(tName => {
              if (tName !== template.name && variableValue === undefined) {
                const tVars = updatedTemplateVariables[template.category]![tName]?.variables || [];
                const existingVar = tVars.find(v => v.name === variable.name);
                
                if (existingVar && existingVar.value !== null && existingVar.value !== undefined) {
                  const propagationMode = updatedPropagationSettings[template.category]?.[tName]?.[variable.name];
                  if (propagationMode?.currentScope === VariablePropagationScope.CATEGORY) {
                    variableValue = existingVar.value;
                  }
                }
              }
            });
          }
          
          updatedTemplateVariables[template.category]![template.name].variables.push({
            ...variable,
            value: variableValue
          });
          
          updatedPropagationSettings[template.category]![template.name]![variable.name] = {
            possibleScopes,
            currentScope,
            isOverridden
          };
        });

        // Update classifications for global/category variables
        template.variables.forEach(variable => {
          const setting = updatedPropagationSettings[template.category]![template.name]![variable.name];
          const possibleScopes = setting?.possibleScopes || [];

          for (const variableScope of possibleScopes) {
            if (variableScope === VariablePropagationScope.GLOBAL) {
              if (!updatedGlobalVariables.variables) {
                updatedGlobalVariables.variables = [];
              }
              
              const existingGlobalVar = updatedGlobalVariables.variables.find((gv: DocumentVariable) => gv.name === variable.name);
              if (!existingGlobalVar) {
                updatedGlobalVariables.variables.push({
                  name: variable.name,
                  type: variable.type,
                });
                
                // Update existing templates
                Object.keys(updatedTemplateVariables).forEach(cat => {
                  Object.keys(updatedTemplateVariables[cat as DocumentCategory] || {}).forEach(tName => {
                    const currentSetting = updatedPropagationSettings[cat as DocumentCategory]![tName]![variable.name];
                    const currentPossibleScopes = currentSetting?.possibleScopes || [VariablePropagationScope.LOCAL];
                    
                    if (tName !== template.name && !currentSetting?.isOverridden) {
                      const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.GLOBAL) 
                        ? currentPossibleScopes 
                        : [...currentPossibleScopes, VariablePropagationScope.GLOBAL];

                      updatedPropagationSettings[cat as DocumentCategory]![tName]![variable.name] = {
                        possibleScopes: newPossibleScopes,
                        currentScope: VariablePropagationScope.GLOBAL,
                        isOverridden: false
                      };
                    }
                  });
                });
              }
            } 
            
            if (variableScope === VariablePropagationScope.CATEGORY) {
              if (!updatedCategoryVariables[template.category]) {
                updatedCategoryVariables[template.category] = { variables: [] };
              }
              
              const existingCategoryVar = updatedCategoryVariables[template.category]?.variables.find((cv: any) => cv.name === variable.name);
              if (!existingCategoryVar) {
                updatedCategoryVariables[template.category]?.variables.push({
                  name: variable.name,
                  type: variable.type,
                });
                
                Object.keys(updatedTemplateVariables[template.category] || {}).forEach(tName => {
                  const currentSetting = updatedPropagationSettings[template.category]![tName]![variable.name];
                  const currentPossibleScopes = currentSetting?.possibleScopes || [VariablePropagationScope.LOCAL];
                  
                  if (tName !== template.name && !currentSetting?.isOverridden && currentSetting?.currentScope === VariablePropagationScope.LOCAL) {
                    const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.CATEGORY) 
                      ? currentPossibleScopes 
                      : [...currentPossibleScopes, VariablePropagationScope.CATEGORY];

                    updatedPropagationSettings[template.category]![tName]![variable.name] = {
                      possibleScopes: newPossibleScopes,
                      currentScope: VariablePropagationScope.CATEGORY,
                      isOverridden: false
                    };
                  }
                });
              }
            }
          }
        });

        // Set version lock
        updatedVersionLocks[template.name] = template.current_version || 1;
      }

      // Final list of templates for the category
      const finalTemplates = Array.from(new Set([...currentTemplates, ...newTemplates.map(t => t.name)]));

      // Batch update API call
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [categoryField]: finalTemplates,
          template_variables: updatedTemplateVariables,
          variable_propagation_settings: updatedPropagationSettings,
          global_variables: updatedGlobalVariables,
          category_variables: updatedCategoryVariables,
          template_version_locks: updatedVersionLocks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add package templates');
      }

      // Optimistic update
      const updatedProject = {
        ...project,
        [categoryField]: finalTemplates,
        template_variables: updatedTemplateVariables,
        variable_propagation_settings: updatedPropagationSettings,
        global_variables: updatedGlobalVariables,
        category_variables: updatedCategoryVariables,
        template_version_locks: updatedVersionLocks,
      };
      updateProjectState(prev => ({ ...prev, project: updatedProject as Project }));

      toast({
        title: "Package Added",
        description: `Successfully added ${newTemplates.length} documents from "${projectTemplate.name}".`,
      });

      await onProjectUpdate(true);
    } catch (error) {
      console.error('Error adding package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add package templates",
        variant: "destructive",
      });
    }
  }, [project, allTemplates, toast, onProjectUpdate, updateProjectState]);

  // Handle template selected
  const handleTemplateSelected = useCallback(async (template: DocumentTemplate) => {
    if (!project) {
      console.error('Project is not loaded');
      return;
    }

    try {
      // Get the array field name for the category
      const categoryField = `${template.category.toLowerCase()}_templates` as keyof Project;
      
      // Check if template is already added
      const currentTemplates = project[categoryField] as string[];
      if (currentTemplates.includes(template.name)) {
        toast({
          title: "Already Added",
          description: `${template.name} is already in the project requirements.`,
          variant: "destructive",
        });
        return;
      }
      

      // Initialize template variables and check for general variable propagation
      const currentTemplateVariables = project.template_variables?.[template.category] || {};
      const updatedTemplateVariables = { ...(project.template_variables || {}) };
      const updatedPropagationSettings = { ...(project.variable_propagation_settings || {}) };
      
      const currentCategory = template.category;

      // Get only templates that are currently assigned to the project
      const assignedTemplates = Object.keys(project.template_variables || {}).flatMap(category => 
        Object.keys(project.template_variables![category as DocumentCategory] || {}).map(templateName => ({
          name: templateName,
          category: category as DocumentCategory,
          variables: project.template_variables![category as DocumentCategory][templateName]?.variables || []
        }))
      );
      
      const otherCategoryTemplates = assignedTemplates.filter(t => t.category !== currentCategory);
      const otherCategoryVars = otherCategoryTemplates.map(t => t.variables).flat();
      
      // Get templates in the same category that are already assigned to the project
      const sameCategoryTemplates = assignedTemplates.filter(t => t.category === currentCategory);
      const sameCategoryVars = sameCategoryTemplates.map(t => t.variables).flat();
      
      // Create a set of valid variable names for this category (variables that appear in multiple templates in the same category)
      const validCategoryVariableNames = new Set(
        Array.isArray(sameCategoryVars) ? sameCategoryVars.map(gv => gv.name) : []
      );

      const validOtherCategoryVariableNames = new Set(
        Array.isArray(otherCategoryVars) ? otherCategoryVars.map(gv => gv.name) : []
      );
      
      // Only add variables that belong to this template's category
      template.variables.forEach(variable => {
        let variableValue: any = undefined;
        let possibleScopes: VariablePropagationScope[] = [VariablePropagationScope.LOCAL];
        let currentScope: VariablePropagationScope = VariablePropagationScope.LOCAL;
        let isOverridden: boolean = false;
        
        // Determine possible scopes based on variable usage
        const isGlobal = validOtherCategoryVariableNames.has(variable.name);
        const isCategory = validCategoryVariableNames.has(variable.name);
        
        // Build possible scopes array
        if (isGlobal) {
          possibleScopes.push(VariablePropagationScope.GLOBAL);
          currentScope = VariablePropagationScope.GLOBAL;
        }
        if (isCategory) {
          possibleScopes.push(VariablePropagationScope.CATEGORY);
          if (currentScope === VariablePropagationScope.LOCAL) {
            currentScope = VariablePropagationScope.CATEGORY;
          }
        }
        
        // Determine current scope and value based on existing usage
        if (isGlobal) {
          // Look for existing global values from other templates across all categories
          Object.keys(project.template_variables || {}).forEach((category) => {
            Object.keys(project.template_variables![category as DocumentCategory] || {}).forEach(templateName => {
              if (templateName !== template.name && variableValue === undefined) { // Don't check self
                const templateVars = project.template_variables![category as DocumentCategory][templateName]?.variables || [];
                const existingVar = templateVars.find(v => v.name === variable.name);
                
                if (existingVar && existingVar.value !== null && existingVar.value !== undefined) {
                  // Check if the existing template uses global propagation for this variable
                  const existingPropagationMode = project.variable_propagation_settings?.[category as DocumentCategory]?.[templateName]?.[variable.name];
                  const existingUsesGlobal = existingPropagationMode?.currentScope === VariablePropagationScope.GLOBAL;
                  
                  if (existingUsesGlobal) {
                    variableValue = existingVar.value;
                      }
                    }
                  }
                });
          });
        }
        
        // If not global, check if it's a category variable
        if (isCategory && variableValue === undefined) {
          // Look for existing category values from other templates in the same category
          Object.keys(currentTemplateVariables).forEach(templateName => {
            if (templateName !== template.name && variableValue === undefined) { // Don't check self
              const templateVars = currentTemplateVariables[templateName]?.variables || [];
              const existingVar = templateVars.find(v => v.name === variable.name);
              
              if (existingVar && existingVar.value !== null && existingVar.value !== undefined) {
                // Check if this template uses category propagation for this variable
                const propagationMode = project.variable_propagation_settings?.[template.category]?.[templateName]?.[variable.name];
                const useCategory = propagationMode?.currentScope === VariablePropagationScope.CATEGORY;
                
                if (useCategory) {
                  variableValue = existingVar.value;
                }
              }
            }
          });
        }
        
        // If still no value found, it's a local variable (variableValue remains undefined, scope remains LOCAL)
        
        // Add the variable to the template variables
        if (!updatedTemplateVariables[template.category]) {
          updatedTemplateVariables[template.category] = {};
        }
        if (!updatedTemplateVariables[template.category]![template.name]) {
          updatedTemplateVariables[template.category]![template.name] = { variables: [] };
        }
        
        // Add the variable with its resolved value
        updatedTemplateVariables[template.category]![template.name].variables.push({
          ...variable,
          value: variableValue
        });
        
        // Set the propagation setting
        if (!updatedPropagationSettings[template.category]) {
          updatedPropagationSettings[template.category] = {};
        }
        if (!updatedPropagationSettings[template.category]![template.name]) {
          updatedPropagationSettings[template.category]![template.name] = {};
        }
        updatedPropagationSettings[template.category]![template.name]![variable.name] = {
          possibleScopes,
          currentScope,
          isOverridden
        };
      });

      // Update global_variables and category_variables based on the new variable classifications
      let updatedGlobalVariables = { ...project.global_variables };
      let updatedCategoryVariables = { ...project.category_variables };

      // Process each variable to update the classification
      template.variables.forEach(variable => {
        const possibleScopes = updatedPropagationSettings[template.category]![template.name]![variable.name]?.possibleScopes;

        for (const variableScope of possibleScopes) {
        if (variableScope === VariablePropagationScope.GLOBAL) {
          // Add to global variables if not already present
          if (!updatedGlobalVariables.variables) {
            updatedGlobalVariables.variables = [];
          }
          
          // Check if this variable is already in global variables
          const existingGlobalVar = updatedGlobalVariables.variables.find((gv: DocumentVariable) => gv.name === variable.name);
          if (!existingGlobalVar) {
            // Add new global variable
            updatedGlobalVariables.variables.push({
              name: variable.name,
              type: variable.type,
            });
            
            // Update ALL existing templates that have this variable to use global scope
            Object.keys(updatedTemplateVariables).forEach(category => {
              Object.keys(updatedTemplateVariables[category as DocumentCategory] || {}).forEach(templateName => {
                const currentSetting = updatedPropagationSettings[category as DocumentCategory]![templateName]![variable.name];
                const currentPossibleScopes = currentSetting?.possibleScopes || [VariablePropagationScope.LOCAL];
                
                if (templateName !== template.name && !currentSetting?.isOverridden) {
                  // Ensure we don't duplicate the scope
                  const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.GLOBAL) 
                    ? currentPossibleScopes 
                    : [...currentPossibleScopes, VariablePropagationScope.GLOBAL];

                  updatedPropagationSettings[category as DocumentCategory]![templateName]![variable.name] = {
                    possibleScopes: newPossibleScopes,
                    currentScope: VariablePropagationScope.GLOBAL,
                    isOverridden: false
                  };
                }
                else if (templateName !== template.name && currentSetting?.isOverridden) {
                  // Ensure we don't duplicate the scope
                  const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.GLOBAL) 
                    ? currentPossibleScopes 
                    : [...currentPossibleScopes, VariablePropagationScope.GLOBAL];

                  updatedPropagationSettings[category as DocumentCategory]![templateName]![variable.name] = {
                    possibleScopes: newPossibleScopes,
                    currentScope: currentSetting.currentScope, // Keep the overridden scope
                    isOverridden: true
                  };
                }
              });
            });
          }
        } 
        
        // TODO: Maybe this should be also handled for global variables since we are overlapping the scopes
        if (variableScope === VariablePropagationScope.CATEGORY) {
          // Add to category variables
          if (!updatedCategoryVariables[template.category]) {
            updatedCategoryVariables[template.category] = { variables: [] };
          }
          
          // Check if this variable is already in category variables
          const existingCategoryVar = updatedCategoryVariables[template.category]?.variables.find((cv: any) => cv.name === variable.name);
          if (!existingCategoryVar) {
            // Add new category variable
            updatedCategoryVariables[template.category]?.variables.push({
              name: variable.name,
              type: variable.type,
            });
            
            // Update ALL existing templates in the SAME category that have this variable to use category scope
            Object.keys(updatedTemplateVariables[template.category] || {}).forEach(templateName => {
              const currentSetting = updatedPropagationSettings[template.category]![templateName]![variable.name];
              const currentPossibleScopes = currentSetting?.possibleScopes || [VariablePropagationScope.LOCAL];
              
              if (templateName !== template.name && !currentSetting?.isOverridden && currentSetting?.currentScope === VariablePropagationScope.LOCAL) {
                // Ensure we don't duplicate the scope
                const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.CATEGORY) 
                  ? currentPossibleScopes 
                  : [...currentPossibleScopes, VariablePropagationScope.CATEGORY];

                updatedPropagationSettings[template.category]![templateName]![variable.name] = {
                  possibleScopes: newPossibleScopes,
                  currentScope: VariablePropagationScope.CATEGORY,
                  isOverridden: false
                };
              }
              else if (templateName !== template.name && !currentSetting?.isOverridden && currentSetting?.currentScope === VariablePropagationScope.GLOBAL) {
                // Ensure we don't duplicate the scope
                const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.CATEGORY) 
                  ? currentPossibleScopes 
                  : [...currentPossibleScopes, VariablePropagationScope.CATEGORY];

                updatedPropagationSettings[template.category]![templateName]![variable.name] = {
                  possibleScopes: newPossibleScopes,
                  currentScope: VariablePropagationScope.GLOBAL,
                  isOverridden: false
                };
              }
              else if (templateName !== template.name && currentSetting?.isOverridden) {
                // Ensure we don't duplicate the scope
                const newPossibleScopes = currentPossibleScopes.includes(VariablePropagationScope.CATEGORY) 
                  ? currentPossibleScopes 
                  : [...currentPossibleScopes, VariablePropagationScope.CATEGORY];

                updatedPropagationSettings[template.category]![templateName]![variable.name] = {
                  possibleScopes: newPossibleScopes,
                  currentScope: currentSetting.currentScope, // Keep the overridden scope
                  isOverridden: true
                };
              }
            });
          }
        }
      }
      });

      // Lock template to current version
      const currentVersion = template.current_version || 1;
      const updatedVersionLocks = {
        ...(project.template_version_locks || {}),
        [template.name]: currentVersion,
      };

      // Add template to project and initialize its variables with general values
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [categoryField]: [...currentTemplates, template.name],
          template_variables: updatedTemplateVariables,
          variable_propagation_settings: updatedPropagationSettings,
          global_variables: updatedGlobalVariables,
          category_variables: updatedCategoryVariables,
          template_version_locks: updatedVersionLocks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add template');
      }

      // Apply optimistic update immediately
      const updatedProject = {
        ...project,
        [categoryField]: [...currentTemplates, template.name],
        template_variables: updatedTemplateVariables,
        variable_propagation_settings: updatedPropagationSettings,
        global_variables: updatedGlobalVariables,
        category_variables: updatedCategoryVariables,
        template_version_locks: updatedVersionLocks,
      };
      updateProjectState(prev => ({ ...prev, project: updatedProject as Project }));

      toast({
        title: "Template Added",
        description: `${template.name} has been added to the project requirements with ${template.variables.length} variables. General variable values have been automatically propagated.`,
      });

      // Silent refresh to sync with server (no loading screen)
      await onProjectUpdate(true);
    } catch (error) {
      console.error('Error adding template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add template",
        variant: "destructive",
      });
    }
  }, [project, toast, onProjectUpdate]);

  // Handle template remove
  const handleTemplateRemove = useCallback(async (template: string, category: DocumentCategory) => {
    if (!project) {
      console.error('Project is not loaded');
      return;
    }

    try {
      // Get the array field name for the category
      const categoryField = `${category.toLowerCase()}_templates` as keyof Project;
      
      // Get current templates and remove the selected one
      const currentTemplates = project[categoryField] as string[];
      const updatedTemplates = currentTemplates.filter(t => t !== template);

      // Create a copy of document_assignments without the entry for this template
      let updatedAssignments = { ...project.document_assignments };
      if (updatedAssignments && updatedAssignments[template]) {
        delete updatedAssignments[template];
      }

      // Create a copy of template_variables without the entry for this template (if it exists)
      let updatedTemplateVariables = { ...project.template_variables };
      if (updatedTemplateVariables && updatedTemplateVariables[category] && updatedTemplateVariables[category][template]) {
        delete updatedTemplateVariables[category][template];
      }
      if (updatedTemplateVariables[category] && Object.keys(updatedTemplateVariables[category]).length === 0) {
        delete updatedTemplateVariables[category];
      }

      // Remove version lock for this template
      let updatedVersionLocks = { ...(project.template_version_locks || {}) };
      if (updatedVersionLocks[template]) {
        delete updatedVersionLocks[template];
      }

      // Update project with updated templates list, cleared assignments, and cleared variables
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [categoryField]: updatedTemplates,
          document_assignments: updatedAssignments,
          template_variables: updatedTemplateVariables,
          template_version_locks: updatedVersionLocks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove template');
      }

      // Apply optimistic update immediately
      const updatedProject = {
        ...project,
        [categoryField]: updatedTemplates,
        document_assignments: updatedAssignments,
        template_variables: updatedTemplateVariables,
        template_version_locks: updatedVersionLocks,
      };
      updateProjectState(prev => ({ ...prev, project: updatedProject as Project }));

      toast({
        title: "Template Removed",
        description: `${template} has been removed from the project requirements.`,
      });

      // Silent refresh to sync with server (no loading screen)
      await onProjectUpdate(true);
    } catch (error) {
      console.error('Error removing template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove template",
        variant: "destructive",
      });
    }
  }, [project, toast, onProjectUpdate, updateProjectState]);

  // Handle supervisor check
  const handleSupervisorCheck = useCallback(async (templateName: string, checked: boolean) => {
    if (!project) return;

    // Optimistic update - update local state immediately for responsive UI
    const previousAssignments = project.document_assignments?.[templateName];
    const updatedAssignments = {
      ...previousAssignments,
      supervisor_checked: checked
    };

    // Update local project state immediately
    const updatedProject = {
      ...project,
      document_assignments: {
        ...project.document_assignments,
        [templateName]: updatedAssignments
      }
    };

    // Apply optimistic update to parent state
    updateProjectState(prev => ({ ...prev, project: updatedProject }));

    try {
      const response = await fetch(`/api/projects/${project.id}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: templateName,
          assignments: updatedAssignments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update supervisor check');
      }

      toast({
        title: checked ? "Document Checked" : "Check Removed",
        description: `${templateName} has been ${checked ? 'checked' : 'unchecked'} by supervisor.`,
      });
    } catch (error) {
      console.error('Error updating supervisor check:', error);
      
      // Revert optimistic update on error
      updateProjectState(prev => ({ ...prev, project }));
      
      toast({
        title: "Error",
        description: "Failed to update supervisor check",
        variant: "destructive",
      });
    }
  }, [project, toast]);

  // Handle assignment update
  const handleAssignmentUpdate = useCallback(async (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => {
    if (!project) return;

    // Optimistic update - update local state immediately for responsive UI
    const updatedAssignments = {
      ...assignments,
      assigned_at: new Date().toISOString()
    };

    // Update local project state immediately
    const updatedProject = {
      ...project,
      document_assignments: {
        ...project.document_assignments,
        [templateName]: updatedAssignments
      }
    };

    // Apply optimistic update to parent state
    updateProjectState(prev => ({ ...prev, project: updatedProject }));

    try {
      const response = await fetch(`/api/projects/${project.id}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: templateName,
          assignments: updatedAssignments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update assignments');
      }

      toast({
        title: "Success",
        description: "Document assignments updated successfully",
      });

      // Silent refresh to sync with server (no loading screen)
      await onProjectUpdate(true);
    } catch (error) {
      console.error('Error updating assignments:', error);
      toast({
        title: "Error",
        description: "Failed to update assignments. Please try again.",
        variant: "destructive",
      });
      
      // Revert optimistic update on error
      updateProjectState(prev => ({ ...prev, project }));
    }
  }, [project, updateProjectState, onProjectUpdate, toast]);

  // Handle upgrade template version
  const handleUpgradeVersion = useCallback(async (templateName: string) => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/upgrade-template-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upgrade template version');
      }

      const result = await response.json();

      // Update local state with new version lock
      const updatedVersionLocks = {
        ...(project.template_version_locks || {}),
        [templateName]: result.newVersion,
      };

      const updatedProject = {
        ...project,
        template_version_locks: updatedVersionLocks,
      };

      updateProjectState(prev => ({ ...prev, project: updatedProject }));

      toast({
        title: "Version Upgraded",
        description: `${templateName} upgraded from v${result.previousVersion} to v${result.newVersion}`,
      });

      // Silent refresh to sync with server
      await onProjectUpdate(true);
    } catch (error) {
      console.error('Error upgrading template version:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upgrade template version",
        variant: "destructive",
      });
    }
  }, [project, toast, onProjectUpdate, updateProjectState]);

  // Handle archive project
  const handleArchiveProject = useCallback(async () => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_archived: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive project');
      }

      // Apply optimistic update
      updateProjectState(prev => ({
        ...prev,
        project: { ...prev.project!, is_archived: true }
      }));

      toast({
        title: "Project Archived",
        description: "The project has been archived successfully.",
      });

      // Silent refresh to sync with server (no loading screen)
      await onProjectUpdate(true);
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive",
      });
    }
  }, [project, toast, onProjectUpdate, updateProjectState]);

  // Handle project deleted
  const handleProjectDeleted = useCallback(() => {
    router.push("/protected/dashboard");
  }, [router]);

  // Handle back to dashboard
  const handleBackToDashboard = useCallback(() => {
    setState(prev => ({ ...prev, loadingAction: "navigation" }));
    router.push("/protected/dashboard");
  }, [router]);

  // Handle cleanup variables
  // TODO: This funciton is not used in the frontend anymore, we should remove it
  const handleCleanupVariables = useCallback(async () => {
    if (!project) return;

    try {
      setState(prev => ({ ...prev, loadingAction: "navigation" }));
      
      toast({
        title: "Cleaning Up Variables",
        description: "Removing unused variables and propagating general values...",
      });

      // Call the cleanup API
      const response = await fetch(`/api/projects/${project.id}/cleanup-variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup variables');
      }

      // Silent refresh to sync with server (no loading screen)
      await onProjectUpdate(true);

      toast({
        title: "Cleanup Complete",
        description: "Variables have been cleaned up and general values propagated.",
      });
    } catch (error) {
      console.error('Error cleaning up variables:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cleanup variables",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, loadingAction: "none" }));
    }
  }, [project, toast, onProjectUpdate]);

  // Handle propagate general values
  // TODO: This funciton is not used in the frontend anymore, we should remove it
  const handlePropagateGeneralValues = useCallback(async () => {
    if (!project) return;

    try {
      setState(prev => ({ ...prev, loadingAction: "navigation" }));
      
      toast({
        title: "Propagating Values",
        description: "Propagating general variable values to all templates...",
      });

      // Call the general variables update API which now includes propagation
      const response = await fetch(`/api/projects/${project.id}/general-variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to propagate values');
      }

      // Silent refresh to sync with server (no loading screen)
      await onProjectUpdate(true);

      toast({
        title: "Propagation Complete",
        description: "General variable values have been propagated to all templates.",
      });
    } catch (error) {
      console.error('Error propagating general values:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to propagate values",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, loadingAction: "none" }));
    }
  }, [project, toast, onProjectUpdate]);

  // Actions object
  const actions: ProjectActionsActions = {
    handleDownloadProject,
    handleGenerateDocument,
    handleTemplateSelected,
    handleProjectTemplateSelected,
    handleTemplateRemove,
    handleSupervisorCheck,
    handleAssignmentUpdate,
    handleUpgradeVersion,
    handleArchiveProject,
    handleProjectDeleted,
    handleBackToDashboard,
    handleCleanupVariables,
    handlePropagateGeneralValues,
  };

  return {
    // State
    loadingAction: state.loadingAction,
    
    // Actions
    actions,
  };
}
