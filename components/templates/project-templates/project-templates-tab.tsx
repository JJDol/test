/**
 * 🏢 ProjectTemplatesTab - Enterprise Project Templates Tab Component
 * 
 * PURPOSE: Focused UI component for project templates management
 * - Displays project templates in organized categories
 * - Handles project template CRUD operations
 * - Manages template assignment dialogs
 * - Professional card-based layout
 */

"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { CategorySelector } from "@/components/ui/category-selector";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingStateInline } from "@/components/ui/loading-state-inline";
import { Plus } from "lucide-react";
import { ProjectTemplate, DocumentCategory, getCategoryDisplayName, DocumentTemplate } from "@/lib/types/types";
import { ProjectTemplateDialog } from "./project-template-dialog";
import { ProjectTemplateViewDialog } from "./project-template-view-dialog";
import { ProjectTemplateDeleteDialog } from "./project-template-delete-dialog";
import { ProjectTemplateCard } from "./project-template-card";


interface ProjectTemplatesTabProps {
  // State
  projectTemplates: ProjectTemplate[];
  selectedProjectCategory: DocumentCategory | 'ALL';
  newProjectTemplate: {
    name: string;
    templates: string[];
    category: DocumentCategory;
  };
  editProjectTemplate: {
    name: string;
    templates: string[];
    category: DocumentCategory;
  };
  projectTemplateToEdit: ProjectTemplate | null;
  projectTemplateToDelete: ProjectTemplate | null;
  viewProjectTemplate: ProjectTemplate | null;
  dialogs: {
    create: boolean;
    edit: boolean;
    view: boolean;
    confirmDelete: boolean;
  };
  isDeletingProjectTemplate: boolean;
  
  // Loading states
  loading: {
    projectTemplates: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    projectTemplates: string | null;
    create: string | null;
    update: string | null;
    delete: string | null;
    overall: string | null;
  };
  
  // Computed values
  filteredProjectTemplates: ProjectTemplate[];
  projectTemplatesByCategory: Record<DocumentCategory, ProjectTemplate[]>;
  projectTemplateStats: {
    total: number;
    byCategory: Record<DocumentCategory, number>;
  };
  
  // Actions
  actions: {
    fetchProjectTemplates: () => Promise<void>;
    createProjectTemplate: () => Promise<void>;
    updateProjectTemplate: () => Promise<void>;
    deleteProjectTemplate: () => Promise<void>;
    setSelectedProjectCategory: (category: DocumentCategory | 'ALL') => void;
    setNewProjectTemplateName: (name: string) => void;
    setNewProjectTemplateCategory: (category: DocumentCategory) => void;
    setNewProjectTemplateTemplates: (templates: string[]) => void;
    addTemplateToNew: (templateName: string) => void;
    removeTemplateFromNew: (templateName: string) => void;
    resetNewProjectTemplate: () => void;
    setEditProjectTemplateName: (name: string) => void;
    setEditProjectTemplateCategory: (category: DocumentCategory) => void;
    setEditProjectTemplateTemplates: (templates: string[]) => void;
    addTemplateToEdit: (templateName: string) => void;
    removeTemplateFromEdit: (templateName: string) => void;
    openCreateDialog: () => void;
    closeCreateDialog: () => void;
    openEditDialog: (projectTemplate: ProjectTemplate) => void;
    closeEditDialog: () => void;
    openViewDialog: (projectTemplate: ProjectTemplate) => void;
    closeViewDialog: () => void;
    openDeleteDialog: (projectTemplate: ProjectTemplate) => void;
    closeDeleteDialog: () => void;
    retryOnError: () => Promise<void>;
  };
  
  // Document templates for reference
  documentTemplates: DocumentTemplate[];
  documentViewMode: 'all' | 'public' | 'private';
  onDocumentViewModeChange: (mode: 'all' | 'public' | 'private') => void;
}

