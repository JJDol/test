"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { ChevronDown, ChevronRight, MoreHorizontal, FileText, Trash2, Upload, RotateCcw, ArrowUpCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DocumentCategory, VariablePropagationScope } from "@/lib/types/types";
import { DocumentTemplate, Project, User } from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

interface DocumentListViewProps {
  templates: DocumentTemplate[];
  project: Project;
  currentUser: User | null;
  templateVariables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
  isLocked?: boolean;
  calculateTemplateProgress: (templateName: string, template: DocumentTemplate) => number;
  getVariableType: (templateName: string, variableName: string) => string;
  canEditVariables: (templateName: string) => boolean;
  canCheckVariables: (templateName: string) => boolean;
  canEditGeneralVariables: () => boolean;
  onVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
  onPropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
  onSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
  onReadyForControl: (templateName: string, checked: boolean) => Promise<void>;
  onGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  onTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
  onDropdownOptionsChange?: (templateName: string, variableName: string, category: DocumentCategory, options: { displayText: string; value: string }[]) => Promise<void>;
}

export function DocumentListView({
  templates,
  project,
  currentUser,
  templateVariables,
  isLocked = false,
  calculateTemplateProgress,
  getVariableType,
  canEditVariables,
  canCheckVariables,
  canEditGeneralVariables,
  onVariableChange,
  onPropagationChange,
  onSupervisorCheck,
  onReadyForControl,
  onGenerateDocument,
  onTemplateRemove,
  onDropdownOptionsChange,
}: DocumentListViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (templateName: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(templateName)) {
        next.delete(templateName);
      } else {
        next.add(templateName);
      }
      return next;
    });
  };

  const getProgressColor = (value: number) => {
    if (value === 0) return "bg-red-400";
    if (value < 50) return "bg-orange-400";
    if (value < 100) return "bg-yellow-400";
    return "bg-green-500";
  };

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="grid grid-cols-[minmax(250px,2fr)_80px_120px_120px_120px_100px_100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
        <div>Document name</div>
        <div className="text-center">Version</div>
        <div className="text-center">Assigned to</div>
        <div className="text-center">Supervisor</div>
        <div className="text-center">Progress</div>
        <div className="text-center">Checked by supervisor</div>
        <div className="text-center">Ready for control</div>
      </div>

      {/* Table Rows */}
      {templates.map((template) => {
        const isExpanded = expandedRows.has(template.name);
        const progress = calculateTemplateProgress(template.name, template);
        const assignments = project.document_assignments?.[template.name];
        const lockedVersion = project.template_version_locks?.[template.name] || 1;
        const supervisorChecked = assignments?.supervisor_checked || false;
        const readyForControl = assignments?.ready_for_control || false;
        const variables = templateVariables[template.category]?.[template.name]?.variables || [];
        const globalVariableNames = project.global_variables?.variables?.map((v: any) => v.name) || [];
        const categoryVariableNames = project.category_variables?.[template.category]?.variables?.map((v: any) => v.name) || [];
        const localVariables = variables.filter(
          (v: DocumentVariable) => !globalVariableNames.includes(v.name) && !categoryVariableNames.includes(v.name)
        );

        return (
          <div key={template.name} className="border-b last:border-b-0">
            {/* Row */}
            <div className="grid grid-cols-[minmax(250px,2fr)_80px_120px_120px_120px_100px_100px] gap-2 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors">
              {/* Document name with expand toggle */}
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => toggleRow(template.name)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
                <span className="text-sm truncate">{template.name}</span>

                {/* Actions */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 ml-auto opacity-0 group-hover:opacity-100 hover:opacity-100">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onGenerateDocument(template.name, template.category)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Document
                    </DropdownMenuItem>
                    {!isLocked && !project.is_archived && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onTemplateRemove(template.name, template.category)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Version */}
              <div className="text-center text-sm text-muted-foreground">
                v{lockedVersion}
              </div>

              {/* Assigned to */}
              <div className="text-center text-xs text-muted-foreground truncate">
                {assignments?.assignee_name || "Not assigned"}
              </div>

              {/* Supervisor */}
              <div className="text-center text-xs text-muted-foreground truncate">
                {assignments?.supervisor_name || "Not assigned"}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 justify-center">
                <div className="w-16 h-4 bg-muted rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(progress)} transition-all`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8">{progress} %</span>
              </div>

              {/* Checked by supervisor */}
              <div className="flex justify-center">
                <Checkbox
                  checked={supervisorChecked}
                  onCheckedChange={(checked) => onSupervisorCheck(template.name, !!checked)}
                  disabled={isLocked || !canCheckVariables(template.name)}
                />
              </div>

              {/* Ready for control */}
              <div className="flex justify-center">
                <Checkbox
                  checked={readyForControl}
                  onCheckedChange={(checked) => onReadyForControl(template.name, !!checked)}
                  disabled={isLocked || !canCheckVariables(template.name)}
                />
              </div>
            </div>

            {/* Expanded Variables Section */}
            {isExpanded && localVariables.length > 0 && (
              <div className="px-10 py-3 bg-muted/30 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {localVariables.map((variable: DocumentVariable) => (
                    <EnhancedVariableInput
                      key={variable.name}
                      variable={variable}
                      projectId={project.id}
                      disabled={isLocked || !canEditVariables(template.name)}
                      onChange={(value) =>
                        onVariableChange(
                          template.name,
                          variable.name,
                          value,
                          template.category,
                          false,
                          false
                        )
                      }
                      onDropdownOptionsChange={
                        onDropdownOptionsChange
                          ? (options) => onDropdownOptionsChange(template.name, variable.name, template.category, options)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {isExpanded && localVariables.length === 0 && (
              <div className="px-10 py-3 bg-muted/30 border-t">
                <p className="text-xs text-muted-foreground italic">No local variables for this document.</p>
              </div>
            )}
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No documents in this category.
        </div>
      )}
    </div>
  );
}
