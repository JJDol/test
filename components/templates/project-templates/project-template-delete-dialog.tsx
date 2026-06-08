/**
 * 🏢 ProjectTemplateDeleteDialog - Enterprise Project Template Delete Dialog
 * 
 * PURPOSE: Modal dialog for confirming project template deletion
 * - Professional confirmation dialog
 * - Clear warning about irreversible action
 * - Loading state during deletion
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ProjectTemplate } from "@/lib/types/types";

interface ProjectTemplateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTemplateToDelete: ProjectTemplate | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  isDeletingProjectTemplate: boolean;
}

export function ProjectTemplateDeleteDialog({
  open,
  onOpenChange,
  projectTemplateToDelete,
  onConfirm,
  onCancel,
  loading,
  isDeletingProjectTemplate,
}: ProjectTemplateDeleteDialogProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog 
      key={projectTemplateToDelete ? `delete-${projectTemplateToDelete.name}-${Date.now()}` : 'delete-dialog'}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tc("confirmDeletion")}</DialogTitle>
          <DialogDescription>
            {t("deleteTemplateConfirm")} "{projectTemplateToDelete?.name}"
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading || isDeletingProjectTemplate}
            >
              {tc("cancel")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || isDeletingProjectTemplate}
          >
            {isDeletingProjectTemplate || loading ? tc('deletingEllipsis') : tc('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

