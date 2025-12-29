/**
 * 🏢 useProjectPermissions - Project Permissions Management Hook
 * 
 * PURPOSE: Centralized permission checking for project-related operations
 * - Variable editing permissions
 * - Document checking permissions
 * - General variable editing permissions
 * - Project management permissions
 * - Template assignment permissions
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Centralized permission logic
 * - Reusable across components
 * - Easy to test and maintain
 * - Security-focused design
 */

"use client";

import { useMemo } from "react";
import { Project, User } from "@/lib/types/types";

// Types
interface UseProjectPermissionsReturn {
  // Basic permission checks
  canEditVariables: (templateName: string) => boolean;
  canCheckVariables: (templateName: string) => boolean;
  canEditGeneralVariables: () => boolean;
  
  // Project management permissions
  canManageProject: () => boolean;
  canArchiveProject: () => boolean;
  canDeleteProject: () => boolean;
  canUpdateProject: () => boolean;
  canAssignWorkers: () => boolean;
  
  // Template management permissions
  canAddTemplates: () => boolean;
  canRemoveTemplates: () => boolean;
  canAssignTemplates: (templateName: string) => boolean;
  
  // Document operations permissions
  canGenerateDocuments: () => boolean;
  canDownloadProject: () => boolean;
  
  // User role information
  isAdmin: boolean;
  isProjectLeader: boolean;
  isCompanyAdmin: boolean;
  isSupervisor: (templateName: string) => boolean;
  isAssignee: (templateName: string) => boolean;
  
  // Permission summary
  permissions: {
    canEdit: boolean;
    canCheck: boolean;
    canManage: boolean;
    canArchive: boolean;
    canDelete: boolean;
  };
}

export function useProjectPermissions(
  project: Project | null,
  currentUser: User | null
): UseProjectPermissionsReturn {
  
  // Memoized permission calculations
  const permissions = useMemo(() => {
    if (!project || !currentUser) {
      return {
        isAdmin: false,
        isProjectLeader: false,
        isCompanyAdmin: false,
        canEdit: false,
        canCheck: false,
        canManage: false,
        canArchive: false,
        canDelete: false,
      };
    }

    const isAdmin = currentUser.role === 'ADMIN';
    const isProjectLeader = currentUser.id === project.leader_id;
    const isCompanyAdmin = currentUser.role === 'COMPANY_ADMIN';
    
    // Basic permissions
    const canEdit = !project.is_archived;
    const canCheck = !project.is_archived;
    const canManage = isAdmin || isProjectLeader || isCompanyAdmin;
    const canArchive = isAdmin || isCompanyAdmin;
    const canDelete = isAdmin || isProjectLeader || isCompanyAdmin;

    return {
      isAdmin,
      isProjectLeader,
      isCompanyAdmin,
      canEdit,
      canCheck,
      canManage,
      canArchive,
      canDelete,
    };
  }, [project, currentUser]);

  // Variable editing permissions
  const canEditVariables = (templateName: string): boolean => {
    if (!project || !currentUser || project.is_archived) return false;
    
    const assignment = project.document_assignments?.[templateName];
    return (
      currentUser.id === assignment?.assignee_id || 
      currentUser.id === assignment?.supervisor_id ||
      currentUser.id === project.leader_id ||
      permissions.isAdmin ||
      permissions.isCompanyAdmin
    );
  };

  // Variable checking permissions
  const canCheckVariables = (templateName: string): boolean => {
    if (!project || !currentUser || project.is_archived) return false;
    
    const assignment = project.document_assignments?.[templateName];
    return (
      currentUser.id === assignment?.supervisor_id || 
      currentUser.id === project.leader_id ||
      permissions.isAdmin ||
      permissions.isCompanyAdmin
    );
  };

  // General variable editing permissions
  const canEditGeneralVariables = (): boolean => {
    if (!project || !currentUser || project.is_archived) return false;
    // TODO: Find how to let workers edit general variables
    return (
      permissions.isAdmin || 
      permissions.isCompanyAdmin ||
      permissions.isProjectLeader
    );
  };

  // Project management permissions
  const canManageProject = (): boolean => {
    return permissions.canManage;
  };

  const canArchiveProject = (): boolean => {
    return permissions.canArchive;
  };

  const canDeleteProject = (): boolean => {
    return permissions.canDelete;
  };

  const canUpdateProject = (): boolean => {
    return permissions.canManage;
  };

  const canAssignWorkers = (): boolean => {
    return permissions.canManage;
  };

  // Template management permissions
  const canAddTemplates = (): boolean => {
    return !project?.is_archived && permissions.canManage;
  };

  const canRemoveTemplates = (): boolean => {
    return !project?.is_archived && permissions.canManage;
  };

  const canAssignTemplates = (templateName: string): boolean => {
    if (!project || !currentUser || project.is_archived) return false;
    
    const assignment = project.document_assignments?.[templateName];
    return (
      permissions.isAdmin || 
      permissions.isProjectLeader || 
      currentUser.id === assignment?.supervisor_id
    );
  };

  // Document operations permissions
  const canGenerateDocuments = (): boolean => {
    return !project?.is_archived;
  };

  const canDownloadProject = (): boolean => {
    return !project?.is_archived;
  };

  // User role information
  const isSupervisor = (templateName: string): boolean => {
    if (!project || !currentUser) return false;
    
    const assignment = project.document_assignments?.[templateName];
    return currentUser.id === assignment?.supervisor_id;
  };

  const isAssignee = (templateName: string): boolean => {
    if (!project || !currentUser) return false;
    
    const assignment = project.document_assignments?.[templateName];
    return currentUser.id === assignment?.assignee_id;
  };

  return {
    // Basic permission checks
    canEditVariables,
    canCheckVariables,
    canEditGeneralVariables,
    
    // Project management permissions
    canManageProject,
    canArchiveProject,
    canDeleteProject,
    canUpdateProject,
    canAssignWorkers,
    
    // Template management permissions
    canAddTemplates,
    canRemoveTemplates,
    canAssignTemplates,
    
    // Document operations permissions
    canGenerateDocuments,
    canDownloadProject,
    
    // User role information
    isAdmin: permissions.isAdmin,
    isProjectLeader: permissions.isProjectLeader,
    isCompanyAdmin: permissions.isCompanyAdmin,
    isSupervisor,
    isAssignee,
    
    // Permission summary
    permissions: {
      canEdit: permissions.canEdit,
      canCheck: permissions.canCheck,
      canManage: permissions.canManage,
      canArchive: permissions.canArchive,
      canDelete: permissions.canDelete,
    },
  };
}
