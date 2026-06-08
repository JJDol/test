/**
 * 🏢 Kanban Header - Reusable Kanban Board Header Component
 * 
 * PURPOSE: Standardized header for kanban board
 * - Title and project statistics
 * - Archive toggle for admins
 * - Action buttons and controls
 * - Reusable across different kanban views
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from '@/components/ui/button';

interface KanbanHeaderProps {
  title?: string;
  projectStats: {
    total: number;
    byStage: Record<string, number>;
    archived: number;
  };
  showArchived: boolean;
  onToggleArchived: () => void;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  className?: string;
}

export function KanbanHeader({
  title,
  projectStats,
  showArchived,
  onToggleArchived,
  isAdmin,
  isCompanyAdmin,
  className = ""
}: KanbanHeaderProps) {
  const t = useTranslations("kanban");
  const tc = useTranslations("common");

  return (
    <div className={`flex justify-between items-center mb-6 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold">{title ?? t("title")}</h1>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>{t("total")}: <span className="font-medium">{projectStats.total}</span></span>
          {Object.entries(projectStats.byStage).map(([stage, count]) => {
            const stageLabels: Record<string, string> = {
              'TODO': t("toDo"),
              'IN_PROGRESS': t("inProgress"),
              'REVIEW': t("review"),
              'COMPLETED': t("done"),
            };
            return (
              <span key={stage}>
                {stageLabels[stage] ?? stage.replace('_', ' ')}: <span className="font-medium">{count}</span>
              </span>
            );
          })}
          {projectStats.archived > 0 && (
            <span>{t("archivedCount")}: <span className="font-medium">{projectStats.archived}</span></span>
          )}
        </div>
      </div>
      
      {(isAdmin || isCompanyAdmin) && (
        <Button
          variant="outline"
          onClick={onToggleArchived}
        >
          {showArchived ? t("hideArchived") : t("showArchived")}
        </Button>
      )}
    </div>
  );
}
