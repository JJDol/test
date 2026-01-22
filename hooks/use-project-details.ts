/**
 * 🏢 useProjectDetails - Main Project Details Orchestrator Hook
 * 
 * PURPOSE: Main orchestrator that combines all project details functionality
 * - Combines data, variables, and actions hooks
 * - Provides unified interface for components
 * - Manages overall state coordination
 * 
 * ENTERPRISE BENEFITS:
 * - Single entry point for project details
 * - Clean separation of concerns
 * - Reusable across components
 * - Maintainable architecture
 */

"use client";

import { useProjectData } from "./use-project-data";
import { useProjectVariables } from "./use-project-variables";
import { useProjectActions } from "./use-project-actions";
import { useProjectPermissions } from "./use-project-permissions";
import { getStatusColor } from "@/utils/project-utils";
import { UseProjectDetailsReturn } from "@/lib/types/types";
import { useMemo } from "react";

export function useProjectDetails(projectId: string): UseProjectDetailsReturn {
  // Use the data hook
  const projectData = useProjectData(projectId);
  
  // Merge customizations into templates so the UI reflects project-specific changes
  const customizedAllTemplates = useMemo(() => {
    if (!projectData.project?.custom_templates) return projectData.allTemplates;
    return projectData.allTemplates.map(template => {
      const customization = projectData.project?.custom_templates?.[template.name];
      if (customization) {
        return {
          ...template,
          variables: customization.variables
        };
      }
      return template;
    });
  }, [projectData.allTemplates, projectData.project?.custom_templates]);

  const customizedTemplates = useMemo(() => {
    if (!projectData.project?.custom_templates) return projectData.templates;
    return projectData.templates.map(template => {
      const customization = projectData.project?.custom_templates?.[template.name];
      if (customization) {
        return {
          ...template,
          variables: customization.variables
        };
      }
      return template;
    });
  }, [projectData.templates, projectData.project?.custom_templates]);

  // Use the variables hook
  // TODO: Maybe also pass category templates here
  const projectVariables = useProjectVariables(
    projectData.project,
    customizedAllTemplates,
    projectData.actions.refreshProject,
    projectData.actions.updateProjectState
  );
  
  // Use the actions hook
  const projectActions = useProjectActions(
    projectData.project,
    customizedAllTemplates,
    projectData.actions.refreshProject,
    projectData.actions.updateProjectState
  );

  // Use the permissions hook
  const projectPermissions = useProjectPermissions(
    projectData.project,
    projectData.currentUser
  );

  return {
    // State from data hook
    project: projectData.project,
    currentUser: projectData.currentUser,
    workers: projectData.workers,
    activeCategory: projectData.activeCategory,
    templates: customizedTemplates,
    allTemplates: customizedAllTemplates,
    
    // State from variables hook
    templateVariables: projectVariables.templateVariables,
    collapsedTemplates: projectVariables.collapsedTemplates,
    collapsedGlobalSection: projectVariables.collapsedGlobalSection,
    collapsedCategorySections: projectVariables.collapsedCategorySections,
    
    // State from actions hook
    loadingAction: projectActions.loadingAction,
    
    // Loading states
    loading: projectData.loading,
    
    // Error states
    error: projectData.error,
    
    // Computed values
    canEditVariables: projectPermissions.canEditVariables,
    canCheckVariables: projectPermissions.canCheckVariables,
    canEditGeneralVariables: projectPermissions.canEditGeneralVariables,
    calculateTemplateProgress: projectVariables.calculateTemplateProgress,
    calculateOverallProgress: projectVariables.calculateOverallProgress,
    calculateCheckedProgress: projectVariables.calculateCheckedProgress,
    getVariableType: projectVariables.getVariableType,
    getStatusColor,
    
    // Actions
    actions: {
      // Data actions
      ...projectData.actions,
      
      // Variable actions
      ...projectVariables.actions,
      
      // Action handlers
      ...projectActions.actions,
    },
  };
}
