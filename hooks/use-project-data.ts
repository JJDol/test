/**
 * 🏢 useProjectData - Project Data Fetching Hook
 * 
 * PURPOSE: Handles all data fetching operations for project details
 * - Project data fetching and management
 * - Users and current user fetching
 * - Templates fetching by category
 * - URL parameter handling
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Focused on data operations only
 * - Reusable across project components
 * - Clear error handling
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { DocumentCategory } from "@/lib/types/types";
import { ProjectDataState, ProjectDataActions, UseProjectDataReturn } from "@/lib/types/types";

export function useProjectData(projectId: string): UseProjectDataReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // State management
  const [state, setState] = useState<ProjectDataState>({
    project: null,
    currentUser: null,
    workers: [],
    activeCategory: DocumentCategory.ARCHITECTURE,
    templates: [],
    allTemplates: [],
  });

  const [loadingStates, setLoadingStates] = useState({
    project: true,
    workers: false,
    currentUser: false,
    templates: false,
  });

  const [errors, setErrors] = useState({
    project: null as string | null,
    workers: null as string | null,
    currentUser: null as string | null,
    templates: null as string | null,
  });

  // Track if category has been initialized (to prevent re-fetching templates on every project update)
  const categoryInitializedRef = useRef(false);

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, project: true }));
      setErrors(prev => ({ ...prev, project: null }));
      
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      const data = await response.json();
      
      setState(prev => ({ ...prev, project: data }));

      // Fetch all templates for progress calculation
      // TODO: Create new API route for this which fetches all templates for the project
      const allTemplatesResponse = await fetch('/api/document-templates');
      if (!allTemplatesResponse.ok) {
        throw new Error("Failed to fetch all templates");
      }
      const allTemplatesData = await allTemplatesResponse.json();
      setState(prev => ({ ...prev, allTemplates: allTemplatesData }));
      
    } catch (error) {
        // TODO: Maybe use toast instead of console.error
      console.error("Error fetching project:", error);
      setErrors(prev => ({ 
        ...prev, 
        project: error instanceof Error ? error.message : "Failed to fetch project"
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, project: false }));
    }
  }, [projectId]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, users: true }));
      setErrors(prev => ({ ...prev, users: null }));
      
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      const usersData = await response.json();
      setState(prev => ({ ...prev, users: usersData || [] }));
      
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrors(prev => ({ 
        ...prev, 
        users: error instanceof Error ? error.message : "Failed to fetch users"
      }));
      
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, users: false }));
    }
  }, [toast]);

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, currentUser: true }));
      setErrors(prev => ({ ...prev, currentUser: null }));
      
      const response = await fetch('/api/auth/current-user');
      if (!response.ok) {
        throw new Error(`Failed to fetch current user: ${response.status}`);
      }
      const userData = await response.json();
      setState(prev => ({ ...prev, currentUser: userData }));
      
    } catch (error) {
      console.error('Error fetching current user:', error);
      setErrors(prev => ({ 
        ...prev, 
        currentUser: error instanceof Error ? error.message : "Failed to fetch current user profile"
      }));
      
      toast({
        title: "Error",
        description: "Failed to fetch current user profile",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, currentUser: false }));
    }
  }, [toast]);

  // Fetch templates for category
  const fetchTemplatesForCategory = useCallback(async (category: DocumentCategory) => {
    try {
      setLoadingStates(prev => ({ ...prev, templates: true }));
      setErrors(prev => ({ ...prev, templates: null }));
      
      const response = await fetch(`/api/document-templates?category=${category}`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      
      setState(prev => ({ ...prev, templates: data }));
      
    } catch (error) {
      console.error("Error fetching templates:", error);
      setErrors(prev => ({ 
        ...prev, 
        templates: error instanceof Error ? error.message : "Failed to fetch templates"
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, templates: false }));
    }
  }, []);

  // Set active category and update URL
  const setActiveCategory = useCallback((category: DocumentCategory) => {
    setState(prev => ({ ...prev, activeCategory: category }));
    fetchTemplatesForCategory(category);
    
    // Update URL immediately when switching tabs
    const params = new URLSearchParams(searchParams);
    params.set('category', category);
    router.push(`/protected/dashboard/project/${projectId}?${params.toString()}`, { scroll: false });
  }, [fetchTemplatesForCategory, searchParams, router, projectId]);

  // Refresh project data (silent = no loading state shown)
  const refreshProject = useCallback(async (silent: boolean = false) => {
    if (silent) {
      // Silent refresh - fetch without triggering loading state
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }
        const data = await response.json();
        setState(prev => ({ ...prev, project: data }));
      } catch (error) {
        console.error("Error refreshing project silently:", error);
        // Don't show error toast for silent refreshes - the optimistic update is already in place
      }
    } else {
      await fetchProject();
    }
  }, [fetchProject, projectId]);

  // Actions object
  const actions: ProjectDataActions = {
    fetchProject,
    fetchUsers,
    fetchCurrentUser,
    fetchTemplatesForCategory,
    setActiveCategory,
    refreshProject,
    updateProjectState: setState,
  };

  // Initialize data
  useEffect(() => {
    fetchProject();
    fetchUsers();
    fetchCurrentUser();
  }, [fetchProject, fetchUsers, fetchCurrentUser]);

  // Set default category and handle URL parameters (only on initial load)
  useEffect(() => {
    // Only run initialization once when project first loads
    if (state.project && !categoryInitializedRef.current) {
      // Get the first category from DocumentCategory enum as default
      const defaultCategory = Object.values(DocumentCategory)[0];

      // Check if there's a category in the URL
      const categoryFromUrl = searchParams.get('category') as DocumentCategory;

      // Set active category: URL parameter first, then default
      let targetCategory = defaultCategory;
      if (categoryFromUrl && Object.values(DocumentCategory).includes(categoryFromUrl)) {
        targetCategory = categoryFromUrl;
      }

      // Set the active category on initial load
      setState(prev => ({ ...prev, activeCategory: targetCategory }));

      // Ensure URL has category parameter on initial load
      if (!categoryFromUrl || categoryFromUrl !== targetCategory) {
        const params = new URLSearchParams(searchParams);
        params.set('category', targetCategory);
        router.replace(`/protected/dashboard/project/${projectId}?${params.toString()}`, { scroll: false });
      }

      // Fetch templates for the target category
      fetchTemplatesForCategory(targetCategory);

      // Mark as initialized
      categoryInitializedRef.current = true;
    }
  }, [state.project, searchParams, projectId, router, fetchTemplatesForCategory]);

  // Loading and error state consolidation
  const overallLoading = loadingStates.project || loadingStates.workers || loadingStates.currentUser || loadingStates.templates;
  const overallError = errors.project || errors.workers || errors.currentUser || errors.templates;

  return {
    // State
    project: state.project,
    currentUser: state.currentUser,
    workers: state.workers,
    activeCategory: state.activeCategory,
    templates: state.templates,
    allTemplates: state.allTemplates,
    
    // Loading states
    loading: {
      project: loadingStates.project,
      workers: loadingStates.workers,
      currentUser: loadingStates.currentUser,
      templates: loadingStates.templates,
      overall: overallLoading,
    },
    
    // Error states
    error: {
      project: errors.project,
      workers: errors.workers,
      currentUser: errors.currentUser,
      templates: errors.templates,
      overall: overallError,
    },
    
    // Actions
    actions,
  };
}
