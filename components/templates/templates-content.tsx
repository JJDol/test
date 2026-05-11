/**
 * 🏢 TemplatesContent - Enterprise Templates Orchestrator Component
 * 
 * PURPOSE: Main orchestrator component for templates management
 * - Coordinates between document and project template hooks
 * - Manages tab state and URL synchronization
 * - Provides clean separation of concerns
 * - Handles shared state between tabs
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Clear separation between business logic and UI
 * - Reusable and testable architecture
 * - Professional error handling
 * - Optimized state management
 * 
 * ARCHITECTURE:
 * - useTemplates: Document template business logic
 * - useProjectTemplates: Project template business logic
 * - DocumentTemplatesTab: Document templates UI
 * - ProjectTemplatesTab: Project templates UI
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui/loading-state";
import { useTemplates } from "@/hooks/use-templates";
import { useProjectTemplates } from "@/hooks/use-project-templates";
import { DocumentTemplatesTab } from "./document-templates/document-templates-tab";
import { ProjectTemplatesTab } from "./project-templates/project-templates-tab";

export function TemplatesContent() {
  // Router + search params for tab synchronization
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get('tab') as 'document-templates' | 'project-templates') || 'document-templates';

  // Document templates hook
  const documentTemplatesHook = useTemplates();

  // Project templates hook (pass document templates for reference)
  const projectTemplatesHook = useProjectTemplates(documentTemplatesHook.templates);

  // Keep URL and tab state in sync when user clicks a different tab
  const handleTabChange = (value: string) => {
    // Clear filters when switching tabs to prevent propagation

    documentTemplatesHook.actions.setViewMode('all');
    documentTemplatesHook.actions.setSelectedCategory('ALL');
    projectTemplatesHook.actions.setSelectedProjectCategory('ALL');

    
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    router.replace(`/protected/templates?${params.toString()}`);
  };

  // Show loading state for initial page load
  const isLoading = documentTemplatesHook.loading.overall || projectTemplatesHook.loading.overall;

  // TODO: Check if this is correct condition, the length parameter doesnt make sense here
  if (isLoading && documentTemplatesHook.templates.length === 0 && projectTemplatesHook.projectTemplates.length === 0) {
    return (
      <LoadingState 
        title="Loading Templates"
        message="Please wait while we load your templates..."
        variant="page"
      />
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="document-templates">Document Templates</TabsTrigger>
          <TabsTrigger value="project-templates">Project Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="document-templates">
          <DocumentTemplatesTab
            // State
            templates={documentTemplatesHook.templates}
            archivedTemplates={documentTemplatesHook.archivedTemplates}
            showArchived={documentTemplatesHook.showArchived}
            viewMode={documentTemplatesHook.viewMode}
            sortMode={documentTemplatesHook.sortMode}
            selectedCategory={documentTemplatesHook.selectedCategory}
            expandedTemplates={documentTemplatesHook.expandedTemplates}
            templateToEdit={documentTemplatesHook.templateToEdit}
            templateToDelete={documentTemplatesHook.templateToDelete}
            templateToReupload={documentTemplatesHook.templateToReupload}
            editName={documentTemplatesHook.editName}
            editDescription={documentTemplatesHook.editDescription}
            editCategory={documentTemplatesHook.editCategory}
            dialogs={documentTemplatesHook.dialogs}

            // Loading states
            loading={documentTemplatesHook.loading}

            // Error states
            error={documentTemplatesHook.error}

            // Computed values
            filteredTemplates={documentTemplatesHook.filteredTemplates}
            templatesByCategory={documentTemplatesHook.templatesByCategory}
            templateStats={documentTemplatesHook.templateStats}

            // Actions
            actions={documentTemplatesHook.actions}
          />
        </TabsContent>

        <TabsContent value="project-templates">
          <ProjectTemplatesTab
            // State
            projectTemplates={projectTemplatesHook.projectTemplates}
            selectedProjectCategory={projectTemplatesHook.selectedProjectCategory}
            sortMode={projectTemplatesHook.sortMode}
            newProjectTemplate={projectTemplatesHook.newProjectTemplate}
            editProjectTemplate={projectTemplatesHook.editProjectTemplate}
            projectTemplateToEdit={projectTemplatesHook.projectTemplateToEdit}
            projectTemplateToDelete={projectTemplatesHook.projectTemplateToDelete}
            viewProjectTemplate={projectTemplatesHook.viewProjectTemplate}
            dialogs={projectTemplatesHook.dialogs}
            isDeletingProjectTemplate={projectTemplatesHook.isDeletingProjectTemplate}
            
            // Loading states
            loading={projectTemplatesHook.loading}
            
            // Error states
            error={projectTemplatesHook.error}
            
            // Computed values
            filteredProjectTemplates={projectTemplatesHook.filteredProjectTemplates}
            projectTemplatesByCategory={projectTemplatesHook.projectTemplatesByCategory}
            projectTemplateStats={projectTemplatesHook.projectTemplateStats}
            
            // Actions
            actions={projectTemplatesHook.actions}
            
            // Document templates for reference
            documentTemplates={documentTemplatesHook.templates}
            documentViewMode={documentTemplatesHook.viewMode}
            onDocumentViewModeChange={documentTemplatesHook.actions.setViewMode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

