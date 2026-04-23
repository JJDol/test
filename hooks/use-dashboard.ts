/**
 * 🏢 useDashboard - Enterprise Dashboard Business Logic Hook
 * 
 * PURPOSE: Centralized dashboard state management and business logic
 * - Separates concerns from UI components
 * - Provides comprehensive error handling
 * - Manages complex state interactions
 * - Optimizes data fetching and caching
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable business logic
 * - Reusable across dashboard components
 * - Clear separation of UI and business concerns
 * - Professional error handling and recovery
 * 
 * USAGE:
 * ```typescript
 * const {
 *   projects,
 *   company,
 *   loading,
 *   error,
 *   showArchived,
 *   selectedCompanyId,
 *   actions: {
 *     toggleArchived,
 *     selectCompany,
 *     refreshProjects,
 *     retryOnError
 *   }
 * } = useDashboard();
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Project } from "@/lib/types/types";

interface Company {
  id: string;
  name: string;
  email_domain?: string;
  created_at: string;
}

interface DashboardState {
  projects: Project[];
  company: Company | null;
  selectedCompanyId: string | null;
  selectedCompanyName: string | null;
  showArchived: boolean;
  isLoading: boolean;
  error: string | null;
}

interface DashboardActions {
  toggleArchived: () => void;
  selectCompany: (companyId: string | null, companyName: string | null) => void;
  refreshProjects: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  retryOnError: () => Promise<void>;
}

interface UseDashboardReturn {
  // State
  projects: Project[];
  company: Company | null;
  selectedCompanyId: string | null;
  selectedCompanyName: string | null;
  showArchived: boolean;
  loading: {
    projects: boolean;
    company: boolean;
    overall: boolean;
  };
  error: {
    projects: string | null;
    company: string | null;
    overall: string | null;
  };
  
  // Computed values
  activeProjects: Project[];
  overdueProjects: Project[];
  projectsCount: number;
  
  // Actions
  actions: DashboardActions;
  
  // Auth integration
  authState: {
    currentUser: any;
    isAdmin: boolean;
    isCompanyAdmin: boolean;
    authError: string | null;
    authLoading: boolean;
  };
}

export function useDashboard(): UseDashboardReturn {
  const router = useRouter();
  const { currentUser, isAdmin, isCompanyAdmin, error: authError, isLoading: authLoading, refreshAuth } = useAuth();
  
  // State management
  const [state, setState] = useState<DashboardState>({
    projects: [],
    company: null,
    selectedCompanyId: null,
    selectedCompanyName: null,
    showArchived: false,
    isLoading: true,
    error: null,
  });

  const [loadingStates, setLoadingStates] = useState({
    projects: true,
    company: false,
  });

  const [errors, setErrors] = useState({
    projects: null as string | null,
    company: null as string | null,
  });

  // Authentication is handled by useAuth hook - no need to redirect here

  // Company info fetching
  const fetchCompanyInfo = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, company: true }));
      setErrors(prev => ({ ...prev, company: null }));
      
      const response = await fetch("/api/company");
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, company: data.company }));
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
      setErrors(prev => ({ 
        ...prev, 
        company: error instanceof Error ? error.message : "Failed to fetch company info"
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, company: false }));
    }
  }, []);

  // Projects fetching with comprehensive error handling
  const fetchProjects = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, projects: true }));
      setErrors(prev => ({ ...prev, projects: null }));
      
      // Build URL with company filter for ADMIN users
      let url = "/api/projects";
      if (isAdmin && state.selectedCompanyId) {
        url += `?company_id=${state.selectedCompanyId}`;
      }
      
      const response = await fetch(url);
      const responseText = await response.text();
      let data;
      
      // Handle empty response gracefully
      if (!responseText || responseText.trim() === '') {
        data = [];
      } else {
        data = JSON.parse(responseText);
      }
      
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch projects");
      }
      
      // Ensure data is always an array
      if (!data || !Array.isArray(data)) {
        data = [];
      }
      
      // Filter projects based on archived status and admin role
      const filteredProjects = data.filter(project => {
        if (isAdmin || isCompanyAdmin) {
          return state.showArchived ? project.is_archived : !project.is_archived;
        }
        return !project.is_archived;
      });
      
      setState(prev => ({ ...prev, projects: filteredProjects }));
      
    } catch (error) {
      console.error("Error fetching projects:", error);
      setErrors(prev => ({ 
        ...prev, 
        projects: error instanceof Error ? error.message : "Failed to fetch projects"
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, projects: false }));
    }
  }, [isAdmin, isCompanyAdmin, state.selectedCompanyId, state.showArchived]);

  // Actions
  const actions: DashboardActions = {
    toggleArchived: () => {
      setState(prev => ({ ...prev, showArchived: !prev.showArchived }));
    },
    
    selectCompany: (companyId: string | null, companyName: string | null) => {
      setState(prev => ({ 
        ...prev, 
        selectedCompanyId: companyId,
        selectedCompanyName: companyName
      }));
    },
    
    refreshProjects: fetchProjects,
    refreshCompany: fetchCompanyInfo,
    
    retryOnError: async () => {
      if (errors.projects) await fetchProjects();
      if (errors.company) await fetchCompanyInfo();
      if (authError) await refreshAuth();
    }
  };

  // Only fetch dashboard data after the user is authenticated. Firing these
  // requests during the "verifying authentication" phase creates a burst of
  // parallel API calls that race the Supabase token refresh on Vercel and
  // can corrupt the refresh-token rotation.
  useEffect(() => {
    if (!currentUser) return;
    fetchCompanyInfo();
  }, [fetchCompanyInfo, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    fetchProjects();
  }, [fetchProjects, currentUser]);

  // Computed values
  const activeProjects = state.projects.filter(p => p.progress < 100);
  const overdueProjects = state.projects.filter(p => new Date(p.deadline) < new Date());

  // Loading and error state consolidation
  const overallLoading = loadingStates.projects || loadingStates.company || authLoading;
  const overallError = errors.projects || errors.company || authError;

  return {
    // State
    projects: state.projects,
    company: state.company,
    selectedCompanyId: state.selectedCompanyId,
    selectedCompanyName: state.selectedCompanyName,
    showArchived: state.showArchived,
    
    // Loading states
    loading: {
      projects: loadingStates.projects,
      company: loadingStates.company,
      overall: overallLoading,
    },
    
    // Error states
    error: {
      projects: errors.projects,
      company: errors.company,
      overall: overallError,
    },
    
    // Computed values
    activeProjects,
    overdueProjects,
    projectsCount: state.projects.length,
    
    // Actions
    actions,
    
    // Auth integration
    authState: {
      currentUser,
      isAdmin,
      isCompanyAdmin,
      authError,
      authLoading,
    }
  };
}
