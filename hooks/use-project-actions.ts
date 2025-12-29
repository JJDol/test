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
  ProjectActionsState, 
  ProjectActionsActions, 
  UseProjectActionsReturn,
  ProjectDataState
} from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

export function useProjectActions(
  project: Project | null,
  allTemplates: DocumentTemplate[],
  onProjectUpdate: () => Promise<void>,
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add template');
      }

      toast({
        title: "Template Added",
        description: `${template.name} has been added to the project requirements with ${template.variables.length} variables. General variable values have been automatically propagated.`,
      });

      // Refresh the project data to ensure everything is in sync
      await onProjectUpdate();
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

      // Update project with updated templates list, cleared assignments, and cleared variables
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [categoryField]: updatedTemplates,
          document_assignments: updatedAssignments,
          template_variables: updatedTemplateVariables
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove template');
      }

      toast({
        title: "Template Removed",
        description: `${template} has been removed from the project requirements.`,
      });

      // Refresh the project data
      await onProjectUpdate();
    } catch (error) {
      console.error('Error removing template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove template",
        variant: "destructive",
      });
    }
  }, [project, toast, onProjectUpdate]);

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

      // Refresh project data to get the latest state
      await onProjectUpdate();
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

      toast({
        title: "Project Archived",
        description: "The project has been archived successfully.",
      });

      // Refresh the project data
      await onProjectUpdate();
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive",
      });
    }
  }, [project, toast, onProjectUpdate]);

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

      // Refresh project data
      await onProjectUpdate();

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

      // Refresh project data
      await onProjectUpdate();

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
    handleTemplateRemove,
    handleSupervisorCheck,
    handleAssignmentUpdate,
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
