/**
 * 🏢 ProjectOverview - Project Header and Stats Component
 * 
 * PURPOSE: Displays project header information and key statistics
 * - Project name, leader, and workers information
 * - Action buttons (download, archive, edit, delete)
 * - Key metrics cards (location, progress, checks, deadline)
 * - Permission-based button visibility
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across project components
 * - Clean separation of concerns
 * - Professional UI with proper loading states
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjectWorkersDialog } from "@/components/ui/project-workers-dialog";
import { UpdateProjectForm } from "@/components/ui/update-project-form";
import { DeleteProject } from "@/components/ui/delete-project";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Archive, Loader2, MoreHorizontal, Users, Edit, Trash2 } from "lucide-react";
import { formatDate, getDeadlineColor } from "@/utils/project-utils";
import { User, Project } from "@/lib/types/types";

interface ProjectOverviewProps {
  // Data
  project: Project | null;
  currentUser: User | null;
  
  // Loading state
  loadingAction: string;
  
  // Computed values
  checkedProgress: number;
  overallProgress: number;
  
  // Permissions
  canManageProject: boolean;
  canArchiveProject: boolean;
  canDeleteProject: boolean;
  canUpdateProject: boolean;
  canAssignWorkers: boolean;
  canDownloadProject: boolean;
  
  // Actions
  onBackToDashboard: () => void;
  onDownloadProject: () => Promise<void>;
  onArchiveProject: () => Promise<void>;
  onProjectDeleted: () => void;
  onProjectUpdated: () => Promise<void>;
}

export function ProjectOverview({
  project,
  currentUser,
  loadingAction,
  checkedProgress,
  overallProgress,
  canManageProject,
  canArchiveProject,
  canDeleteProject,
  canUpdateProject,
  canAssignWorkers,
  canDownloadProject,
  onBackToDashboard,
  onDownloadProject,
  onArchiveProject,
  onProjectDeleted,
  onProjectUpdated,
}: ProjectOverviewProps) {
  // Dialog state
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  if (!project) {
    return null;
  }


  return (
    <div className="bg-muted p-4 rounded-lg w-full h-fit sticky top-4 relative">
      {/* Three Dots Menu - Top Right */}
      {!project.is_archived && (
        <div className="absolute top-2 right-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Workers Management */}
              {canAssignWorkers && (
                <ProjectWorkersDialog
                  projectId={Number(project.id)}
                  currentWorkers={project?.workers || []}
                  onWorkersUpdated={onProjectUpdated}
                  leaderId={project?.leader_id}
                />
              )}
              
              {/* Download Project */}
              {canDownloadProject && (
                <DropdownMenuItem 
                  onClick={onDownloadProject}
                  disabled={loadingAction !== "none"}
                >
                  {loadingAction === "download" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download Project
                </DropdownMenuItem>
              )}
              
              {/* Update Project */}
              {canUpdateProject && (
                <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Project
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {/* Archive Project */}
              {canArchiveProject && (
                <DropdownMenuItem 
                  onClick={onArchiveProject}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Project
                </DropdownMenuItem>
              )}
              
              {/* Delete Project */}
              {canDeleteProject && (
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Project Info Section */}
      <div className="mb-4 pr-8">
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Project Leader</p>
            <p className="text-gray-700">{project.leaderName || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Workers</p>
            <p className="text-gray-700">
              {project.workers_names && project.workers_names.length > 0 
                ? (() => {
                    const maxDisplay = 3;
                    const displayNames = project.workers_names.slice(0, maxDisplay);
                    const remainingCount = project.workers_names.length - maxDisplay;
                    
                    return (
                      <>
                        {displayNames.join(', ')}
                        {remainingCount > 0 && (
                          <span className="text-gray-500">
                            {' '}+{remainingCount} more
                          </span>
                        )}
                      </>
                    );
                  })()
                : 'No workers assigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Vertical Stack */}
      <div className="space-y-3">
        {/* Variables Progress Card */}
        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">Variables Progress</h2>
          <Progress value={overallProgress} className="mb-1 h-2" />
          <p className="text-xs text-gray-600">{overallProgress}% Complete</p>
        </Card>

        {/* Supervisor Checks Card */}
        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">Supervisor Checks</h2>
          <Progress value={checkedProgress} className="mb-1 h-2" />
          <p className="text-xs text-gray-600">{checkedProgress}% Checked</p>
        </Card>

        {/* Control Progress Card */}
        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">Control Progress</h2>
          <Progress value={0} className="mb-1 h-2" />
          <p className="text-xs text-gray-600">0% Complete</p>
        </Card>

        {/* Deadline Card */}
        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">Deadline</h2>
          <p className={`text-sm font-medium ${getDeadlineColor(project.deadline)}`}>
            {formatDate(project.deadline)}
          </p>
        </Card>
      </div>

      {/* Dialogs */}
      
      {showUpdateDialog && (
        <UpdateProjectForm 
          project={project}
          onProjectUpdated={onProjectUpdated}
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
        />
      )}
      
      {showDeleteDialog && (
        <DeleteProject
          project={project}
          onDeleted={onProjectDeleted}
        />
      )}
    </div>
  );
}
