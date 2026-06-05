"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Download, Archive, Loader2, MoreHorizontal, Edit, Trash2, PauseCircle } from "lucide-react";
import { UserAvatar, UserAvatarStack } from "@/components/ui/user-avatar";
import { formatDate, getDeadlineColor } from "@/utils/project-utils";
import { User, Project } from "@/lib/types/types";
import { DownloadPhaseDialog } from "./download-phase-dialog";
import type { ProjectPhaseFull } from "@/lib/phases/types";

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
  controlProgress?: number;
  canManageProject: boolean;
  canArchiveProject: boolean;
  canDeleteProject: boolean;
  canUpdateProject: boolean;
  canAssignWorkers: boolean;
  canDownloadProject: boolean;
  phases: ProjectPhaseFull[];
  activePhase?: ProjectPhaseFull | null;
  onBackToDashboard: () => void;
  onDownloadProject: (phaseIds?: string[]) => Promise<void>;
  onArchiveProject: () => Promise<void>;
  onProjectDeleted: () => void;
  onProjectUpdated: () => Promise<void>;
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
  phases,
  activePhase,
  onBackToDashboard: _onBackToDashboard,
  onDownloadProject,
  onArchiveProject,
  onProjectDeleted,
  onProjectUpdated,
  hold,
  onSetHold,
  showPhaseHoldControls,
}: ProjectOverviewProps) {
  const t = useTranslations("projectDetails");
  const tc = useTranslations("common");
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [holdSubmitting, setHoldSubmitting] = useState(false);

  if (!project) {
    return null;
  }

  const canUseHold = !!showPhaseHoldControls && !!hold && !!onSetHold && canManageProject;

  const confirmPutOnHold = async () => {
    if (!onSetHold) return;
    setHoldSubmitting(true);
    try {
      await onSetHold({ is_on_hold: true, note: holdNote.trim() || undefined });
      setHoldDialogOpen(false);
      setHoldNote("");
    } finally {
      setHoldSubmitting(false);
    }
  };

  const currentPhaseDeadline = activePhase?.deadline ?? null;

  const phaseDeadlineRelativeText = (() => {
    if (!currentPhaseDeadline) return null;
    const now = new Date();
    const deadline = new Date(currentPhaseDeadline);
    const diffTime = deadline.getTime() - now.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (totalDays < 0) {
      const absDays = Math.abs(totalDays);
      const weeks = Math.floor(absDays / 7);
      const days = absDays % 7;
      if (weeks === 0) return `${days} ${days === 1 ? t("day") : t("days")} ${t("overdue")}`;
      if (days === 0) return `${weeks} ${weeks === 1 ? t("week") : t("weeks")} ${t("overdue")}`;
      return `${weeks}w ${days}d ${t("overdue")}`;
    }
    if (totalDays === 0) return t("dueToday");
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    if (weeks === 0) return `${days} ${days === 1 ? t("day") : t("days")} ${t("left")}`;
    if (days === 0) return `${weeks} ${weeks === 1 ? t("week") : t("weeks")} ${t("left")}`;
    return `${weeks}w ${days}d ${t("left")}`;
  })();

  return (
    <div className="bg-muted p-4 rounded-lg w-full h-fit sticky top-4">
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
              <DropdownMenuLabel>{tc("options")}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {canAssignWorkers && (
                <ProjectWorkersDialog
                  projectId={Number(project.id)}
                  currentWorkers={project?.workers || []}
                  onWorkersUpdated={onProjectUpdated}
                  leaderId={project?.leader_id}
                />
              )}

              {canDownloadProject && (
                <DropdownMenuItem
                  onClick={() => setShowDownloadDialog(true)}
                  disabled={loadingAction !== "none"}
                >
                  {loadingAction === "download" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t("downloadProject")}
                </DropdownMenuItem>
              )}

              {canUpdateProject && (
                <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t("editProject")}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {canUseHold && !hold!.is_on_hold && (
                <DropdownMenuItem
                  className="text-[#1ABE6C] focus:text-[#1ABE6C] cursor-pointer"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setHoldDialogOpen(true)}
                >
                  <PauseCircle className="mr-2 h-4 w-4" />
                  {t("putOnHold")}
                </DropdownMenuItem>
              )}

              {canArchiveProject && (
                <DropdownMenuItem
                  onClick={onArchiveProject}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {t("archiveProject")}
                </DropdownMenuItem>
              )}

              {canDeleteProject && (
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("deleteProject")}
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
            {project.leaderName ? (
              <div className="mt-1">
                <div className="group relative inline-block transition-transform duration-150 ease-out hover:scale-110">
                  <UserAvatar
                    user={{ id: project.leader_id, name: project.leaderName }}
                    size="sm"
                    noTitle
                  />
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 bottom-full z-40 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground opacity-0 shadow-md transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
                  >
                    <div className="text-xs font-medium">{project.leaderName}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">{tc("unassigned")}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">{t("workers")}</p>
            {project.workers && project.workers.length > 0 ? (
              <div className="mt-1">
                <UserAvatarStack
                  users={project.workers.map((id, idx) => ({
                    id,
                    name: project.workers_names?.[idx] || null,
                  }))}
                  size="sm"
                  emptyLabel={t("noWorkersAssigned")}
                />
              </div>
            ) : (
              <p className="text-gray-700">{t("noWorkersAssigned")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Vertical Stack */}
      <div className="space-y-3">
        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">{t("variablesProgress")}</h2>
          <Progress value={overallProgress} className="mb-1 h-2" />
          <p className="text-xs text-gray-600">{t("percentComplete", { value: overallProgress })}</p>
        </Card>

        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">{t("supervisorChecks")}</h2>
          <Progress value={checkedProgress} className="mb-1 h-2" />
          <p className="text-xs text-gray-600">{t("percentChecked", { value: checkedProgress })}</p>
        </Card>

        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">{t("controlProgress")}</h2>
          <Progress value={controlProgress} className="mb-1 h-2" />
          <p className="text-xs text-gray-600">{t("percentComplete", { value: controlProgress })}</p>
        </Card>

        <Card className="p-3">
          <h2 className="text-sm font-semibold mb-1">{t("phaseDeadline")}</h2>
          <p
            className={`text-sm font-medium ${
              currentPhaseDeadline
                ? getDeadlineColor(currentPhaseDeadline)
                : "text-gray-500"
            }`}
          >
            {currentPhaseDeadline ? formatDate(currentPhaseDeadline) : "—"}
          </p>
          {phaseDeadlineRelativeText && (
            <p className="text-xs text-gray-500 mt-0.5">{phaseDeadlineRelativeText}</p>
          )}
        </Card>
      </div>

      {/* Hold Dialog */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("putProjectOnHold")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("holdDescription")}
          </p>
          <Textarea
            value={holdNote}
            onChange={(e) => setHoldNote(e.target.value)}
            placeholder={t("holdNotePlaceholder")}
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setHoldDialogOpen(false); setHoldNote(""); }}
              disabled={holdSubmitting}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmPutOnHold}
              disabled={holdSubmitting}
            >
              {holdSubmitting ? `${tc("loading")}…` : t("confirmHold")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      {showUpdateDialog && (
        <UpdateProjectForm
          project={project}
          onProjectUpdated={onProjectUpdated}
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
        />
      )}

      <DeleteProject
        project={project}
        onDeleted={onProjectDeleted}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />

      <DownloadPhaseDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        phases={phases}
        onDownload={onDownloadProject}
        loading={loadingAction === "download"}
      />
    </div>
  );
}

