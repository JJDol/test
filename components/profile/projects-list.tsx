"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import Link from "next/link";
import type { Project } from "@/hooks/use-profile";

interface ProjectsListProps {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
}

export function ProjectsList({ 
  projects, 
  isLoading, 
  error,
  title = "My Projects",
  description = "Projects assigned to you",
  emptyMessage = "No projects assigned to you yet.",
  className = ""
}: ProjectsListProps & {
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState 
            variant="inline" 
            message="Loading your assigned projects..." 
            size="sm"
          />
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-destructive">{error}</p>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">{project.name}</h3>
        <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
          {project.status}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mb-4">
        <p>Location: {project.location}</p>
        <p>Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/protected/dashboard/project/${project.id}`}>
          View Project
        </Link>
      </Button>
    </div>
  );
}
