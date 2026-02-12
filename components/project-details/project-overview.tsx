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
    <div className="bg-muted p-6 rounded-lg w-full">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Project Leader: {project.leaderName}</p>
            <p className="text-sm text-gray-600">
              Workers: {project.workers_names && project.workers_names.length > 0 
                ? (() => {
                    const maxDisplay = 3;
                    const displayNames = project.workers_names.slice(0, maxDisplay);
                    const remainingCount = project.workers_names.length - maxDisplay;
                    
                    return (
                      <>
                        {displayNames.join(', ')}
                        {remainingCount > 0 && (
                          <span className="text-gray-500">
                            {' '}and {remainingCount} more
                          </span>
                        )}
                      </>
                    );
                  })()
                : 'No workers assigned'}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button 
            variant="outline"
            onClick={onBackToDashboard}
            disabled={loadingAction !== "none"}
          >
            Back to Dashboard
          </Button>
          
          {!project.is_archived && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
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
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Variables Progress Card */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Variables Progress</h2>
          <Progress value={overallProgress} className="mb-2" />
          <p className="text-gray-600">{overallProgress}% Complete</p>
        </Card>

        {/* Supervisor Checks Card */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Supervisor Checks</h2>
          <Progress value={checkedProgress} className="mb-2" />
          <p className="text-gray-600">{checkedProgress}% Checked</p>
        </Card>

        {/* Control Progress Card */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Control Progress</h2>
          <Progress value={0} className="mb-2" />
          <p className="text-gray-600">0% Complete</p>
        </Card>

        {/* Deadline Card */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Deadline</h2>
          <p className={`text-lg ${getDeadlineColor(project.deadline)}`}>
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
