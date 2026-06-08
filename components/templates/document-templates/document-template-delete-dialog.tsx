/**
 * Document Template Delete Dialog
 *
 * PURPOSE: Modal dialog for confirming template deletion
 * - Shows which projects are using the template
 * - Offers Archive (safe) and Delete Permanently options
 * - Clear warnings about consequences
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DocumentTemplate, TemplateUsageInfo } from "@/lib/types/types";
import {
  AlertTriangle,
  Archive,
  Trash2,
  Loader2,
  FolderOpen,
  CheckCircle,
} from "lucide-react";

interface DocumentTemplateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateToDelete: DocumentTemplate | null;
  onConfirm: () => Promise<void>;
  onArchive: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function DocumentTemplateDeleteDialog({
  open,
  onOpenChange,
  templateToDelete,
  onConfirm,
  onArchive,
  onCancel,
  loading,
}: DocumentTemplateDeleteDialogProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const [usageInfo, setUsageInfo] = useState<TemplateUsageInfo | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [action, setAction] = useState<"archive" | "delete" | null>(null);

  // Fetch usage info when dialog opens
  useEffect(() => {
    if (open && templateToDelete) {
      fetchUsageInfo();
    } else {
      // Reset state when dialog closes
      setUsageInfo(null);
      setAction(null);
    }
  }, [open, templateToDelete]);

  const fetchUsageInfo = async () => {
    if (!templateToDelete) return;

    setLoadingUsage(true);
    try {
      const response = await fetch(
        `/api/document-templates/${encodeURIComponent(templateToDelete.name)}/usage`
      );
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
      }
    } catch (error) {
      console.error("Error fetching template usage:", error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleArchive = async () => {
    setAction("archive");
    await onArchive();
  };

  const handleDelete = async () => {
    setAction("delete");
    await onConfirm();
  };

  const isInUse = usageInfo && usageInfo.projectCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {t("deleteTemplate")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteTemplateConfirm")} "{templateToDelete?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Loading state */}
          {loadingUsage && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Checking template usage...
              </span>
            </div>
          )}

          {/* Usage warning */}
          {!loadingUsage && isInUse && (
            <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-2">
                  This template is used in {usageInfo.projectCount} project
                  {usageInfo.projectCount > 1 ? "s" : ""}:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {usageInfo.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <FolderOpen className="h-3 w-3" />
                      <span>{project.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {project.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* No usage - safe to delete */}
          {!loadingUsage && !isInUse && usageInfo && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                This template is not used in any projects. Safe to delete.
              </AlertDescription>
            </Alert>
          )}

          {/* Options */}
          {!loadingUsage && (
            <div className="space-y-3">
              {/* Archive option */}
              <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">Archive (Recommended)</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hide the template from the list but keep all data.
                      {isInUse && " Projects can continue using it."}
                      {" "}You can restore it later.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleArchive}
                      disabled={loading}
                    >
                      {loading && action === "archive" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Delete permanently option */}
              <div className="border border-red-200 rounded-lg p-4 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-700 dark:text-red-400">
                      Delete Permanently
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete the template and its file.
                      {isInUse && (
                        <span className="text-red-600 font-medium">
                          {" "}This will remove it from {usageInfo?.projectCount} project
                          {usageInfo && usageInfo.projectCount > 1 ? "s" : ""} and
                          delete all variable data.
                        </span>
                      )}
                      {" "}This cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading && action === "delete" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {tc("deletingEllipsis")}
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {tc("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
