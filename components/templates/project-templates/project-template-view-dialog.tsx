/**
 * 🏢 ProjectTemplateViewDialog - Enterprise Project Template View Dialog
 * 
 * PURPOSE: Modal dialog for viewing project template details
 * - Displays project template information
 * - Shows included document templates
 * - Read-only professional presentation
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectTemplate, DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";

interface ProjectTemplateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewProjectTemplate: ProjectTemplate | null;
  onClose: () => void;
}

export function ProjectTemplateViewDialog({
  open,
  onOpenChange,
  viewProjectTemplate,
  onClose,
}: ProjectTemplateViewDialogProps) {
  const tc = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Template: {viewProjectTemplate?.name}</DialogTitle>
          <DialogDescription>
            Category: {viewProjectTemplate ? getCategoryDisplayName(viewProjectTemplate.category as DocumentCategory) : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[420px] overflow-y-auto">
          {viewProjectTemplate?.templates?.length ? (
            viewProjectTemplate.templates.map((t) => (
              <div key={t} className="p-2 border rounded-md bg-muted/20 text-sm">
                {t}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No document templates included.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

