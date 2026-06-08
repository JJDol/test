"use client";

import { useTranslations } from "next-intl";
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
  className = ""
}: ProjectsListProps & {
  className?: string;
}) {
  const t = useTranslations("profile");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("myProjects")}</CardTitle>
        <CardDescription>{t("projectsAssigned")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState 
            variant="inline" 
            message={t("loadingProjects")}
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
            <p className="text-muted-foreground">{t("noProjectsAssigned")}</p>
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
  const t = useTranslations("profile");
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">{project.name}</h3>
        <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
          {project.status}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mb-4">
        <p>{t("location")}: {project.location}</p>
        <p>
          {t("startDate")}:{" "}
          {project.start_date
            ? new Date(project.start_date).toLocaleDateString()
            : "—"}
        </p>
        <p>
          {t("phaseDeadline")}:{" "}
          {project.current_phase_deadline
            ? new Date(project.current_phase_deadline).toLocaleDateString()
            : "—"}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/protected/dashboard/project/${project.id}`}>
          {t("viewProject")}
        </Link>
      </Button>
    </div>
  );
}
