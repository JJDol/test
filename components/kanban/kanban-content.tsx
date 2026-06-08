/**
 * 🏢 Kanban Content - Enterprise Kanban UI Orchestrator
 * 
 * PURPOSE: Clean, focused kanban UI orchestrator
 * - Composed of smaller, reusable components
 * - Professional error handling and loading states
 * - Stage detail view integration
 * - Responsive enterprise layout
 * 
 * ENTERPRISE BENEFITS:
 * - Composed of focused, reusable components
 * - Testable UI component
 * - Clear separation of concerns
 * - Professional user experience
 * - Maintainable component architecture
 */

"use client";

import { useTranslations } from "next-intl";
import { LoadingState } from '@/components/ui/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { KanbanFilters } from '@/components/ui/kanban-filters';
import { StageDetailView } from '@/components/ui/stage-detail-view';
import { KanbanHeader } from './kanban-header';
import { KanbanBoard } from './kanban-board';
import { Project, ProjectStage } from '@/lib/types/types';

// Types
interface FilterState {
  search: string;
  stage: string;
  assignee: string;
  priority: string;
  projectType: string;
  location: string;
  deadlineRange: string;
}

interface KanbanContentProps {
  // State
  projects: Project[];
  users: any[];
  filteredProjects: Project[];
  showArchived: boolean;
  filters: FilterState;
  showStageDetail: boolean;
  selectedStage: ProjectStage | null;
  
  // Loading states
  loading: {
    projects: boolean;
    updating: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    projects: string | null;
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
  onDragEnd: (result: any) => Promise<void>;
  onFilterChange: (filters: FilterState) => void;
  onBackToKanban: () => void;
  onClearAllFilters: () => void;
  onToggleArchived: () => void;
  onRefreshProjects: () => Promise<void>;
  onRetryError: () => Promise<void>;
  
  // Auth state
  authState: {
    currentUser: any;
    isAdmin: boolean;
    isCompanyAdmin: boolean;
    userRole: string;
    authError: string | null;
    authLoading: boolean;
  };
}

export function KanbanContent({
  projects,
  users,
  filteredProjects,
  showArchived,
  filters,
  showStageDetail,
  selectedStage,
  loading,
  error,
  projectStats,
  onDragEnd,
  onFilterChange,
  onBackToKanban,
  onClearAllFilters,
  onToggleArchived,
  onRefreshProjects,
  onRetryError,
  authState
}: KanbanContentProps) {
  const t = useTranslations("kanban");
  const tc = useTranslations("common");

  // Show loading state for initial page load
  if (loading.overall && !authState.currentUser) {
    return (
      <LoadingState 
        title={t("loadingKanban")}
        message={t("loadingMessage")}
        variant="page"
      />
    );
  }

  // Show error state with retry options
  if (error.overall && projects.length === 0) {
    return (
      <div className="p-6">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  {error.projects && <div>Projects: {error.projects}</div>}
                  {error.update && <div>Update: {error.update}</div>}
                  {authState.authError && <div>Authentication: {authState.authError}</div>}
                </div>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={onRetryError} 
              className="w-full"
              disabled={loading.overall}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading.overall ? 'animate-spin' : ''}`} />
              {tc("retry")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show auth error state
  if (authState.authError) {
    return (
      <div className="p-6">
        <div className="text-red-500 mb-4">
          <div>{tc("error")}: {authState.authError}</div>
        </div>
        <div className="space-x-2">
          <Button onClick={onRetryError}>{tc("retry")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <KanbanHeader
        projectStats={projectStats}
        showArchived={showArchived}
        onToggleArchived={onToggleArchived}
        isAdmin={authState.isAdmin}
        isCompanyAdmin={authState.isCompanyAdmin}
      />

      {/* Advanced Filtering System */}
      <KanbanFilters
        projects={projects}
        filteredProjects={filteredProjects}
        filters={filters}
        users={users}
        onFiltersChange={onFilterChange}
        userRole={authState.userRole}
        isCompanyAdmin={authState.isCompanyAdmin}
        isAdmin={authState.isAdmin}
      />
      
      {/* Conditional Rendering: Stage Detail View or Kanban Board */}
      {showStageDetail && selectedStage ? (
        <StageDetailView
          stage={selectedStage}
          projects={filteredProjects}
          onBackToKanban={onBackToKanban}
          onClearFilters={onClearAllFilters}
        />
      ) : (
        <KanbanBoard
          projects={filteredProjects}
          onDragEnd={onDragEnd}
          isUpdating={loading.updating}
          isLoading={loading.projects}
        />
      )}
    </div>
  );
}
