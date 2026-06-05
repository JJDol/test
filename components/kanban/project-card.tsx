/**
 * 🏢 Project Card - Reusable Project Display Component for Kanban
 * 
 * PURPOSE: Individual project card with drag-and-drop support
 * - Project information display
 * - Progress indicator
 * - Archive status
 * - Drag handle integration
 * - Reusable across different kanban views
 */

// TODO: We are using progress bar in multiple places, consider if we can use the same component

"use client";

import { useTranslations } from "next-intl";
import Link from 'next/link';
import { Project } from '@/lib/types/types';

interface ProjectCardProps {
  project: Project;
  provided?: any; // Drag-and-drop provided props
  isDragDisabled?: boolean;
  className?: string;
  isLoading?: boolean; // Loading state for pulsing animation
}

export function ProjectCard({ 
  project, 
  provided,
  isDragDisabled = false,
  className = "",
  isLoading = false
}: ProjectCardProps) {
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");

  const cardClasses = `bg-white p-4 rounded-md shadow mb-2 cursor-pointer w-full ${
    project.is_archived ? 'bg-white/5 border border-gray-500' : ''
  } ${className}`;

  // Loading skeleton with pulsing animation
  if (isLoading) {
    const skeletonContent = (
      <div className={`${cardClasses} animate-pulse`}>
        <div className="space-y-3">
          {/* Project name skeleton */}
          <div className="h-5 bg-gray-300 rounded w-3/4"></div>
          
          {/* Location skeleton */}
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          
          {/* Leader skeleton */}
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          
          {/* Deadline skeleton */}
          <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          
          {/* Progress bar skeleton */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 rounded w-1/4"></div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="h-1.5 bg-gray-300 rounded-full w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );

    // If drag-and-drop is provided, wrap with drag props
    if (provided) {
      return (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {skeletonContent}
        </div>
      );
    }

    // Otherwise, just return the skeleton
    return skeletonContent;
  }

  const content = (
    <div className={cardClasses}>
      <h3 className="font-medium text-black">{project.name}</h3>
      <p className="text-sm text-gray-600">
        {tc("location")}: {project.location || tc("notSpecified")}
      </p>
      <p className="text-sm text-gray-600">
        {td("projectLeader")}: {project.leader?.name || project.leader?.email || tc("unassigned")}
      </p>
      {/* Issue 15 (D3 옵션 B): show current phase deadline. */}
      <p className="text-sm text-gray-600">
        {tc("deadline")}:{" "}
        {project.current_phase_deadline
          ? new Date(project.current_phase_deadline).toLocaleDateString()
          : "—"}
      </p>
      
      {/* Progress Bar */}
      <div className="mt-2">
        <div className="text-xs text-gray-500">
          {tc("progress")}: {project.progress}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${project.progress}%`,
              backgroundColor: project.progress === 100 ? 'green' : 
                              project.progress >= 50 ? 'yellow' : 'red'
            }}
          />
        </div>
      </div>
      
      {/* Archive Status */}
      {project.is_archived && (
        <div className="mt-2">
          <span className="text-sm text-gray-500 bg-gray-200/10 px-2 py-1 rounded">
            {tc("archived")}
          </span>
        </div>
      )}
    </div>
  );

  // If drag-and-drop is provided, wrap with drag props
  if (provided) {
    return (
      <Link href={`/protected/dashboard/project/${project.id}`} passHref>
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {content}
        </div>
      </Link>
    );
  }

  // Otherwise, just return the linked content
  return (
    <Link href={`/protected/dashboard/project/${project.id}`} passHref>
      {content}
    </Link>
  );
}
