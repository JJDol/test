/**
 * 🏢 Kanban Column - Reusable Kanban Stage Column Component
 * 
 * PURPOSE: Individual kanban column with drag-and-drop support
 * - Stage header with project count
 * - Droppable area for projects
 * - Scrollable project list
 * - Sorted by deadline
 * - Reusable across different kanban layouts
 */

import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Project, ProjectStage } from '@/lib/types/types';
import { ProjectCard } from './project-card';

interface KanbanColumnProps {
  stage: {
    id: ProjectStage;
    title: string;
  };
  projects: Project[];
  className?: string;
  isLoading?: boolean; // Loading state for project cards
}

export function KanbanColumn({ stage, projects, className = "", isLoading = false }: KanbanColumnProps) {
  // Sort projects by deadline
  // TODO: Consider if we need to sort by other criteria or person can  manually order the projects
  const sortedProjects = projects
    .filter(project => project.stage === stage.id)
    .sort((a, b) => {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  return (
    <div className={`bg-gray-100 rounded-lg p-4 text-white flex flex-col w-full ${className}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="font-semibold text-black">{stage.title}</h2>
        <Badge variant="secondary" className="text-xs">
          {sortedProjects.length} projects
        </Badge>
      </div>
      
      {/* Droppable Area */}
      <Droppable droppableId={stage.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="h-[900px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 w-full"
          >
            {sortedProjects.map((project, index) => (
              <Draggable
                key={project.id}
                draggableId={project.id.toString()}
                index={index}
                isDragDisabled={project.is_archived}
              >
                {(provided) => (
                  <ProjectCard
                    project={project}
                    provided={provided}
                    isDragDisabled={project.is_archived}
                    isLoading={isLoading}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