export function ProjectTemplatesTab({
  projectTemplates,
  selectedProjectCategory,
  newProjectTemplate,
  editProjectTemplate,
  projectTemplateToEdit,
  projectTemplateToDelete,
  viewProjectTemplate,
  dialogs,
  isDeletingProjectTemplate,
  loading,
  error,
  filteredProjectTemplates,
  projectTemplatesByCategory,
  projectTemplateStats,
  actions,
  documentTemplates,
  documentViewMode,
  onDocumentViewModeChange,
}: ProjectTemplatesTabProps) {

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Project Templates</h2>
        <Dialog open={dialogs.create} onOpenChange={(open) => open ? actions.openCreateDialog() : actions.closeCreateDialog()}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Project Template
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Category selector */}
      <CategorySelector
        selectedCategory={selectedProjectCategory}
        onCategoryChange={actions.setSelectedProjectCategory}
      />

      {/* Error state */}
      {error.overall && (
        <ErrorState
          title="Error loading project templates"
          message={error.overall}
          onRetry={actions.retryOnError}
        />
      )}

      {/* Loading state */}
      {loading.projectTemplates && projectTemplates.length === 0 && (
        <LoadingStateInline message="Loading project templates..." />
      )}

      {/* Project templates grid */}
      {!loading.projectTemplates || projectTemplates.length > 0 ? (
        <div className="grid gap-8">
          {Object.entries(projectTemplatesByCategory)
            .filter(([category]) => selectedProjectCategory === 'ALL' || category === selectedProjectCategory)
            .map(([category, categoryProjectTemplates]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-xl font-semibold">{getCategoryDisplayName(category as DocumentCategory)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProjectTemplates.map((pt) => (
                  <ProjectTemplateCard
                    key={pt.name}
                    projectTemplate={pt}
                    onView={actions.openViewDialog}
                    onEdit={actions.openEditDialog}
                    onDelete={actions.openDeleteDialog}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* No project templates message */}
      {!loading.projectTemplates && projectTemplates.length === 0 && !error.overall && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No project templates found. Create your first project template to get started.</p>
        </div>
      )}

      {/* Create Project Template Dialog */}
      <ProjectTemplateDialog
        open={dialogs.create}
        onOpenChange={(open) => open ? undefined : actions.closeCreateDialog()}
        mode="create"
        projectTemplate={newProjectTemplate}
        documentTemplates={documentTemplates}
        documentViewMode={documentViewMode}
        onDocumentViewModeChange={onDocumentViewModeChange}
        onNameChange={actions.setNewProjectTemplateName}
        onCategoryChange={actions.setNewProjectTemplateCategory}
        onTemplatesChange={actions.setNewProjectTemplateTemplates}
        onAddTemplate={actions.addTemplateToNew}
        onRemoveTemplate={actions.removeTemplateFromNew}
        onSave={actions.createProjectTemplate}
        onCancel={actions.closeCreateDialog}
        loading={loading.creating}
      />

      {/* Edit Project Template Dialog */}
      <ProjectTemplateDialog
        open={dialogs.edit}
        onOpenChange={(open) => open ? undefined : actions.closeEditDialog()}
        mode="edit"
        projectTemplate={editProjectTemplate}
        documentTemplates={documentTemplates}
        documentViewMode={documentViewMode}
        onDocumentViewModeChange={onDocumentViewModeChange}
        onNameChange={actions.setEditProjectTemplateName}
        onCategoryChange={actions.setEditProjectTemplateCategory}
        onTemplatesChange={actions.setEditProjectTemplateTemplates}
        onAddTemplate={actions.addTemplateToEdit}
        onRemoveTemplate={actions.removeTemplateFromEdit}
        onSave={actions.updateProjectTemplate}
        onCancel={actions.closeEditDialog}
        loading={loading.updating}
      />

      {/* View Project Template Dialog */}
      <ProjectTemplateViewDialog
        open={dialogs.view}
        onOpenChange={(open) => open ? undefined : actions.closeViewDialog()}
        viewProjectTemplate={viewProjectTemplate}
        onClose={actions.closeViewDialog}
      />

      {/* Delete Project Template Dialog */}
      <ProjectTemplateDeleteDialog
        open={dialogs.confirmDelete}
        onOpenChange={(open) => open ? undefined : actions.closeDeleteDialog()}
        projectTemplateToDelete={projectTemplateToDelete}
        onConfirm={actions.deleteProjectTemplate}
        onCancel={actions.closeDeleteDialog}
        loading={loading.deleting}
        isDeletingProjectTemplate={isDeletingProjectTemplate}
      />
    </>
  );
}

