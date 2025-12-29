/**
 * 🏢 ProjectTemplateDeleteDialog - Enterprise Project Template Delete Dialog
 * 
 * PURPOSE: Modal dialog for confirming project template deletion
 * - Professional confirmation dialog
 * - Clear warning about irreversible action
 * - Loading state during deletion
 */

"use client";

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
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the project template "{projectTemplateToDelete?.name}"?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading || isDeletingProjectTemplate}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || isDeletingProjectTemplate}
          >
            {isDeletingProjectTemplate || loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

