/**
 * 🏢 Enterprise Dashboard Page
 * 
 * PURPOSE: Main dashboard page following enterprise architecture principles
 * - Thin page component that orchestrates business logic and UI
 * - Clean separation of concerns via custom hooks and components
 * - Professional error handling and loading states
 * - Scalable and maintainable architecture
 * 
 * ARCHITECTURE:
 * - useDashboard: Business logic and state management
 * - DashboardContent: Pure UI component
 * - page.tsx: Orchestration and composition
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable components and logic
 * - Easy to extend and modify
 * - Clear error boundaries
 * - Professional user experience
 * - Maintainable codebase
 */

"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import AuthLoading from "@/components/ui/auth-loading";

export default function Dashboard() {
  const {
    // State
    projects,
    company,
    selectedCompanyId,
    selectedCompanyName,
    showArchived,
    loading,
    error,
    
    // Computed values
    activeProjects,
    overdueProjects,
    projectsCount,
    
    // Actions
    actions,
    
    // Auth state
    authState
  } = useDashboard();

  // Show loading screen while authentication is being checked
  // This prevents any flash of protected content
  if (authState.authLoading || !authState.currentUser) {
    return <AuthLoading message="Verifying authentication..." />;
  }

  return (
    <DashboardContent
      // State
      projects={projects}
      company={company}
      selectedCompanyId={selectedCompanyId}
      selectedCompanyName={selectedCompanyName}
      showArchived={showArchived}
      loading={loading}
      error={error}
      
      // Computed values
      activeProjects={activeProjects}
      overdueProjects={overdueProjects}
      projectsCount={projectsCount}
      
      // Actions
      onToggleArchived={actions.toggleArchived}
      onCompanyChange={actions.selectCompany}
      onRefreshProjects={actions.refreshProjects}
      onRetryError={actions.retryOnError}
      
      // Auth state
      authState={authState}
    />
  );
}
