/**
 * 🏢 ProjectTemplateCard - Enterprise Project Template Card Component
 * 
 * PURPOSE: Individual project template display card with actions
 * - Displays project template information and metadata
 * - Handles project template actions (view, edit, delete, download)
 * - Professional card-based layout with hover effects
 * - Dropdown menu for actions
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across different contexts
 * - Professional UI patterns
 * - Consistent with DocumentTemplateCard architecture
 * - Easy to test and maintain
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ProjectTemplate, DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";

interface ProjectTemplateCardProps {
  projectTemplate: ProjectTemplate;
  onView: (pt: ProjectTemplate) => void;
  onEdit: (pt: ProjectTemplate) => void;
  onDelete: (pt: ProjectTemplate) => void;
  onDownload?: (pt: ProjectTemplate) => void;
  className?: string;
}

export function ProjectTemplateCard({
  projectTemplate,
  onView,
  onEdit,
  onDelete,
  onDownload,
  className = ""
}: ProjectTemplateCardProps) {
  const tc = useTranslations("common");
  return (
    <Card
      className={`relative cursor-pointer transition-colors hover:bg-muted/10 ${className}`}
      onClick={() => onView(projectTemplate)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{projectTemplate.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {getCategoryDisplayName(projectTemplate.category as DocumentCategory)}
            </p>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(projectTemplate);
                }}
              >
                {tc("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(projectTemplate);
                }}
              >
                {tc("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground">
          {projectTemplate.templates.length} templates
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center justify-between w-full">
          <span>Last updated: {new Date(projectTemplate.updated_at).toLocaleDateString()}</span>
          <span>Created by: —</span>
        </div>
      </CardFooter>
    </Card>
  );
}
