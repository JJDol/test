/**
 * 🏢 DocumentTemplatesTab - Enterprise Document Templates Tab Component
 * 
 * PURPOSE: Focused UI component for document templates management
 * - Displays document templates in organized categories
 * - Handles view mode filtering (all, public, private)
 * - Manages template cards and category selection
 * - Coordinates with template dialogs
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Clean separation from business logic
 * - Reusable and maintainable
 * - Professional UI patterns
 */

"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CategorySelector } from "@/components/ui/category-selector";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingStateInline } from "@/components/ui/loading-state-inline";
import { ViewModeSelector } from "@/components/ui/view-mode-selector";
import { Plus } from "lucide-react";
import { DocumentTemplate, DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import { TemplateUploadForm } from "@/components/ui/template-upload-form";
import { DocumentTemplateCard } from "./document-template-card";
import { DocumentTemplateEditDialog } from "./document-template-edit-dialog";
import { DocumentTemplateDeleteDialog } from "./document-template-delete-dialog";


interface DocumentTemplatesTabProps {
  // State
  templates: DocumentTemplate[];
  viewMode: 'all' | 'public' | 'private';
  selectedCategory: DocumentCategory | 'ALL';
  expandedTemplates: Record<string, boolean>;
  templateToEdit: DocumentTemplate | null;
  templateToDelete: DocumentTemplate | null;
  editName: string;
  editDescription: string;
  editCategory: DocumentCategory;
  dialogs: {
    upload: boolean;
    edit: boolean;
    confirmDelete: boolean;
  };
  
  // Loading states
  loading: {
    templates: boolean;
    deleting: boolean;
    updating: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    templates: string | null;
    delete: string | null;
    update: string | null;
    overall: string | null;
  };
  
  // Computed values
  filteredTemplates: DocumentTemplate[];
  templatesByCategory: Record<DocumentCategory, DocumentTemplate[]>;
  templateStats: {
    total: number;
    public: number;
    private: number;
    byCategory: Record<DocumentCategory, number>;
  };
  
  // Actions
  actions: {
    fetchTemplates: () => Promise<void>;
    deleteTemplate: (template: DocumentTemplate) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
    updateTemplate: () => Promise<void>;
    handleUploadComplete: () => Promise<void>;
    setViewMode: (mode: 'all' | 'public' | 'private') => void;
    setSelectedCategory: (category: DocumentCategory | 'ALL') => void;
    toggleTemplateExpanded: (name: string) => void;
    openUploadDialog: () => void;
    closeUploadDialog: () => void;
    openEditDialog: (template: DocumentTemplate) => void;
    closeEditDialog: () => void;
    setEditName: (name: string) => void;
    setEditDescription: (description: string) => void;
    setEditCategory: (category: DocumentCategory) => void;
    retryOnError: () => Promise<void>;
  };
}

export function DocumentTemplatesTab({
  templates,
  viewMode,
  selectedCategory,
  expandedTemplates,
  templateToEdit,
  templateToDelete,
  editName,
  editDescription,
  editCategory,
  dialogs,
  loading,
  error,
  filteredTemplates,
  templatesByCategory,
  templateStats,
  actions,
}: DocumentTemplatesTabProps) {

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Document Templates</h2>
          <ViewModeSelector
            viewMode={viewMode}
            onViewModeChange={actions.setViewMode}
            className="mt-2"
          />
        </div>
        <Dialog open={dialogs.upload} onOpenChange={(open) => open ? actions.openUploadDialog() : actions.closeUploadDialog()}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Template</DialogTitle>
            </DialogHeader>
            <div className="pr-2">
              <TemplateUploadForm onUploadComplete={actions.handleUploadComplete} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category selector */}
      <CategorySelector
        selectedCategory={selectedCategory}
        onCategoryChange={actions.setSelectedCategory}
      />

      {/* Error state */}
      {error.overall && (
        <ErrorState
          title="Error loading templates"
          message={error.overall}
          onRetry={actions.retryOnError}
        />
      )}

      {/* Loading state */}
      {loading.templates && templates.length === 0 && (
        <LoadingStateInline message="Loading templates..." />
      )}

      {/* Templates grid */}
      {!loading.templates || templates.length > 0 ? (
        <div className="grid gap-8">
          {Object.entries(templatesByCategory)
            .filter(([category]) => selectedCategory === 'ALL' || category === selectedCategory)
            .map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-semibold">{category}</h2>
              <div className="grid gap-0">
                {categoryTemplates.map((template) => (
                  <DocumentTemplateCard
                    key={template.name}
                    template={template}
                    isExpanded={!!expandedTemplates[template.name]}
                    onToggleExpanded={() => actions.toggleTemplateExpanded(template.name)}
                    onEdit={() => actions.openEditDialog(template)}
                    onDelete={() => actions.deleteTemplate(template)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* No templates message */}
      {!loading.templates && templates.length === 0 && !error.overall && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found. Upload your first template to get started.</p>
        </div>
      )}

      {/* Edit Template Dialog */}
      <DocumentTemplateEditDialog
        open={dialogs.edit}
        onOpenChange={(open) => open ? undefined : actions.closeEditDialog()}
        templateToEdit={templateToEdit}
        editName={editName}
        editDescription={editDescription}
        editCategory={editCategory}
        onNameChange={actions.setEditName}
        onDescriptionChange={actions.setEditDescription}
        onCategoryChange={actions.setEditCategory}
        onSave={actions.updateTemplate}
        onCancel={actions.closeEditDialog}
        loading={loading.updating}
      />

      {/* Delete Confirmation Dialog */}
      <DocumentTemplateDeleteDialog
        open={dialogs.confirmDelete}
        onOpenChange={(open) => open ? undefined : actions.cancelDelete()}
        templateToDelete={templateToDelete}
        onConfirm={actions.confirmDelete}
        onCancel={actions.cancelDelete}
        loading={loading.deleting}
      />
    </>
  );
}

