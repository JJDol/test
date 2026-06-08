"use client";

/**
 * DocumentActionsMenu - Shared "..." action menu for document templates.
 *
 * Used by both the card view (DocumentTemplateCard) and the list view
 * (DocumentListView) so the two surfaces stay in lock-step.
 *
 * Encapsulates:
 *   - 6 menu items: Generate / Upgrade / Reupload / Reset / Assign / Remove
 *   - Confirmation dialogs (Remove, Reset)
 *   - Reupload dialog (ProjectTemplateReuploadDialog)
 *   - Document assignment dialog (DocumentAssignDialog)
 *
 * Visibility rules mirror the original card-view implementation
 * (`document-template-card.tsx`).
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentAssignDialog } from "@/components/ui/document-assign-dialog";
import { ProjectTemplateReuploadDialog } from "./project-template-reupload-dialog";
import { useToast } from "@/components/ui/toast";
import {
  ArrowUpCircle,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { DocumentCategory, DocumentTemplate, Project } from "@/lib/types/types";
import { cn } from "@/lib/utils";

export interface DocumentActionsMenuProps {
  template: DocumentTemplate;
  project: Project;
  isLocked?: boolean;
  canManageProject: boolean;
  canAssignDocuments: boolean;
  onGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  onTemplateRemove: (templateName: string, category: DocumentCategory) => Promise<void>;
  onAssignmentUpdate?: (
    templateName: string,
    assignments: {
      assignee_id?: string;
      assignee_name?: string;
      supervisor_id?: string;
      supervisor_name?: string;
    }
  ) => Promise<void>;
  onUpgradeVersion?: (templateName: string) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
  /** Tailwind class for the trigger button (used to size for list vs card views). */
  triggerClassName?: string;
  /** Icon size class within the trigger. */
  iconClassName?: string;
}

export function DocumentActionsMenu({
  template,
  project,
  isLocked = false,
  canManageProject,
  canAssignDocuments,
  onGenerateDocument,
  onTemplateRemove,
  onAssignmentUpdate,
  onUpgradeVersion,
  onRefresh,
  triggerClassName,
  iconClassName,
}: DocumentActionsMenuProps) {
  const { toast } = useToast();
  const t = useTranslations("projectDetails");
  const tc = useTranslations("common");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReuploadDialog, setShowReuploadDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const lockedVersion = project.template_version_locks?.[template.name] || 1;
  const latestVersion = template.current_version || 1;
  const hasNewerVersion = latestVersion > lockedVersion;
  const hasCustomTemplate = !!project.custom_templates?.[template.name];
  const currentAssignments = project.document_assignments?.[template.name];

  const handleResetToOriginal = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/reset-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName: template.name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset template");
      }

      toast({
        title: "Success",
        description: "Template reset to original",
      });

      setShowResetConfirm(false);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Error resetting template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset template",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", triggerClassName)}
            aria-label={`Actions for ${template.name}`}
          >
            <MoreHorizontal className={cn("h-4 w-4", iconClassName)} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!project.is_archived && (
            <DropdownMenuItem
              onClick={() => onGenerateDocument(template.name, template.category)}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t("generateDocument")}
            </DropdownMenuItem>
          )}
          {!project.is_archived && !isLocked && hasNewerVersion && onUpgradeVersion && (
            <DropdownMenuItem
              onClick={() => onUpgradeVersion(template.name)}
              className="text-amber-600"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              {t("upgradeTemplate")} v{latestVersion}
            </DropdownMenuItem>
          )}
          {!project.is_archived && !isLocked && canManageProject && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowReuploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t("reuploadTemplate")}
              </DropdownMenuItem>
              {hasCustomTemplate && (
                <DropdownMenuItem
                  onClick={() => setShowResetConfirm(true)}
                  className="text-blue-600"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Original
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          {!isLocked && canAssignDocuments && onAssignmentUpdate && (
            <DocumentAssignDialog
              projectId={Number(project.id)}
              templateName={template.name}
              category={template.category}
              onAssignmentUpdate={onAssignmentUpdate}
              currentAssignments={currentAssignments}
            />
          )}
          {!isLocked && canManageProject && (
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("removeDocument")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc("confirmDeletion")}</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{template.name}</strong> from this project.
              The template itself will not be deleted and can be added back later.
              Any filled variables for this template will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onTemplateRemove(template.name, template.category)}
              className="bg-red-600 hover:bg-red-700"
            >
              {tc("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Original confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to original template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the customized version of <strong>{template.name}</strong> and
              revert to the original global template.
              Your variable values will be preserved, but the template structure will change
              back to the original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetToOriginal}
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset to Original"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reupload */}
      <ProjectTemplateReuploadDialog
        open={showReuploadDialog}
        onOpenChange={setShowReuploadDialog}
        template={template}
        projectId={project.id}
        onReuploadComplete={async () => {
          if (onRefresh) {
            await onRefresh();
          }
        }}
      />
    </>
  );
}
