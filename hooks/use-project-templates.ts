/**
 * 🏢 useProjectTemplates - Enterprise Project Templates Business Logic Hook
 * 
 * PURPOSE: Centralized project template management state and business logic
 * - Separates concerns from UI components
 * - Manages complex project template operations (CRUD, filtering, categories)
 * - Provides comprehensive error handling and recovery
 * - Optimizes API calls and state updates
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable business logic
 * - Reusable across project template components
 * - Clear separation of UI and business concerns
 * - Professional error handling and recovery
 * - Optimized state management
 * 
 * FEATURES:
 * - Project template CRUD operations
 * - Category filtering
 * - Template assignment management
 * - Create, edit, view, and delete dialogs
 * - Professional error boundaries
 * 
 * USAGE:
 * ```typescript
 * const {
 *   projectTemplates,
 *   loading,
 *   error,
 *   selectedProjectCategory,
 *   filteredProjectTemplates,
 *   actions: {
 *     fetchProjectTemplates,
 *     createProjectTemplate,
 *     updateProjectTemplate,
 *     deleteProjectTemplate
 *   }
 * } = useProjectTemplates();
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { ProjectTemplate, DocumentCategory, DocumentTemplate } from "@/lib/types/types";
import type { SortMode } from "./use-templates";

// Types
interface ProjectTemplateDialogState {
  create: boolean;
  edit: boolean;
  view: boolean;
  confirmDelete: boolean;
}

interface NewProjectTemplateState {
  name: string;
  templates: string[];
  category: DocumentCategory;
}

interface EditProjectTemplateState {
  name: string;
  templates: string[];
  category: DocumentCategory;
}

interface ProjectTemplatesState {
  projectTemplates: ProjectTemplate[];
  selectedProjectCategory: DocumentCategory | 'ALL';
  sortMode: SortMode;
  newProjectTemplate: NewProjectTemplateState;
  editProjectTemplate: EditProjectTemplateState;
  projectTemplateToEdit: ProjectTemplate | null;
  projectTemplateToDelete: ProjectTemplate | null;
  viewProjectTemplate: ProjectTemplate | null;
  dialogs: ProjectTemplateDialogState;
  isDeletingProjectTemplate: boolean;
}

interface ProjectTemplatesActions {
  // Data operations
  fetchProjectTemplates: () => Promise<void>;
  createProjectTemplate: () => Promise<void>;
  updateProjectTemplate: () => Promise<void>;
  deleteProjectTemplate: () => Promise<void>;
  
  // UI state management
  setSelectedProjectCategory: (category: DocumentCategory | 'ALL') => void;
  setSortMode: (mode: SortMode) => void;
  
  // New project template management
  setNewProjectTemplateName: (name: string) => void;
  setNewProjectTemplateCategory: (category: DocumentCategory) => void;
  setNewProjectTemplateTemplates: (templates: string[]) => void;
  addTemplateToNew: (templateName: string) => void;
  removeTemplateFromNew: (templateName: string) => void;
  resetNewProjectTemplate: () => void;
  
  // Edit project template management
  setEditProjectTemplateName: (name: string) => void;
  setEditProjectTemplateCategory: (category: DocumentCategory) => void;
  setEditProjectTemplateTemplates: (templates: string[]) => void;
  addTemplateToEdit: (templateName: string) => void;
  removeTemplateFromEdit: (templateName: string) => void;
  
  // Dialog management
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (projectTemplate: ProjectTemplate) => void;
  closeEditDialog: () => void;
  openViewDialog: (projectTemplate: ProjectTemplate) => void;
  closeViewDialog: () => void;
  openDeleteDialog: (projectTemplate: ProjectTemplate) => void;
  closeDeleteDialog: () => void;
  
  // Error handling
  retryOnError: () => Promise<void>;
}

interface UseProjectTemplatesReturn {
  // State
  projectTemplates: ProjectTemplate[];
  selectedProjectCategory: DocumentCategory | 'ALL';
  sortMode: SortMode;
  newProjectTemplate: NewProjectTemplateState;
  editProjectTemplate: EditProjectTemplateState;
  projectTemplateToEdit: ProjectTemplate | null;
  projectTemplateToDelete: ProjectTemplate | null;
  viewProjectTemplate: ProjectTemplate | null;
  dialogs: ProjectTemplateDialogState;
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
  actions: ProjectTemplatesActions;
}

export function useProjectTemplates(templates: DocumentTemplate[] = []): UseProjectTemplatesReturn {
  const { toast } = useToast();
  
  // State management
  const [state, setState] = useState<ProjectTemplatesState>({
    projectTemplates: [],
    selectedProjectCategory: 'ALL',
    sortMode: 'name-asc',
    newProjectTemplate: {
      name: '',
      templates: [],
      category: DocumentCategory.ARCHITECTURE
    },
    editProjectTemplate: {
      name: '',
      templates: [],
      category: DocumentCategory.ARCHITECTURE
    },
    projectTemplateToEdit: null,
    projectTemplateToDelete: null,
    viewProjectTemplate: null,
    dialogs: {
      create: false,
      edit: false,
      view: false,
      confirmDelete: false,
    },
    isDeletingProjectTemplate: false,
  });

  const [loadingStates, setLoadingStates] = useState({
    projectTemplates: true,
    creating: false,
    updating: false,
    deleting: false,
  });

  const [errors, setErrors] = useState({
    projectTemplates: null as string | null,
    create: null as string | null,
    update: null as string | null,
    delete: null as string | null,
  });

  // Fetch project templates
  const fetchProjectTemplates = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, projectTemplates: true }));
      setErrors(prev => ({ ...prev, projectTemplates: null }));
      
      console.log('[useProjectTemplates] Fetching project templates via API...');
      const response = await fetch('/api/project-templates', { method: 'GET' });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch project templates');
      }
      
      const data = await response.json();
      console.log('[useProjectTemplates] Project templates count:', data?.length);
      
      setState(prev => ({ ...prev, projectTemplates: data }));
      
    } catch (error) {
      console.error('[useProjectTemplates] Error fetching project templates:', error);
      setErrors(prev => ({ 
        ...prev, 
        projectTemplates: error instanceof Error ? error.message : "Failed to fetch project templates"
      }));
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch project templates',
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, projectTemplates: false }));
    }
  }, [toast]);

  // Create project template
  const handleCreateProjectTemplate = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, creating: true }));
      setErrors(prev => ({ ...prev, create: null }));
      
      console.log('[useProjectTemplates] Creating project template via API:', state.newProjectTemplate);
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.newProjectTemplate),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create project template');
      }

      toast({ 
        title: 'Success', 
        description: 'Project template created successfully' 
      });
      
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, create: false },
        newProjectTemplate: { 
          name: '', 
          templates: [], 
          category: DocumentCategory.ARCHITECTURE 
        }
      }));
      
      await fetchProjectTemplates();
      
    } catch (error) {
      console.error('[useProjectTemplates] Error creating project template:', error);
      setErrors(prev => ({ 
        ...prev, 
        create: error instanceof Error ? error.message : "Failed to create project template"
      }));
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project template',
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, creating: false }));
    }
  };

  // Update project template
  const handleUpdateProjectTemplate = async () => {
    if (!state.projectTemplateToEdit) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, updating: true }));
      setErrors(prev => ({ ...prev, update: null }));
      
      console.log('[useProjectTemplates] Updating project template via API from:', state.projectTemplateToEdit.name, 'to:', state.editProjectTemplate);
      const response = await fetch(`/api/project-templates/${encodeURIComponent(state.projectTemplateToEdit.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.editProjectTemplate.name,
          templates: state.editProjectTemplate.templates,
          category: state.editProjectTemplate.category,
        }),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update project template');
      }

      toast({ 
        title: 'Updated', 
        description: 'Project template updated successfully' 
      });
      
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, edit: false },
        projectTemplateToEdit: null
      }));
      
      await fetchProjectTemplates();
      
    } catch (error) {
      console.error('[useProjectTemplates] Error updating project template:', error);
      setErrors(prev => ({ 
        ...prev, 
        update: error instanceof Error ? error.message : "Failed to update project template"
      }));
      
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update project template', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, updating: false }));
    }
  };

  // Delete project template
  const handleDeleteProjectTemplate = async () => {
    if (!state.projectTemplateToDelete) return;
    
    // Prevent multiple deletions
    if (state.isDeletingProjectTemplate) {
      console.log('[useProjectTemplates] Delete already in progress, ignoring');
      return;
    }

    setState(prev => ({ ...prev, isDeletingProjectTemplate: true }));
    setLoadingStates(prev => ({ ...prev, deleting: true }));

    try {
      setErrors(prev => ({ ...prev, delete: null }));
      
      console.log('[useProjectTemplates] Deleting project template via API:', state.projectTemplateToDelete.name);
      
      // Add timeout to prevent infinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`/api/project-templates/${encodeURIComponent(state.projectTemplateToDelete.name)}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete project template');
      }

      console.log('[useProjectTemplates] Delete successful, refreshing data...');
      
      // Wait for data refresh to complete BEFORE showing toast
      await fetchProjectTemplates();
      console.log('[useProjectTemplates] Data refresh completed');
      
      // Show toast AFTER everything is cleaned up
      setTimeout(() => {
        toast({ 
          title: 'Success', 
          description: 'Project template deleted successfully' 
        });
      }, 100);
      
    } catch (error) {
      console.error('[useProjectTemplates] Error deleting project template:', error);
      setErrors(prev => ({ 
        ...prev, 
        delete: error instanceof Error ? error.message : "Failed to delete project template"
      }));
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project template',
        variant: 'destructive',
      });
    } finally {
      console.log('[useProjectTemplates] Cleanup: Resetting states');
      setState(prev => ({
        ...prev,
        isDeletingProjectTemplate: false,
        dialogs: { ...prev.dialogs, confirmDelete: false },
        projectTemplateToDelete: null
      }));
      setLoadingStates(prev => ({ ...prev, deleting: false }));
    }
  };

  // Actions
  const actions: ProjectTemplatesActions = {
    // Data operations
    fetchProjectTemplates,
    createProjectTemplate: handleCreateProjectTemplate,
    updateProjectTemplate: handleUpdateProjectTemplate,
    deleteProjectTemplate: handleDeleteProjectTemplate,
    
    // UI state management
    setSelectedProjectCategory: (category: DocumentCategory | 'ALL') => {
      setState(prev => ({ ...prev, selectedProjectCategory: category }));
    },

    setSortMode: (mode: SortMode) => {
      setState(prev => ({ ...prev, sortMode: mode }));
    },
    
    // New project template management
    setNewProjectTemplateName: (name: string) => {
      setState(prev => ({
        ...prev,
        newProjectTemplate: { ...prev.newProjectTemplate, name }
      }));
    },
    
    setNewProjectTemplateCategory: (category: DocumentCategory) => {
      setState(prev => ({
        ...prev,
        newProjectTemplate: { 
          ...prev.newProjectTemplate, 
          category, 
          templates: [] // Reset templates when category changes
        }
      }));
    },
    
    setNewProjectTemplateTemplates: (templates: string[]) => {
      setState(prev => ({
        ...prev,
        newProjectTemplate: { ...prev.newProjectTemplate, templates }
      }));
    },
    
    addTemplateToNew: (templateName: string) => {
      setState(prev => ({
        ...prev,
        newProjectTemplate: {
          ...prev.newProjectTemplate,
          templates: [...prev.newProjectTemplate.templates, templateName]
        }
      }));
    },
    
    removeTemplateFromNew: (templateName: string) => {
      setState(prev => ({
        ...prev,
        newProjectTemplate: {
          ...prev.newProjectTemplate,
          templates: prev.newProjectTemplate.templates.filter(t => t !== templateName)
        }
      }));
    },
    
    resetNewProjectTemplate: () => {
      setState(prev => ({
        ...prev,
        newProjectTemplate: {
          name: '',
          templates: [],
          category: DocumentCategory.ARCHITECTURE
        }
      }));
    },
    
    // Edit project template management
    setEditProjectTemplateName: (name: string) => {
      setState(prev => ({
        ...prev,
        editProjectTemplate: { ...prev.editProjectTemplate, name }
      }));
    },
    
    setEditProjectTemplateCategory: (category: DocumentCategory) => {
      setState(prev => ({
        ...prev,
        editProjectTemplate: { 
          ...prev.editProjectTemplate, 
          category, 
          templates: [] 
        }
      }));
    },
    
    setEditProjectTemplateTemplates: (templates: string[]) => {
      setState(prev => ({
        ...prev,
        editProjectTemplate: { ...prev.editProjectTemplate, templates }
      }));
    },
    
    addTemplateToEdit: (templateName: string) => {
      setState(prev => ({
        ...prev,
        editProjectTemplate: {
          ...prev.editProjectTemplate,
          templates: [...prev.editProjectTemplate.templates, templateName]
        }
      }));
    },
    
    removeTemplateFromEdit: (templateName: string) => {
      setState(prev => ({
        ...prev,
        editProjectTemplate: {
          ...prev.editProjectTemplate,
          templates: prev.editProjectTemplate.templates.filter(t => t !== templateName)
        }
      }));
    },
    
    // Dialog management
    openCreateDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, create: true }
      }));
    },
    
    closeCreateDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, create: false }
      }));
      actions.resetNewProjectTemplate();
    },
    
    openEditDialog: (projectTemplate: ProjectTemplate) => {
      setState(prev => ({
        ...prev,
        projectTemplateToEdit: projectTemplate,
        editProjectTemplate: {
          name: projectTemplate.name,
          templates: projectTemplate.templates || [],
          category: projectTemplate.category as DocumentCategory
        },
        dialogs: { ...prev.dialogs, edit: true }
      }));
    },
    
    closeEditDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, edit: false },
        projectTemplateToEdit: null
      }));
    },
    
    openViewDialog: (projectTemplate: ProjectTemplate) => {
      setState(prev => ({
        ...prev,
        viewProjectTemplate: projectTemplate,
        dialogs: { ...prev.dialogs, view: true }
      }));
    },
    
    closeViewDialog: () => {
      setState(prev => ({
        ...prev,
        dialogs: { ...prev.dialogs, view: false },
        viewProjectTemplate: null
      }));
    },
    
    openDeleteDialog: (projectTemplate: ProjectTemplate) => {
      setState(prev => ({
        ...prev,
        projectTemplateToDelete: projectTemplate,
        dialogs: { ...prev.dialogs, confirmDelete: true }
      }));
    },
    
    closeDeleteDialog: () => {
      setState(prev => ({
        ...prev,
        projectTemplateToDelete: null,
        dialogs: { ...prev.dialogs, confirmDelete: false }
      }));
    },
    
    // Error handling
    retryOnError: async () => {
      if (errors.projectTemplates) await fetchProjectTemplates();
    }
  };

  // Initialize data
  useEffect(() => {
    fetchProjectTemplates();
  }, [fetchProjectTemplates]);

  // Computed values
  const filteredProjectTemplates = state.projectTemplates.filter(pt => {
    if (state.selectedProjectCategory !== 'ALL' && pt.category !== state.selectedProjectCategory) {
      return false;
    }
    return true;
  });

  const sortProjectTemplates = (templates: ProjectTemplate[]): ProjectTemplate[] => {
    return [...templates].sort((a, b) => {
      switch (state.sortMode) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'modified-newest':
          return (b.updated_at || '').localeCompare(a.updated_at || '');
        case 'modified-oldest':
          return (a.updated_at || '').localeCompare(b.updated_at || '');
        default:
          return 0;
      }
    });
  };

  const projectTemplatesByCategory = Object.entries(
    state.projectTemplates.reduce((acc, pt) => {
      const category = pt.category as DocumentCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(pt);
      return acc;
    }, {} as Record<DocumentCategory, ProjectTemplate[]>)
  ).reduce((acc, [category, templates]) => {
    acc[category as DocumentCategory] = sortProjectTemplates(templates);
    return acc;
  }, {} as Record<DocumentCategory, ProjectTemplate[]>);

  const projectTemplateStats = {
    total: state.projectTemplates.length,
    byCategory: Object.values(DocumentCategory).reduce((acc, category) => {
      acc[category] = state.projectTemplates.filter(pt => pt.category === category).length;
      return acc;
    }, {} as Record<DocumentCategory, number>),
  };

  // Loading and error state consolidation
  const overallLoading = loadingStates.projectTemplates || loadingStates.creating || loadingStates.updating || loadingStates.deleting;
  const overallError = errors.projectTemplates || errors.create || errors.update || errors.delete;

  return {
    // State
    projectTemplates: state.projectTemplates,
    selectedProjectCategory: state.selectedProjectCategory,
    sortMode: state.sortMode,
    newProjectTemplate: state.newProjectTemplate,
    editProjectTemplate: state.editProjectTemplate,
    projectTemplateToEdit: state.projectTemplateToEdit,
    projectTemplateToDelete: state.projectTemplateToDelete,
    viewProjectTemplate: state.viewProjectTemplate,
    dialogs: state.dialogs,
    isDeletingProjectTemplate: state.isDeletingProjectTemplate,
    
    // Loading states
    loading: {
      projectTemplates: loadingStates.projectTemplates,
      creating: loadingStates.creating,
      updating: loadingStates.updating,
      deleting: loadingStates.deleting,
      overall: overallLoading,
    },
    
    // Error states
    error: {
      projectTemplates: errors.projectTemplates,
      create: errors.create,
      update: errors.update,
      delete: errors.delete,
      overall: overallError,
    },
    
    // Computed values
    filteredProjectTemplates,
    projectTemplatesByCategory,
    projectTemplateStats,
    
    // Actions
    actions,
  };
}
