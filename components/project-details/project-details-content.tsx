/**
 * 🏢 ProjectDetailsContent - Main Content Orchestrator Component
 * 
 * PURPOSE: Main content component that orchestrates all project details sub-components
 * - Combines ProjectOverview and ProjectDocumentsSection
 * - Handles loading and error states
 * - Provides unified interface for the main page
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Clean separation of concerns
 * - Reusable across project components
 * - Professional loading and error handling
 */

"use client";

import { LoadingWrapper } from "@/components/ui/loading-wrapper";
import { ProjectOverview } from "./project-overview";
import { ProjectDocumentsSection } from "./project-documents-section";
import { DocumentCategory } from "@/lib/types/types";
import { User, Project, DocumentTemplate, ProjectTemplate } from "@/lib/types/types";
import { useProjectPermissions } from "@/hooks/use-project-permissions";

interface ProjectDetailsContentProps {
  // Data
  project: Project | null;
  currentUser: User | null;
  workers: any[];
  activeCategory: DocumentCategory;
  templates: DocumentTemplate[];
  allTemplates: DocumentTemplate[];
  
  // State
  templateVariables: any;
  collapsedTemplates: { [key: string]: boolean };
  collapsedGlobalSection: boolean;
  collapsedCategorySections: { [key: string]: boolean };
  loadingAction: string;
  
  // Loading states
  loading: {
    project: boolean;
    workers: boolean;
    currentUser: boolean;
    templates: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    project: string | null;
    workers: string | null;
    currentUser: string | null;
    templates: string | null;
    overall: string | null;
  };
  
  // Computed values
  canEditVariables: (templateName: string) => boolean;
  canCheckVariables: (templateName: string) => boolean;
  canEditGeneralVariables: () => boolean;
  calculateTemplateProgress: (templateName: string, template: DocumentTemplate) => number;
  calculateOverallProgress: () => number;
  calculateCheckedProgress: () => number;
  getVariableType: (templateName: string, variableName: string) => string;
  getStatusColor: (status: any) => string;
  
  // Actions
  actions: {
    // Data actions
    fetchProject: () => Promise<void>;
    fetchUsers: () => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
    fetchTemplatesForCategory: (category: DocumentCategory) => Promise<void>;
    setActiveCategory: (category: DocumentCategory) => void;
    refreshProject: () => Promise<void>;
    
    // Variable actions
    handleVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
    handlePropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
    updateGeneralVariables: () => Promise<void>;
    cleanupCrossCategoryVariables: () => Promise<void>;
    toggleTemplateCollapse: (templateName: string) => void;
    collapseAllTemplates: () => void;
    toggleGlobalSectionCollapse: () => void;
    toggleCategorySectionCollapse: (category: DocumentCategory) => void;
    setTemplateVariables: (variables: any) => void;
    
    // Action handlers
    handleDownloadProject: () => Promise<void>;
    handleGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
    handleTemplateSelected: (template: DocumentTemplate) => void;
    handleProjectTemplateSelected: (projectTemplate: ProjectTemplate) => void;
    handleTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
    handleSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
    handleReadyForControl: (templateName: string, checked: boolean) => Promise<void>;
    handleAssignmentUpdate: (templateName: string, assignments: {
      assignee_id?: string;
      assignee_name?: string;
      supervisor_id?: string;
      supervisor_name?: string;
    }) => Promise<void>;
    handleUpgradeVersion?: (templateName: string) => Promise<void>;
    handleArchiveProject: () => Promise<void>;
    handleProjectDeleted: () => void;
    handleBackToDashboard: () => void;
    handleCleanupVariables: () => Promise<void>;
    handlePropagateGeneralValues: () => Promise<void>;
    handleDropdownOptionsChange?: (templateName: string, variableName: string, category: DocumentCategory, options: { displayText: string; value: string }[]) => Promise<void>;
  };
}

export function ProjectDetailsContent({
  project,
  currentUser,
  workers,
  activeCategory,
  templates,
  allTemplates,
  templateVariables,
  collapsedTemplates,
  collapsedGlobalSection,
  collapsedCategorySections,
  loadingAction,
  loading,
  error,
  canEditVariables,
  canCheckVariables,
  canEditGeneralVariables,
  calculateTemplateProgress,
  calculateOverallProgress,
  calculateCheckedProgress,
  getVariableType,
  getStatusColor,
  actions,
}: ProjectDetailsContentProps) {
  // Get permissions
  const permissions = useProjectPermissions(project, currentUser);

  return (
    <LoadingWrapper
      loading={loading.overall || !project}
      error={error.overall}
      onRetry={actions.refreshProject}
      variant="page"
      loadingMessage="Loading project details..."
      errorTitle="Failed to load project"
    >
      <div className="space-y-6">
        {/* Project Overview Section */}
        <ProjectOverview
          project={project}
          currentUser={currentUser}
          loadingAction={loadingAction}
          overallProgress={calculateOverallProgress()}
          checkedProgress={calculateCheckedProgress()}
          canManageProject={permissions.canManageProject()}
          canArchiveProject={permissions.canArchiveProject()}
          canDeleteProject={permissions.canDeleteProject()}
          canUpdateProject={permissions.canUpdateProject()}
          canAssignWorkers={permissions.canAssignWorkers()}
          canDownloadProject={permissions.canDownloadProject()}
          onBackToDashboard={actions.handleBackToDashboard}
          onDownloadProject={actions.handleDownloadProject}
          onArchiveProject={actions.handleArchiveProject}
          onProjectDeleted={actions.handleProjectDeleted}
          onProjectUpdated={actions.refreshProject}
        />

        {/* Project Documents Section */}
        <ProjectDocumentsSection
          project={project}
          currentUser={currentUser}
          activeCategory={activeCategory}
          templates={templates}
          allTemplates={allTemplates}
          collapsedTemplates={collapsedTemplates}
          collapsedGlobalSection={collapsedGlobalSection}
          collapsedCategorySections={collapsedCategorySections}
          templateVariables={templateVariables}
          loading={loading}
          error={error}
          canEditVariables={canEditVariables}
          canCheckVariables={canCheckVariables}
          canEditGeneralVariables={canEditGeneralVariables}
          calculateTemplateProgress={calculateTemplateProgress}
          getVariableType={getVariableType}
          onTabChange={actions.setActiveCategory}
          onRefresh={actions.refreshProject}
          onTemplateSelected={actions.handleTemplateSelected}
          onProjectTemplateSelected={actions.handleProjectTemplateSelected}
          onTemplateRemove={actions.handleTemplateRemove}
          onVariableChange={actions.handleVariableChange}
          onPropagationChange={actions.handlePropagationChange}
          onSupervisorCheck={actions.handleSupervisorCheck}
          onReadyForControl={actions.handleReadyForControl}
          onGenerateDocument={actions.handleGenerateDocument}
          onAssignmentUpdate={actions.handleAssignmentUpdate}
          onUpgradeVersion={actions.handleUpgradeVersion}
          onToggleTemplateCollapse={actions.toggleTemplateCollapse}
          onCollapseAllTemplates={actions.collapseAllTemplates}
          onToggleGlobalSectionCollapse={actions.toggleGlobalSectionCollapse}
          onToggleCategorySectionCollapse={actions.toggleCategorySectionCollapse}
          onDropdownOptionsChange={actions.handleDropdownOptionsChange}
        />
      </div>
    </LoadingWrapper>
  );
}
