/**
 * 🏢 ProjectOverview - Project header, team, stats, and actions
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Archive,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  PauseCircle,
} from "lucide-react";
import { formatDate, getDeadlineColor } from "@/utils/project-utils";
import { User, Project } from "@/lib/types/types";
import {
  UserAvatar,
  UserAvatarStack,
  type UserLike,
} from "@/components/ui/user-avatar";

export interface ProjectHoldState {
  is_on_hold: boolean;
  on_hold_by: string | null;
  on_hold_at: string | null;
  on_hold_note: string | null;
}

interface ProjectOverviewProps {
  project: Project | null;
  currentUser: User | null;
  loadingAction: string;
  checkedProgress: number;
  overallProgress: number;
  /** % of assigned templates marked ready for control (phase-scoped when applicable) */
  controlProgress?: number;
  canManageProject: boolean;
  canArchiveProject: boolean;
  canDeleteProject: boolean;
  canUpdateProject: boolean;
  canAssignWorkers: boolean;
  canDownloadProject: boolean;
  onBackToDashboard: () => void;
  onDownloadProject: () => Promise<void>;
  onArchiveProject: () => Promise<void>;
  onProjectDeleted: () => void;
  onProjectUpdated: () => void;
  /** When phases are loaded, hold can be toggled from the ⋯ menu */
  hold?: ProjectHoldState;
  onSetHold?: (input: { is_on_hold: boolean; note?: string }) => Promise<void>;
  showPhaseHoldControls?: boolean;
}

export function ProjectOverview({
  project,
  currentUser: _currentUser,
  loadingAction,
  checkedProgress,
  overallProgress,
  controlProgress = 0,
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
  hold,
  onSetHold,
  showPhaseHoldControls,
}: ProjectOverviewProps) {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [holdSubmitting, setHoldSubmitting] = useState(false);

  if (!project) {
    return null;
  }

  const canUseHold =
    !!showPhaseHoldControls &&
    !!hold &&
    !!onSetHold &&
    canManageProject;

  const confirmPutOnHold = async () => {
    if (!onSetHold) return;
    setHoldSubmitting(true);
    try {
      await onSetHold({
        is_on_hold: true,
        note: holdNote.trim() || undefined,
      });
      setHoldDialogOpen(false);
      setHoldNote("");
    } finally {
      setHoldSubmitting(false);
    }
  };

  return (
    <div className="bg-muted p-6 rounded-lg w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold mb-2 break-words">{project.name}</h1>
          {(() => {
            const leaderId = project.leader_id || project.leader?.id;
            const leaderUser: UserLike | null = leaderId
              ? {
                  id: leaderId,
                  name:
                    project.leader?.name ||
                    project.leaderName ||
                    project.leader?.email ||
                    "",
                  email: project.leader?.email,
                }
              : null;
            const workerIds = project.workers || [];
            const workerNames = project.workers_names || [];
            const workers: UserLike[] = [];
            for (let i = 0; i < workerIds.length; i++) {
              const wid = workerIds[i];
              if (!wid || wid === leaderId) continue;
              workers.push({
                id: wid,
                name: workerNames[i] || "",
              });
            }
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Project Leader:</span>
                  {leaderUser ? (
                    <>
                      <UserAvatar user={leaderUser} size="sm" />
                      <span className="text-sm font-medium text-gray-800">
                        {leaderUser.name || leaderUser.email}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-600">Team:</span>
                  <UserAvatarStack
                    users={workers}
                    size="sm"
                    max={8}
                    emptyLabel="No team members"
                  />
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex gap-2 justify-end shrink-0">
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
                <Button variant="outline" size="icon" aria-label="Project actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {canAssignWorkers && (
                  <ProjectWorkersDialog
                    projectId={Number(project.id)}
                    currentWorkers={project?.workers || []}
                    onWorkersUpdated={onProjectUpdated}
                    leaderId={project?.leader_id}
                  />
                )}

                {canUseHold && !hold.is_on_hold && (
                  <DropdownMenuItem
                    className="text-[#1ABE6C] focus:text-[#1ABE6C] cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setHoldDialogOpen(true)}
                  >
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Put project on hold
                  </DropdownMenuItem>
                )}

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

                {canUpdateProject && (
                  <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Project
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {canArchiveProject && (
                  <DropdownMenuItem
                    onClick={onArchiveProject}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Project
                  </DropdownMenuItem>
                )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Variables Progress</h2>
          <Progress value={overallProgress} className="mb-2" />
          <p className="text-gray-600 text-sm">{overallProgress}% Complete</p>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Supervisor Checks</h2>
          <Progress value={checkedProgress} className="mb-2" />
          <p className="text-gray-600 text-sm">{checkedProgress}% Checked</p>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Control Progress</h2>
          <Progress value={controlProgress} className="mb-2" />
          <p className="text-gray-600 text-sm">{controlProgress}% Complete</p>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Deadline</h2>
          <p className={`text-lg ${getDeadlineColor(project.deadline)}`}>
            {formatDate(project.deadline)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {(() => {
              const now = new Date();
              const deadline = new Date(project.deadline);
              const diffTime = deadline.getTime() - now.getTime();
              const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (totalDays < 0) {
                const absDays = Math.abs(totalDays);
                const weeks = Math.floor(absDays / 7);
                const days = absDays % 7;

                if (weeks === 0) {
                  return `${days} ${days === 1 ? "day" : "days"} overdue`;
                }
                if (days === 0) {
                  return `${weeks} ${weeks === 1 ? "week" : "weeks"} overdue`;
                }
                return `${weeks} ${weeks === 1 ? "week" : "weeks"} and ${days} ${
                  days === 1 ? "day" : "days"
                } overdue`;
              }
              if (totalDays === 0) {
                return "Due today";
              }
              const weeks = Math.floor(totalDays / 7);
              const days = totalDays % 7;

              if (weeks === 0) {
                return `${days} ${days === 1 ? "day" : "days"} left`;
              }
              if (days === 0) {
                return `${weeks} ${weeks === 1 ? "week" : "weeks"} left`;
              }
              return `${weeks} ${weeks === 1 ? "week" : "weeks"} and ${days} ${
                days === 1 ? "day" : "days"
              } left`;
            })()}
          </p>
        </Card>
      </div>

      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Put project on hold</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Work can continue, but the project is flagged as paused for everyone.
          </p>
          <Textarea
            value={holdNote}
            onChange={(e) => setHoldNote(e.target.value)}
            placeholder="Note (optional) — e.g. waiting on client approval"
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setHoldDialogOpen(false);
                setHoldNote("");
              }}
              disabled={holdSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#1ABE6C] hover:bg-[#159e5b] text-white"
              onClick={confirmPutOnHold}
              disabled={holdSubmitting}
            >
              {holdSubmitting ? "Saving…" : "Confirm hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showUpdateDialog && (
        <UpdateProjectForm
          project={project}
          onProjectUpdated={onProjectUpdated}
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
        />
      )}

      {showDeleteDialog && (
        <DeleteProject project={project} onDeleted={onProjectDeleted} />
      )}
    </div>
  );
}
