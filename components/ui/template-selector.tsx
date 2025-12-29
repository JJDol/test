"use client";

import { DocumentCategory } from "@/lib/types/types";

interface TemplateSelectorProps {
  category: DocumentCategory;
  templates: Array<{
    name: string;
    category: DocumentCategory;
    description: string | null;
    variables: string[];
  }>;
  selectedTemplate?: string;
  onSelect: (templateName: string | undefined) => void;
}

export function TemplateSelector({ 
  category, 
  templates, 
  selectedTemplate, 
  onSelect 
}: TemplateSelectorProps) {
  // Filter templates by category
  const categoryTemplates = templates.filter(
    (template) => template.category === category
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{category.replace(/_/g, ' ')} Templates</h3>
      {categoryTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates available</p>
      ) : (
        <div className="space-y-1">
          {categoryTemplates.map((template) => (
            <div 
              key={template.name}
              className={`
                p-2 rounded-md cursor-pointer border text-sm
                ${selectedTemplate === template.name 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:bg-accent'
                }
              `}
              onClick={() => onSelect(template.name)}
            >
              {template.name}
              {template.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {template.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 