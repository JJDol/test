/**
 * 🏢 ProjectTemplatesTab - Enterprise Project Templates Tab Component
 * 
 * PURPOSE: Focused UI component for project templates management
 * - Displays project templates in organized categories
 * - Handles project template CRUD operations
 * - Manages template assignment dialogs
 * - Professional card-based layout with collapsible sections
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategorySelector } from "@/components/ui/category-selector";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingStateInline } from "@/components/ui/loading-state-inline";
import { Plus, ChevronDown, ChevronRight, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp } from "lucide-react";
import { ProjectTemplate, DocumentCategory, getCategoryDisplayName, DocumentTemplate } from "@/lib/types/types";
import type { SortMode } from "@/hooks/use-templates";
import { ProjectTemplateDialog } from "./project-template-dialog";
import { ProjectTemplateViewDialog } from "./project-template-view-dialog";
import { ProjectTemplateDeleteDialog } from "./project-template-delete-dialog";
import { ProjectTemplateCard } from "./project-template-card";


interface ProjectTemplatesTabProps {
  // State
  projectTemplates: ProjectTemplate[];
  selectedProjectCategory: DocumentCategory | 'ALL';
  sortMode: SortMode;
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
    setSortMode: (mode: SortMode) => void;
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
  sortMode,
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
  const t = useTranslations("templates");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6 mt-16">
        <h2 className="text-3xl font-bold">{t("projectTemplates")}</h2>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.setSortMode('name-asc')} className={sortMode === 'name-asc' ? 'bg-accent' : ''}>
                <ArrowDownAZ className="mr-2 h-4 w-4" />
                Name (A → Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.setSortMode('name-desc')} className={sortMode === 'name-desc' ? 'bg-accent' : ''}>
                <ArrowUpAZ className="mr-2 h-4 w-4" />
                Name (Z → A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.setSortMode('modified-newest')} className={sortMode === 'modified-newest' ? 'bg-accent' : ''}>
                <CalendarArrowDown className="mr-2 h-4 w-4" />
                Modified (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.setSortMode('modified-oldest')} className={sortMode === 'modified-oldest' ? 'bg-accent' : ''}>
                <CalendarArrowUp className="mr-2 h-4 w-4" />
                Modified (Oldest)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogs.create} onOpenChange={(open) => open ? actions.openCreateDialog() : actions.closeCreateDialog()}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("createProjectTemplate")}
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Category selector */}
      <CategorySelector
        selectedCategory={selectedProjectCategory}
        onCategoryChange={actions.setSelectedProjectCategory}
      />

      {/* Error state */}
      {error.overall && (
        <ErrorState
          title={t("errorLoadingProjectTemplates")}
          message={error.overall}
          onRetry={actions.retryOnError}
        />
      )}

      {/* Loading state */}
      {loading.projectTemplates && projectTemplates.length === 0 && (
        <LoadingStateInline message={t("loadingProjectTemplates")} />
      )}

      {/* Project templates grid */}
      {!loading.projectTemplates || projectTemplates.length > 0 ? (
        <div className="grid gap-6">
          {Object.entries(projectTemplatesByCategory)
            .filter(([category]) => selectedProjectCategory === 'ALL' || category === selectedProjectCategory)
            .map(([category, categoryProjectTemplates]) => {
              const isCollapsed = collapsedCategories.has(category);
              return (
                <div key={category} className="rounded-lg bg-muted/30 border border-border/50">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-3 w-full px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center justify-center w-6 h-6">
                      {isCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold uppercase tracking-wide">
                      {getCategoryDisplayName(category as DocumentCategory)}
                    </h3>
                    <span className="text-sm text-muted-foreground font-medium">
                      {categoryProjectTemplates.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 pb-4">
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
                  )}
                </div>
              );
            })}
        </div>
      ) : null}

      {/* No project templates message */}
      {!loading.projectTemplates && projectTemplates.length === 0 && !error.overall && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("noProjectTemplatesFound")}</p>
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

