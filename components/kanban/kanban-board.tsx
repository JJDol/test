/**
 * 🏢 Kanban Board - Reusable Kanban Board Layout Component
 * 
 * PURPOSE: Main kanban board with drag-and-drop functionality
 * - Drag-and-drop context
 * - Multiple kanban columns
 * - Stage management
 * - Project organization
 * - Reusable across different project views
 */

"use client";

import { useTranslations } from "next-intl";
import { DragDropContext } from '@hello-pangea/dnd';
import { Project, ProjectStage } from '@/lib/types/types';
import { KanbanColumn } from './kanban-column';

interface KanbanBoardProps {
  projects: Project[];
  onDragEnd: (result: any) => Promise<void>;
  isUpdating?: boolean;
  isLoading?: boolean; // Loading state for project cards
  className?: string;
}

export function KanbanBoard({ 
  projects, 
  onDragEnd, 
  isUpdating = false,
  isLoading = false,
  className = "" 
}: KanbanBoardProps) {
  const t = useTranslations("kanban");

  const stages = [
    { id: ProjectStage.TODO, title: t("toDo") },
    { id: ProjectStage.IN_PROGRESS, title: t("inProgress") },
    { id: ProjectStage.REVIEW, title: t("review") },
    { id: ProjectStage.DONE, title: t("done") },
  ];

  return (
    <div className={className}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4 w-full">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              projects={projects}
              isLoading={isLoading}
            />
          ))}
        </div>
      </DragDropContext>
      
      {/* Optional loading overlay for updates */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black/10 pointer-events-none z-10 flex items-center justify-center">
          <div className="bg-background p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">{t("updatingProject")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
