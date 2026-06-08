"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DocumentActionsMenu } from "./document-actions-menu";
import { DocumentCategory } from "@/lib/types/types";
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
  onAssignmentUpdate?: (
    templateName: string,
    assignments: {
      assignee_id?: string;
      assignee_name?: string;
      supervisor_id?: string;
      supervisor_name?: string;
    }
  ) => Promise<void>;
  onUpgradeVersion?: (templateName: string) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
  canManageProject?: boolean;
  canAssignDocuments?: boolean;
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
  onAssignmentUpdate,
  onUpgradeVersion,
  onRefresh,
  canManageProject = false,
  canAssignDocuments = false,
  onDropdownOptionsChange,
}: DocumentListViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const t = useTranslations("projectDetails");
  const tc = useTranslations("common");

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
    if (value >= 100) return "bg-green-500";
    if (value >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="grid grid-cols-[minmax(250px,2fr)_80px_120px_120px_120px_100px_100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
        <div>{tc("name")}</div>
        <div className="text-center">{tc("version")}</div>
        <div className="text-center">{tc("assignedTo")}</div>
        <div className="text-center">Supervisor</div>
        <div className="text-center">{tc("progress")}</div>
        <div className="text-center">{t("checkedBySupervisor")}</div>
        <div className="text-center">{t("readyForControl")}</div>
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
          <div key={template.name} className="group border-b last:border-b-0">
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

                <div className="ml-auto shrink-0">
                  <DocumentActionsMenu
                    template={template}
                    project={project}
                    isLocked={isLocked}
                    canManageProject={canManageProject}
                    canAssignDocuments={canAssignDocuments}
                    onGenerateDocument={onGenerateDocument}
                    onTemplateRemove={onTemplateRemove}
                    onAssignmentUpdate={onAssignmentUpdate}
                    onUpgradeVersion={onUpgradeVersion}
                    onRefresh={onRefresh}
                    triggerClassName="h-6 w-6"
                    iconClassName="h-3.5 w-3.5"
                  />
                </div>
              </div>

              {/* Version */}
              <div className="text-center text-sm text-muted-foreground">
                v{lockedVersion}
              </div>

              {/* Assigned to */}
              <div className="text-center text-xs text-muted-foreground truncate">
                {assignments?.assignee_name || tc("notAssigned")}
              </div>

              {/* Supervisor */}
              <div className="text-center text-xs text-muted-foreground truncate">
                {assignments?.supervisor_name || tc("notAssigned")}
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
                      templateName={template.name}
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
                <p className="text-xs text-muted-foreground italic">{t("noLocalVariables")}</p>
              </div>
            )}
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {t("noDocumentsInCategory")}
        </div>
      )}
    </div>
  );
}
