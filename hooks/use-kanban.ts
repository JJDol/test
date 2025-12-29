/**
 * 🏢 useKanban - Enterprise Kanban Board Business Logic Hook
 * 
 * PURPOSE: Centralized kanban board state management and business logic
 * - Separates concerns from UI components
 * - Manages drag-and-drop operations with optimistic updates
 * - Provides comprehensive filtering and search
 * - Handles stage detail view transitions
 * - Professional error handling and recovery
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable business logic
 * - Reusable across kanban components
 * - Clear separation of UI and business concerns
 * - Professional error handling and recovery
 * - Optimized drag-and-drop performance
 * 
 * FEATURES:
 * - Real-time project updates
 * - Advanced filtering system
 * - Drag-and-drop stage transitions
 * - Stage detail view management
 * - Archive/unarchive functionality
 * - Role-based access control
 * 
 * USAGE:
 * ```typescript
 * const {
 *   projects,
 *   filteredProjects,
 *   loading,
 *   error,
 *   filters,
 *   showStageDetail,
 *   selectedStage,
 *   actions: {
 *     handleDragEnd,
 *     handleFilterChange,
 *     toggleArchived,
 *     refreshProjects
 *   }
 * } = useKanban();
 * ```
 * 
 * TODO: Add priority, project type, deadline range, and description filters, add ordering of cards in a stage
 * TODO: Dragging to done can archive the project
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Project, ProjectStage } from '@/lib/types/types';


interface FilterState {
  search: string;
  stage: string;
  assignee: string;
  priority: string;
  projectType: string;
  location: string;
  deadlineRange: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface KanbanState {
  projects: Project[];
  users: User[];
  showArchived: boolean;
  filters: FilterState;
  showStageDetail: boolean;
  selectedStage: ProjectStage | null;
}

interface KanbanActions {
  handleDragEnd: (result: any) => Promise<void>;
  handleFilterChange: (newFilters: FilterState) => void;
  handleBackToKanban: () => void;
  handleClearAllFilters: () => void;
  toggleArchived: () => void;
  refreshProjects: () => Promise<void>;
  retryOnError: () => Promise<void>;
}

interface UseKanbanReturn {
  // State
  projects: Project[];
  users: User[];
  filteredProjects: Project[];
  showArchived: boolean;
  filters: FilterState;
  showStageDetail: boolean;
  selectedStage: ProjectStage | null;
  
  // Loading states
  loading: {
    projects: boolean;
    users: boolean;
    updating: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    projects: string | null;
    users: string | null;
    update: string | null;
    overall: string | null;
  };
  
  // Computed values
  projectStats: {
    total: number;
    byStage: Record<ProjectStage, number>;
    archived: number;
  };
  
  // Actions
  actions: KanbanActions;
  
  // Auth integration
  authState: {
    currentUser: any;
    isAdmin: boolean;
    isCompanyAdmin: boolean;
    userRole: string;
    authError: string | null;
    authLoading: boolean;
  };
}

export function useKanban(): UseKanbanReturn {
  const router = useRouter();
  const { currentUser, isAdmin, isCompanyAdmin, error: authError, isLoading: authLoading, refreshAuth } = useAuth();
  
  // State management
  const [state, setState] = useState<KanbanState>({
    projects: [],
    users: [],
    showArchived: false,
    filters: {
      search: "",
      stage: "",
      assignee: "",
      priority: "",
      projectType: "",
      location: "",
      deadlineRange: ""
    },
    showStageDetail: false,
    selectedStage: null,
  });

  const [loadingStates, setLoadingStates] = useState({
    projects: true,
    users: false,
    updating: false,
  });

  const [errors, setErrors] = useState({
    projects: null as string | null,
    users: null as string | null,
    update: null as string | null,
  });



  // Client-side authentication guard
  useEffect(() => {
    if (!authLoading && !currentUser) {
      console.log("No authenticated user found, redirecting to sign-in");
      router.push("/sign-in?reason=auth_required");
    }
  }, [authLoading, currentUser, router]);

  // Fetch projects with comprehensive error handling
  const fetchProjects = useCallback(async (showArchived?: boolean) => {
    try {
      setLoadingStates(prev => ({ ...prev, projects: true }));
      setErrors(prev => ({ ...prev, projects: null }));
      
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      
      // Use provided showArchived parameter or fall back to state
      const shouldShowArchived = showArchived !== undefined ? showArchived : state.showArchived;
      
      // Filter projects based on archived status and admin role
      const filteredProjects = (data || []).filter((project: Project) => {
        if (isAdmin || isCompanyAdmin) {
          return shouldShowArchived ? project.is_archived : !project.is_archived;
        }
        return !project.is_archived;
      });

      setState(prev => ({ ...prev, projects: filteredProjects }));
      
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrors(prev => ({ 
        ...prev, 
        projects: error instanceof Error ? error.message : "Failed to load projects"
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, projects: false }));
    }
  }, [isAdmin, isCompanyAdmin, state.showArchived]);

  // Fetch users for assignee filter using API route
  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, users: true }));
      setErrors(prev => ({ ...prev, users: null }));

      const response = await fetch('/api/users/company-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      setState(prev => ({ ...prev, users: data.users || [] }));
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrors(prev => ({ 
        ...prev, 
        users: error instanceof Error ? error.message : "Failed to load users"
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, users: false }));
    }
  }, [currentUser]);

  // Apply filters to projects with optimized performance
  const filteredProjects = useMemo(() => {
    return state.projects.filter(project => {
      // Search filter - search across name, location, and leader name
      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        const nameMatch = project.name.toLowerCase().includes(searchTerm);
        const locationMatch = project.location && project.location.toLowerCase().includes(searchTerm);
        const leaderMatch = project.leader?.name && project.leader.name.toLowerCase().includes(searchTerm);
        
        // Project is included if search term matches ANY of: name, location, or leader name
        if (!nameMatch && !locationMatch && !leaderMatch) {
          return false;
        }
      }

      // Stage filter
      if (state.filters.stage && project.stage !== state.filters.stage) {
        return false;
      }

      // Assignee filter
      if (state.filters.assignee && project.leader_id !== state.filters.assignee) {
        return false;
      }

      // Location filter
      if (state.filters.location && project.location !== state.filters.location) {
        return false;
      }

      // Future filters can be added here
      // Priority, project type, deadline range, etc.

      return true;
    });
  }, [state.projects, state.filters]);

  // Drag and drop handler with optimistic updates
  const handleDragEnd = useCallback(async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const newStage = destination.droppableId as ProjectStage;
    const projectId = parseInt(draggableId);

    try {
      setLoadingStates(prev => ({ ...prev, updating: true }));
      setErrors(prev => ({ ...prev, update: null }));

      // Optimistically update UI
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(project => 
          Number(project.id) === projectId 
            ? { ...project, stage: newStage }
            : project
        )
      }));

      // Update via API route
      // TODO: Maybe create separate route for this so we dont have to check everything in the project route
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update project: ${response.status}`);
      }

    } catch (error) {
      console.error('Error updating project stage:', error);
      setErrors(prev => ({ 
        ...prev, 
        update: error instanceof Error ? error.message : "Failed to update project stage"
      }));
      
      // Revert on error
      await fetchProjects();
    } finally {
      setLoadingStates(prev => ({ ...prev, updating: false }));
    }
  }, [fetchProjects]);

  // Actions
  const actions: KanbanActions = {
    handleDragEnd,
    
    handleFilterChange: (newFilters: FilterState) => {
      setState(prev => ({ ...prev, filters: newFilters }));
      
      // If a specific stage is selected, switch to detail view
      if (newFilters.stage && newFilters.stage !== "all") {
        setState(prev => ({
          ...prev,
          selectedStage: newFilters.stage as ProjectStage,
          showStageDetail: true
        }));
      } else {
        setState(prev => ({
          ...prev,
          showStageDetail: false,
          selectedStage: null
        }));
      }
    },
    
    handleBackToKanban: () => {
      setState(prev => ({
        ...prev,
        showStageDetail: false,
        selectedStage: null,
        filters: { ...prev.filters, stage: "" }
      }));
    },
    
    handleClearAllFilters: () => {
      setState(prev => ({
        ...prev,
        filters: {
          search: "",
          stage: "",
          assignee: "",
          priority: "",
          projectType: "",
          location: "",
          deadlineRange: ""
        }
      }));
    },
    
    toggleArchived: () => {
      setState(prev => {
        const newShowArchived = !prev.showArchived;
        // Fetch projects with the new archive state
        fetchProjects(newShowArchived);
        return { ...prev, showArchived: newShowArchived };
      });
    },
    
    refreshProjects: fetchProjects,
    
    retryOnError: async () => {
      if (errors.projects) await fetchProjects();
      if (authError) await refreshAuth();
    }
  };

  // Initialize data
  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [fetchProjects, fetchUsers]);

  // Computed values
  const projectStats = {
    total: state.projects.length,
    byStage: {
      [ProjectStage.TODO]: state.projects.filter(p => p.stage === ProjectStage.TODO).length,
      [ProjectStage.IN_PROGRESS]: state.projects.filter(p => p.stage === ProjectStage.IN_PROGRESS).length,
      [ProjectStage.REVIEW]: state.projects.filter(p => p.stage === ProjectStage.REVIEW).length,
      [ProjectStage.DONE]: state.projects.filter(p => p.stage === ProjectStage.DONE).length,
    },
    archived: state.projects.filter(p => p.is_archived).length,
  };

  // Loading and error state consolidation
  const overallLoading = loadingStates.projects || loadingStates.users || authLoading;
  const overallError = errors.projects || errors.users || errors.update || authError;

  return {
    // State
    projects: state.projects,
    users: state.users,
    filteredProjects,
    showArchived: state.showArchived,
    filters: state.filters,
    showStageDetail: state.showStageDetail,
    selectedStage: state.selectedStage,
    
    // Loading states
    loading: {
      projects: loadingStates.projects,
      users: loadingStates.users,
      updating: loadingStates.updating,
      overall: overallLoading,
    },
    
    // Error states
    error: {
      projects: errors.projects,
      users: errors.users,
      update: errors.update,
      overall: overallError,
    },
    
    // Computed values
    projectStats,
    
    // Actions
    actions,
    
    // Auth integration
    authState: {
      currentUser,
      isAdmin,
      isCompanyAdmin,
      userRole: currentUser?.role || 'USER',
      authError,
      authLoading,
    }
  };
}
