/**
 * 🏢 TemplateDeleteDialog - Enterprise Template Delete Confirmation Dialog
 * 
 * PURPOSE: Modal dialog for confirming template deletion
 * - Professional confirmation dialog
 * - Clear warning about irreversible action
 * - Loading state during deletion
 */

"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { DocumentTemplate } from "@/lib/types/types";

interface DocumentTemplateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateToDelete: DocumentTemplate | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function DocumentTemplateDeleteDialog({
  open,
  onOpenChange,
  templateToDelete,
  onConfirm,
  onCancel,
  loading,
}: DocumentTemplateDeleteDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the template "{templateToDelete?.name}"?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

