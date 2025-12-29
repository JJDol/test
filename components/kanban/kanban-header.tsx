/**
 * 🏢 Kanban Header - Reusable Kanban Board Header Component
 * 
 * PURPOSE: Standardized header for kanban board
 * - Title and project statistics
 * - Archive toggle for admins
 * - Action buttons and controls
 * - Reusable across different kanban views
 */

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
  title = "Projects Kanban Board",
  projectStats,
  showArchived,
  onToggleArchived,
  isAdmin,
  isCompanyAdmin,
  className = ""
}: KanbanHeaderProps) {
  return (
    <div className={`flex justify-between items-center mb-6 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>Total: <span className="font-medium">{projectStats.total}</span></span>
          {Object.entries(projectStats.byStage).map(([stage, count]) => (
            <span key={stage}>
              {stage.replace('_', ' ')}: <span className="font-medium">{count}</span>
            </span>
          ))}
          {projectStats.archived > 0 && (
            <span>Archived: <span className="font-medium">{projectStats.archived}</span></span>
          )}
        </div>
      </div>
      
      {(isAdmin || isCompanyAdmin) && (
        <Button
          variant="outline"
          onClick={onToggleArchived}
        >
          {showArchived ? "Hide Archived" : "Show Archived"}
        </Button>
      )}
    </div>
  );
}
