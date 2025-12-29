"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast";

// Types
export type Colleague = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

interface ColleaguesState {
  colleagues: Colleague[];
}

interface LoadingState {
  colleagues: boolean;
  deleting: boolean;
}

interface ErrorState {
  colleagues: string | null;
  deleting: string | null;
}

export function useColleagues() {
  // State management
  const [state, setState] = useState<ColleaguesState>({
    colleagues: []
  });

  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    colleagues: false,
    deleting: false
  });

  const [errors, setErrors] = useState<ErrorState>({
    colleagues: null,
    deleting: null
  });

  const { toast } = useToast();

  // Fetch colleagues
  const fetchColleagues = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, colleagues: true }));
      setErrors(prev => ({ ...prev, colleagues: null }));

      const response = await fetch('/api/users/colleagues', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch colleagues');
      }

      
      // Additional safety filter: ensure no ADMIN users are displayed
      const safeColleagues = (result.colleagues || []).filter((c: any) => c.role !== 'ADMIN');
      setState(prev => ({ ...prev, colleagues: safeColleagues }));
      
    } catch (error) {
      console.error('Error fetching colleagues:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load colleagues";
      setErrors(prev => ({ ...prev, colleagues: errorMessage }));
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, colleagues: false }));
    }
  }, [toast]);

  // Delete colleague
  const deleteColleague = useCallback(async (colleagueId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, deleting: true }));
      setErrors(prev => ({ ...prev, deleting: null }));

      const response = await fetch('/api/users/delete-colleague', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: colleagueId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete colleague');
      }

      // Remove colleague from local state
      setState(prev => ({
        ...prev,
        colleagues: prev.colleagues.filter(c => c.id !== colleagueId)
      }));

      toast({
        title: "Success",
        description: "Colleague removed successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting colleague:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete colleague";
      setErrors(prev => ({ ...prev, deleting: errorMessage }));
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: false }));
    }
  }, [toast]);

  // Add colleague (refresh after external add)
  const onColleagueAdded = useCallback(() => {
    fetchColleagues();
  }, [fetchColleagues]);

  /**
   * Check if colleague can be deleted
   * 
   * SECURITY CHECKS:
   * 1. Cannot delete COMPANY_ADMIN users (company-level protection)
   * 2. Cannot delete ADMIN users (system-level protection)  
   * 3. Cannot delete yourself (self-preservation)
   * 
   * This prevents users from accidentally removing themselves
   * and ensures critical admin accounts remain protected.
   */
  const canDeleteColleague = useCallback((colleague: Colleague, currentUserId: string) => {
    // Safety checks:
    // 1. Cannot delete COMPANY_ADMIN or ADMIN users
    // 2. Cannot delete yourself
    return colleague.role !== 'COMPANY_ADMIN' && 
           colleague.role !== 'ADMIN' && 
           colleague.id !== currentUserId;
  }, []);

  // Get colleague deletion reason (for UI feedback)
  const getDeletionBlockReason = useCallback((colleague: Colleague, currentUserId: string) => {
    if (colleague.role === 'COMPANY_ADMIN') {
      return 'Company admins cannot be removed. Contact support for modifications.';
    }
    if (colleague.role === 'ADMIN') {
      return 'System admins cannot be removed';
    }
    if (colleague.id === currentUserId) {
      return 'You cannot remove yourself from the team.';
    }
    return null;
  }, []);

  return {
    // State
    colleagues: state.colleagues,
    
    // Loading states
    loadingStates,
    
    // Error states
    errors,
    
    // Actions
    fetchColleagues,
    deleteColleague,
    onColleagueAdded,
    
    // Utilities
    canDeleteColleague,
    getDeletionBlockReason,
  };
}
