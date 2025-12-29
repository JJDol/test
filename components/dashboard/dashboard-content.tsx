/**
 * 🏢 Dashboard Content - Enterprise Dashboard UI Component
 * 
 * PURPOSE: Clean, focused dashboard UI component
 * - Separated from business logic (handled by useDashboard hook)
 * - Professional error handling and loading states
 * - Responsive enterprise layout
 * - Accessibility considerations
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility (UI only)
 * - Testable UI component
 * - Reusable across different dashboard contexts
 * - Clear separation of concerns
 * - Professional user experience
 */

"use client";

import { Button } from "@/components/ui/button";
import ProjectBox from "@/components/ui/projectbox";
import { ProjectForm } from "@/components/ui/project-form";
import CompanySelector from "@/components/ui/company-selector";
import SubscriptionStatus from "@/components/ui/subscription-status";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardContentProps {
  // State
  projects: any[];
  company: any;
  selectedCompanyId: string | null;
  selectedCompanyName: string | null;
  showArchived: boolean;
  
  // Loading states
  loading: {
    projects: boolean;
    company: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    projects: string | null;
    company: string | null;
    overall: string | null;
  };
  
  // Computed values
  activeProjects: any[];
  overdueProjects: any[];
  projectsCount: number;
  
  // Actions
  onToggleArchived: () => void;
  onCompanyChange: (companyId: string | null, companyName: string | null) => void;
  onRefreshProjects: () => Promise<void>;
  onRetryError: () => Promise<void>;
  
  // Auth state
  authState: {
    currentUser: any;
    isAdmin: boolean;
    isCompanyAdmin: boolean;
    authError: string | null;
    authLoading: boolean;
  };
}

export function DashboardContent({
  projects,
  company,
  selectedCompanyId,
  selectedCompanyName,
  showArchived,
  loading,
  error,
  activeProjects,
  overdueProjects,
  projectsCount,
  onToggleArchived,
  onCompanyChange,
  onRefreshProjects,
  onRetryError,
  authState
}: DashboardContentProps) {
  const { currentUser, isAdmin, isCompanyAdmin } = authState;

  // Show loading state for initial page load
  if (loading.overall && !currentUser) {
    return (
      <LoadingState 
        title="Loading Dashboard"
        message="Please wait while we load your dashboard..."
        variant="page"
      />
    );
  }

  // Show error state with retry options
  if (error.overall) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                {error.projects && <div>Projects: {error.projects}</div>}
                {error.company && <div>Company: {error.company}</div>}
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
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex gap-6">
      <div className="flex-1 flex flex-col gap-12">
        <div className="p-4">
          {/* ADMIN Company Selector */}
          {currentUser?.role === 'ADMIN' && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted-foreground/20">
              <CompanySelector 
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={onCompanyChange}
                userRole={currentUser.role}
              />
            </div>
          )}

          {/* Unified Dashboard Header */}
          <DashboardHeader
            companyName={company?.name}
            selectedCompanyName={selectedCompanyName}
            isAdmin={isAdmin}
            selectedCompanyId={selectedCompanyId}
            hasCompany={!!company}
            projectsCount={projectsCount}
            activeProjectsCount={activeProjects.length}
            overdueProjectsCount={overdueProjects.length}
          />

          {/* Dashboard Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4 items-center">
              {currentUser?.role !== 'USER' && (
                <ProjectForm onProjectCreated={onRefreshProjects} />
              )}
              {(isAdmin || isCompanyAdmin) && (
                <Button
                  variant="outline"
                  onClick={onToggleArchived}
                  disabled={loading.projects}
                >
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
              )}
            </div>
            
            {/* Project Statistics */}
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">Total Projects: <span className="font-medium">{projectsCount}</span></p>
              <p className="text-sm text-muted-foreground">Active Projects: <span className="font-medium">{activeProjects.length}</span></p>
              {overdueProjects.length > 0 && (
                <p className="text-sm text-destructive">Overdue Projects: <span className="font-medium">{overdueProjects.length}</span></p>
              )}
            </div>
          </div>
          
          {/* Projects Grid */}
          {loading.projects ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Loading skeleton for projects */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {showArchived ? "No archived projects found" : "No projects found"}
              </div>
              {currentUser?.role !== 'USER' && !showArchived && (
                <ProjectForm onProjectCreated={onRefreshProjects} />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectBox 
                  key={project.id} 
                  project={project} 
                  onProjectDeleted={onRefreshProjects}
                  onProjectUpdated={onRefreshProjects}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Subscription Status Sidebar */}
      <div className="w-80 p-4">
        <SubscriptionStatus companyId={selectedCompanyId} />
      </div>
    </div>
  );
}
