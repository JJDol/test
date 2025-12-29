
/**
 * 🏢 useTemplates - Enterprise Document Templates Business Logic Hook
 * 
 * PURPOSE: Centralized document template management state and business logic
 * - Separates concerns from UI components
 * - Manages complex template operations (CRUD, filtering, categories)
 * - Provides comprehensive error handling and recovery
 * - Optimizes API calls and state updates
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable business logic
 * - Reusable across template components
 * - Clear separation of UI and business concerns
 * - Professional error handling and recovery
 * - Optimized state management
 * 
 * FEATURES:
 * - Template CRUD operations
 * - Category and view mode filtering
 * - Template expansion/collapse state
 * - Upload and edit dialogs management
 * - Professional error boundaries
 * 
 * USAGE:
 * ```typescript
 * const {
 *   templates,
 *   loading,
 *   error,
 *   viewMode,
 *   selectedCategory,
 *   filteredTemplates,
 *   actions: {
 *     fetchTemplates,
 *     deleteTemplate,
 *     updateTemplate,
 *     setViewMode,
 *     setSelectedCategory
 *   }
 * } = useTemplates();
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { DocumentTemplate, DocumentCategory } from "@/lib/types/types";

// Types
type ViewMode = 'all' | 'public' | 'private';

interface TemplateDialogState {
  upload: boolean;
  edit: boolean;
  confirmDelete: boolean;
}

interface TemplatesState {
  templates: DocumentTemplate[];
  viewMode: ViewMode;
  selectedCategory: DocumentCategory | 'ALL';
  expandedTemplates: Record<string, boolean>;
  templateToEdit: DocumentTemplate | null;
  templateToDelete: DocumentTemplate | null;
  editName: string;
  editDescription: string;
  editCategory: DocumentCategory;
  dialogs: TemplateDialogState;
}

interface TemplatesActions {
  // Data operations
  fetchTemplates: () => Promise<void>;
  deleteTemplate: (template: DocumentTemplate) => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  updateTemplate: () => Promise<void>;
  handleUploadComplete: () => Promise<void>;
  
  // UI state management
  setViewMode: (mode: ViewMode) => void;
  setSelectedCategory: (category: DocumentCategory | 'ALL') => void;
  toggleTemplateExpanded: (name: string) => void;
  
  // Dialog management
  openUploadDialog: () => void;
  closeUploadDialog: () => void;
  openEditDialog: (template: DocumentTemplate) => void;
  closeEditDialog: () => void;
  setEditName: (name: string) => void;
  setEditDescription: (description: string) => void;
  setEditCategory: (category: DocumentCategory) => void;
  
  // Error handling
  retryOnError: () => Promise<void>;
}

interface UseTemplatesReturn {
  // State
  templates: DocumentTemplate[];
  viewMode: ViewMode;
  selectedCategory: DocumentCategory | 'ALL';
  expandedTemplates: Record<string, boolean>;
  templateToEdit: DocumentTemplate | null;
  templateToDelete: DocumentTemplate | null;
  editName: string;
  editDescription: string;
  editCategory: DocumentCategory;
  dialogs: TemplateDialogState;
  
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
  actions: TemplatesActions;
}

export function useTemplates(): UseTemplatesReturn {
  const { toast } = useToast();
  
  // State management
  const [state, setState] = useState<TemplatesState>({
    templates: [],
    viewMode: 'all',
    selectedCategory: 'ALL',
    expandedTemplates: {},
    templateToEdit: null,
    templateToDelete: null,
    editName: '',
    editDescription: '',
    editCategory: DocumentCategory.ARCHITECTURE,
    dialogs: {
      upload: false,
      edit: false,
      confirmDelete: false,
    },
  });

  const [loadingStates, setLoadingStates] = useState({
    templates: true,
    deleting: false,
    updating: false,
  });

  const [errors, setErrors] = useState({
    templates: null as string | null,
    delete: null as string | null,
    update: null as string | null,
  });

  // Fetch templates with comprehensive error handling
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, templates: true }));
      setErrors(prev => ({ ...prev, templates: null }));
      
      console.log('[useTemplates] Fetching templates...');
      
      // Build query parameters based on view mode
      const params = new URLSearchParams();
      if (state.viewMode === 'public') {
        params.append('isPublic', 'true');
      } else if (state.viewMode === 'private') {
        params.append('isPrivate', 'true');
      }
      
      const response = await fetch(`/api/document-templates?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useTemplates] Fetched templates count:', data?.length);
      
      setState(prev => ({
        ...prev,
        templates: data.map((template: any) => ({
          ...template,
          category: template.category as DocumentCategory,
          variables: template.variables || []
        }))
      }));
      
    } catch (error) {
      console.error('[useTemplates] Error fetching templates:', error);
      setErrors(prev => ({ 
        ...prev, 
        templates: error instanceof Error ? error.message : "Failed to fetch templates"
      }));
      
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, templates: false }));
    }
  }, [state.viewMode, toast]);

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!state.templateToDelete) return;

    try {
      setLoadingStates(prev => ({ ...prev, deleting: true }));
      setErrors(prev => ({ ...prev, delete: null }));
      
      console.log('[useTemplates] Deleting template:', state.templateToDelete.name);
      
      const response = await fetch(`/api/document-templates/${encodeURIComponent(state.templateToDelete.name)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[useTemplates] Delete failed response:', errorData);
        throw new Error(errorData.message || 'Failed to delete template');
      }

      const result = await response.json();
      console.log('[useTemplates] Delete result:', result);
      
      let description = "Template deleted successfully";
      if (result.details) {
        const { projectsUpdated, assignmentsRemoved, variablesRemoved } = result.details;
        if (projectsUpdated > 0 || assignmentsRemoved > 0 || variablesRemoved > 0) {
          description = `Template deleted successfully. Cleaned up: ${projectsUpdated} projects, ${assignmentsRemoved} assignments, ${variablesRemoved} variable sets.`;
        }
      }
      
      toast({
        title: "Success",
        description: description,
      });

      // Refresh templates list
      await fetchTemplates();
      
    } catch (error) {
      console.error('[useTemplates] Error deleting template:', error);
      setErrors(prev => ({ 
        ...prev, 
        delete: error instanceof Error ? error.message : "Failed to delete template"
      }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: false }));
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, confirmDelete: false },
        templateToDelete: null
      }));
    }
  };

  // Update template
  const handleUpdateTemplate = async () => {
    if (!state.templateToEdit) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, updating: true }));
      setErrors(prev => ({ ...prev, update: null }));
      
      const response = await fetch('/api/document-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalName: state.templateToEdit.name,
          name: state.editName.trim(),
          description: state.editDescription.trim() || null,
          category: state.editCategory,
        })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Update failed' }));
        throw new Error(err.message || 'Update failed');
      }
      
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, edit: false },
        templateToEdit: null
      }));
      
      await fetchTemplates();
      
      toast({ 
        title: 'Updated', 
        description: 'Template updated successfully' 
      });
      
    } catch (error) {
      console.error('[useTemplates] Update template error:', error);
      setErrors(prev => ({ 
        ...prev, 
        update: error instanceof Error ? error.message : "Failed to update template"
      }));
      
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update template', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, updating: false }));
    }
  };

  // Actions
  const actions: TemplatesActions = {
    // Data operations
    fetchTemplates,
    
    deleteTemplate: (template: DocumentTemplate) => {
      setState(prev => ({
        ...prev,
        templateToDelete: template,
        dialogs: { ...prev.dialogs, confirmDelete: true }
      }));
    },
    
    confirmDelete: handleDeleteTemplate,
    
    cancelDelete: () => {
      setState(prev => ({
        ...prev,
        templateToDelete: null,
        dialogs: { ...prev.dialogs, confirmDelete: false }
      }));
    },
    
    updateTemplate: handleUpdateTemplate,
    
    handleUploadComplete: async () => {
      try {
        setState(prev => ({
          ...prev,
          dialogs: { ...prev.dialogs, upload: false }
        }));
        await fetchTemplates();
      } catch (error) {
        console.error('[useTemplates] Error refreshing templates after upload:', error);
      }
    },
    
    // UI state management
    setViewMode: (mode: ViewMode) => {
      setState(prev => ({ ...prev, viewMode: mode }));
    },
    
    setSelectedCategory: (category: DocumentCategory | 'ALL') => {
      setState(prev => ({ ...prev, selectedCategory: category }));
    },
    
    toggleTemplateExpanded: (name: string) => {
      setState(prev => ({
        ...prev,
        expandedTemplates: { 
          ...prev.expandedTemplates, 
          [name]: !prev.expandedTemplates[name] 
        }
      }));
    },
    
    // Dialog management
    openUploadDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, upload: true }
      }));
    },
    
    closeUploadDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, upload: false }
      }));
    },
    
    openEditDialog: (template: DocumentTemplate) => {
      setState(prev => ({
        ...prev,
        templateToEdit: template,
        editName: template.name,
        editDescription: template.description || '',
        editCategory: template.category,
        dialogs: { ...prev.dialogs, edit: true }
      }));
    },
    
    closeEditDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, edit: false },
        templateToEdit: null
      }));
    },
    
    setEditName: (name: string) => {
      setState(prev => ({ ...prev, editName: name }));
    },
    
    setEditDescription: (description: string) => {
      setState(prev => ({ ...prev, editDescription: description }));
    },
    
    setEditCategory: (category: DocumentCategory) => {
      setState(prev => ({ ...prev, editCategory: category }));
    },
    
    // Error handling
    retryOnError: async () => {
      if (errors.templates) await fetchTemplates();
    }
  };

  // Initialize data
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Computed values
  const filteredTemplates = state.templates.filter(template => {
    if (state.selectedCategory !== 'ALL' && template.category !== state.selectedCategory) {
      return false;
    }
    return true;
  });

  const templatesByCategory = state.templates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<DocumentCategory, DocumentTemplate[]>);

  const templateStats = {
    total: state.templates.length,
    public: state.templates.filter(t => t.is_public).length,
    private: state.templates.filter(t => !t.is_public).length,
    byCategory: Object.values(DocumentCategory).reduce((acc, category) => {
      acc[category] = state.templates.filter(t => t.category === category).length;
      return acc;
    }, {} as Record<DocumentCategory, number>),
  };

  // Loading and error state consolidation
  const overallLoading = loadingStates.templates || loadingStates.deleting || loadingStates.updating;
  const overallError = errors.templates || errors.delete || errors.update;

  return {
    // State
    templates: state.templates,
    viewMode: state.viewMode,
    selectedCategory: state.selectedCategory,
    expandedTemplates: state.expandedTemplates,
    templateToEdit: state.templateToEdit,
    templateToDelete: state.templateToDelete,
    editName: state.editName,
    editDescription: state.editDescription,
    editCategory: state.editCategory,
    dialogs: state.dialogs,
    
    // Loading states
    loading: {
      templates: loadingStates.templates,
      deleting: loadingStates.deleting,
      updating: loadingStates.updating,
      overall: overallLoading,
    },
    
    // Error states
    error: {
      templates: errors.templates,
      delete: errors.delete,
      update: errors.update,
      overall: overallError,
    },
    
    // Computed values
    filteredTemplates,
    templatesByCategory,
    templateStats,
    
    // Actions
    actions,
  };
}
