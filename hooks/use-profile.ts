/**
 * 🏢 useProfile - Profile Management Business Logic Hook
 * 
 * PURPOSE: Profile-specific business logic that extends useAuth
 * - Profile updates and form management
 * - Assigned projects fetching
 * - Clean separation from UI components
 * 
 * ENTERPRISE BENEFITS:
 * - Follows established hook pattern
 * - Reuses useAuth infrastructure
 * - Testable business logic
 * - Consistent with other hooks (useDashboard, useDocuments)
 */

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

// Types
export type Project = {
  id: string;
  name: string;
  location: string;
  deadline: string;
  status: string;
  assignedTo?: string;
  leaderName?: string;
  leader_id?: string;
};

interface ProfileState {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
}

export function useProfile() {
  const { currentUser, user, refreshAuth } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<ProfileState>({
    projects: [],
    projectsLoading: false,
    projectsError: null
  });

  /**
   * Update user profile via API
   */
  const updateProfile = useCallback(async (data: { name: string }): Promise<boolean> => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
      // Refresh auth data to get updated profile
      await refreshAuth();
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
      return false;
    }
  }, [refreshAuth, toast]);

  /**
   * Fetch assigned projects for the current user
   */
  const fetchAssignedProjects = useCallback(async (): Promise<void> => {
    if (!currentUser?.assigned_projects || currentUser.assigned_projects.length === 0) {
      setState(prev => ({ ...prev, projects: [], projectsLoading: false, projectsError: null }));
      return;
    }

    try {
      setState(prev => ({ ...prev, projectsLoading: true, projectsError: null }));

      // Use existing API pattern - could be optimized to accept project IDs as query params
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const allProjects = await response.json();
      
      // Filter to only assigned projects
      const assignedProjects = allProjects.filter((project: Project) => 
        currentUser.id === project.leader_id
      );

      
      setState(prev => ({ 
        ...prev, 
        projects: assignedProjects, 
        projectsLoading: false 
      }));
      
    } catch (error) {
      console.error('Error fetching assigned projects:', error);
      setState(prev => ({ 
        ...prev, 
        projectsError: error instanceof Error ? error.message : "Failed to load projects",
        projectsLoading: false 
      }));
    }
  }, [currentUser?.assigned_projects]);

  /**
   * Save profile changes
   */
  const saveProfile = useCallback(async (name: string): Promise<boolean> => {
    return await updateProfile({ name });
  }, [updateProfile]);

  return {
    // State
    projects: state.projects,
    projectsLoading: state.projectsLoading,
    projectsError: state.projectsError,
    
    // Actions
    saveProfile,
    fetchAssignedProjects,
    
    // Computed values
    hasAssignedProjects: currentUser?.assigned_projects && currentUser.assigned_projects.length > 0,
  };
}
