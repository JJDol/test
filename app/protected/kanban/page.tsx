/**
 * 🏢 Enterprise Kanban Page
 * 
 * PURPOSE: Main kanban board page following enterprise architecture principles
 * - Thin page component that orchestrates business logic and UI
 * - Clean separation of concerns via custom hooks and components
 * - Professional error handling and loading states
 * - Drag-and-drop project management
 * - Advanced filtering and stage detail views
 * - Scalable and maintainable architecture
 * 
 * ARCHITECTURE:
 * - useKanban: Business logic, state management, and drag-and-drop
 * - KanbanContent: Pure UI component orchestrator
 * - page.tsx: Orchestration and composition
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable components and logic
 * - Easy to extend and modify
 * - Clear error boundaries
 * - Professional user experience
 * - Maintainable codebase
 * - Optimized drag-and-drop performance
 */

"use client";

import { useTranslations } from "next-intl";
import { useKanban } from "@/hooks/use-kanban";
import { KanbanContent } from "@/components/kanban/kanban-content";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

export default function KanbanPage() {
  const t = useTranslations("kanban");
  const {
    // State
    projects,
    users,
    filteredProjects,
    showArchived,
    filters,
    showStageDetail,
    selectedStage,
    loading,
    error,
    
    // Computed values
    projectStats,
    
    // Actions
    actions,
    
    // Auth state
    authState
  } = useKanban();

  // Show loading screen while authentication is being checked
  // TODO: Figure out what to do here
  if (authState.authLoading || !authState.currentUser) {
    return <ProtectedPageWrapper loadingMessage={t("loadingKanban")}><div /></ProtectedPageWrapper>;
  }

  return (
    <KanbanContent
      // State
      projects={projects}
      users={users}
      filteredProjects={filteredProjects}
      showArchived={showArchived}
      filters={filters}
      showStageDetail={showStageDetail}
      selectedStage={selectedStage}
      loading={loading}
      error={error}
      
      // Computed values
      projectStats={projectStats}
      
      // Actions
      onDragEnd={actions.handleDragEnd}
      onFilterChange={actions.handleFilterChange}
      onBackToKanban={actions.handleBackToKanban}
      onClearAllFilters={actions.handleClearAllFilters}
      onToggleArchived={actions.toggleArchived}
      onRefreshProjects={actions.refreshProjects}
      onRetryError={actions.retryOnError}
      
      // Auth state
      authState={authState}
    />
  );
}