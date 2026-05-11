/**
 * 🏢 Project Utils - Utility Functions for Project Management
 * 
 * PURPOSE: Centralized utility functions for project-related operations
 * - Variable type detection
 * - Status color mapping
 * - Category display name formatting
 * - Other project-related utilities
 */

import { DocumentStatus, DocumentCategory } from "@/lib/types/types";

/**
 * Get the type of a variable for a specific template
 */
// TODO: Refactor this with new API route fetching only one template and removing allTemplates parameter
export function getVariableType(templateName: string, variableName: string, allTemplates: any[]): string {
  const template = allTemplates.find(t => t.name === templateName);
  if (!template) return 'text';
  
  // Find the variable in the template's variables array
  const variableWithType = template.variables.find((v: any) => v.name === variableName);
  
  if (variableWithType) {
    return variableWithType.type;
  }
  
  return 'text';
}

/**
 * Get the color class for a document status
 */
export function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case DocumentStatus.COMPLETED:
      return "bg-green-500";
    case DocumentStatus.IN_PROGRESS:
      return "bg-yellow-500";
    case DocumentStatus.REVIEW:
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get the display name for a document category
 */
export function getCategoryDisplayName(category: DocumentCategory): string {
  switch (category) {
    case DocumentCategory.ARCHITECTURE:
      return "Architecture";
    case DocumentCategory.CONSTRUCTIONS:
      return "Constructions";
    case DocumentCategory.FIRE:
      return "Fire";
    case DocumentCategory.AUTHORITY_PROCESSING:
      return "Authority Processing";
    case DocumentCategory.ENERGY:
      return "Energy";
    case DocumentCategory.HVAC:
      return "HVAC";
    case DocumentCategory.EXECUTION_CONTROL:
      return "Execution Control";
    default:
      return category;
  }
}

/**
 * Check if a user can edit variables for a specific template
 */
export function canEditVariables(
  templateName: string, 
  project: any, 
  currentUser: any
): boolean {
  if (!project || !currentUser) return false;
  const assignment = project.document_assignments?.[templateName];
  return (
    !project.is_archived && 
    (currentUser.id === assignment?.assignee_id || 
     currentUser.id === assignment?.supervisor_id ||
     currentUser.id === project.leader_id)
  );
}

/**
 * Check if a user can check variables for a specific template
 */
export function canCheckVariables(
  templateName: string, 
  project: any, 
  currentUser: any
): boolean {
  if (!project || !currentUser) return false;
  const assignment = project.document_assignments?.[templateName];
  return (
    !project.is_archived && 
    (currentUser.id === assignment?.supervisor_id || 
     currentUser.id === project.leader_id)
  );
}

/**
 * Check if a user can edit general variables
 */
// TODO: Replace this with option that all workers can edit general variables (maybe disscuss with Joon)
export function canEditGeneralVariables(project: any, currentUser: any): boolean {
  if (!project || !currentUser) return false;
  return (
    !project.is_archived && 
    (currentUser.role === 'ADMIN' || 
     currentUser.role === 'COMPANY_ADMIN' ||
     currentUser.id === project.leader_id)
  );
}

/**
 * Format a date for display (dd. MMM. YYYY)
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}. ${month}. ${year}`;
}

/**
 * Format a date in short form for tight spaces (dd. MMM. YYYY)
 */
export function formatDateShort(date: string | Date): string {
  return formatDate(date);
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: string | Date): boolean {
  return new Date(date) < new Date();
}

/**
 * Get the appropriate text color for a deadline
 */
export function getDeadlineColor(date: string | Date): string {
  return isOverdue(date) ? "text-red-500" : "text-blue-500";
}
