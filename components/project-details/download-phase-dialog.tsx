"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import type { ProjectPhaseFull } from "@/lib/phases/types";

interface DownloadPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: ProjectPhaseFull[];
  onDownload: (phaseIds: string[]) => Promise<void>;
  loading?: boolean;
}

export function DownloadPhaseDialog({
  open,
  onOpenChange,
  phases,
  onDownload,
  loading = false,
}: DownloadPhaseDialogProps) {
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<Set<string>>(new Set());

  const activePhases = useMemo(
    () => phases.filter((p) => p.documents && p.documents.length > 0),
    [phases]
  );

  const allSelected =
    activePhases.length > 0 && selectedPhaseIds.size === activePhases.length;

  const handleTogglePhase = (phaseId: string) => {
    setSelectedPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedPhaseIds(new Set());
    } else {
      setSelectedPhaseIds(new Set(activePhases.map((p) => p.id)));
    }
  };

  const handleDownload = async () => {
    if (selectedPhaseIds.size === 0) return;
    await onDownload(Array.from(selectedPhaseIds));
    onOpenChange(false);
    setSelectedPhaseIds(new Set());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedPhaseIds(new Set());
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Project Documents</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Select phases to include in the download.
        </p>

        {activePhases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No phases with documents found.
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto py-2">
            {/* Select All */}
            <label className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer border-b pb-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleToggleAll}
                disabled={loading}
              />
              <span className="text-sm font-medium">Select All</span>
            </label>

            {activePhases.map((phase) => {
              const docCount = phase.documents?.length ?? 0;
              return (
                <label
                  key={phase.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPhaseIds.has(phase.id)}
                    onCheckedChange={() => handleTogglePhase(phase.id)}
                    disabled={loading}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">
                      {phase.definition.short_label} — {phase.definition.name}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {docCount} {docCount === 1 ? "document" : "documents"}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loading || selectedPhaseIds.size === 0}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {loading ? "Downloading…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
