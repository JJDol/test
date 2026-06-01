/**
 * 🏢 Project Details Page - Refactored Architecture
 * 
 * PURPOSE: Thin orchestration component that uses the useProjectDetails hook
 * - Follows the dashboard/profile pattern
 * - Minimal business logic in the component
 * - Clean separation of concerns
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable hook pattern
 * - Clean architecture
 * - Maintainable code
 */

"use client";

import { Suspense, use } from "react";
import { useProjectDetails } from "@/hooks/use-project-details";
import { ProjectDetailsContent } from "@/components/project-details/project-details-content";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

interface ProjectDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = use(params);
  const projectDetails = useProjectDetails(id);

  return (
    <ProtectedPageWrapper loadingMessage="Loading project details...">
      <div className="container mx-auto p-6">
        <Suspense>
          <ProjectDetailsContent {...projectDetails} />
        </Suspense>
      </div>
    </ProtectedPageWrapper>
  );
}
