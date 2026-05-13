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

  // ✅ D9: 모든 active phase 표시 + 0개 phase는 disabled + "0 documents" 라벨
  // (이전 동작: documents.length > 0인 phase만 표시 → 빈 phase가 보이지 않아 사용자 혼란)
  const sortedPhases = useMemo(
    () =>
      [...phases].sort(
        (a, b) =>
          (a.definition?.display_order ?? 0) - (b.definition?.display_order ?? 0)
      ),
    [phases]
  );

  const selectablePhases = useMemo(
    () => sortedPhases.filter((p) => (p.documents?.length ?? 0) > 0),
    [sortedPhases]
  );

  const allSelected =
    selectablePhases.length > 0 &&
    selectedPhaseIds.size === selectablePhases.length;

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
      setSelectedPhaseIds(new Set(selectablePhases.map((p) => p.id)));
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

        {sortedPhases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No active phases found.
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto py-2">
            {/* Select All — 선택 가능한 phase만 대상 (0 docs phase는 제외) */}
            <label
              className={`flex items-center gap-3 px-2 py-1.5 rounded-md border-b pb-3 ${
                selectablePhases.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-muted cursor-pointer"
              }`}
            >
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleToggleAll}
                disabled={loading || selectablePhases.length === 0}
              />
              <span className="text-sm font-medium">Select All</span>
            </label>

            {sortedPhases.map((phase) => {
              const docCount = phase.documents?.length ?? 0;
              const isEmpty = docCount === 0;
              return (
                <label
                  key={phase.id}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-md ${
                    isEmpty
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-muted cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={selectedPhaseIds.has(phase.id)}
                    onCheckedChange={() => handleTogglePhase(phase.id)}
                    disabled={loading || isEmpty}
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
