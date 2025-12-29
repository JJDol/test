"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";

interface ProjectTemplate {
  name: string;
  category: DocumentCategory;
  description: string | null;
  variables: string[];
}

interface ProjectTemplateDropdownProps {
  category: DocumentCategory;
  selectedTemplate?: string;
  projectTemplates: ProjectTemplate[];
  onTemplateSelect: (templateName: string) => void;
  onTemplateClear: () => void;
}

export function ProjectTemplateDropdown({
  category,
  selectedTemplate,
  projectTemplates,
  onTemplateSelect,
  onTemplateClear,
}: ProjectTemplateDropdownProps) {
  // Filter templates for this specific category
  const categoryTemplates = projectTemplates.filter(
    (template) => template.category === category
  );

  if (selectedTemplate) {
    // Show selected template with clear button
    return (
      <div className="flex items-center justify-between p-2 border rounded-md bg-muted">
        <span className="text-sm">{selectedTemplate}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onTemplateClear}
          aria-label={`Clear ${category} template selection`}
          className="h-6 w-6"
        >
          ×
        </Button>
      </div>
    );
  }

  // Show the select dropdown
  return (
    <Select onValueChange={onTemplateSelect}>
      <SelectTrigger className="flex items-center justify-between">
        <SelectValue placeholder={`Select ${getCategoryDisplayName(category).toLowerCase()} template`} />
        <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
      </SelectTrigger>
      <SelectContent>
        {categoryTemplates.map((template) => (
          <SelectItem key={template.name} value={template.name}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
