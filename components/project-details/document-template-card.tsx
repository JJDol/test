/**
 * 🏢 DocumentTemplateCard - Individual Template Card Component
 * 
 * PURPOSE: Displays individual template with variables and actions
 * - Template information and progress
 * - Variable inputs with proper permissions
 * - Action buttons (generate, assign, delete)
 * - Collapsible variables section
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across project components
 * - Clean separation of concerns
 */

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { DocumentActionsMenu } from "./document-actions-menu";
import { ChevronDown, ChevronUp, ArrowUpCircle } from "lucide-react";
import { DocumentCategory, VariablePropagationScope } from "@/lib/types/types";
import { DocumentTemplate, Project, User } from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  project: Project;
  currentUser: User | null;
  templateVariables: DocumentVariable[];
  collapsed: boolean;
  categoryVariableNames: string[];
  globalVariableNames: string[];
  canEditVariables: boolean;
  canCheckVariables: boolean;
  canEditGeneralVariables: boolean;
  calculateProgress: (templateName: string, template: DocumentTemplate) => number;
  getVariableType: (templateName: string, variableName: string) => string;
  onToggleCollapse: () => void;
  onVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
  onPropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
  onSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
  onReadyForControl: (templateName: string, checked: boolean) => Promise<void>;
  onGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  onTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
  onAssignmentUpdate: (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => Promise<void>;
  onUpgradeVersion?: (templateName: string) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
  canAssignDocuments: boolean;
  canManageProject: boolean;
  /** When true, all interactive elements are disabled except Generate Document. */
  isLocked?: boolean;
  onDropdownOptionsChange?: (templateName: string, variableName: string, category: DocumentCategory, options: { displayText: string; value: string }[]) => Promise<void>;
}

export function DocumentTemplateCard({
  template,
  project,
  currentUser,
  templateVariables,
  collapsed,
  categoryVariableNames,
  globalVariableNames,
  canEditVariables,
  canCheckVariables,
  canEditGeneralVariables,
  calculateProgress,
  getVariableType,
  onToggleCollapse,
  onVariableChange,
  onPropagationChange,
  onSupervisorCheck,
  onReadyForControl,
  onGenerateDocument,
  onTemplateRemove,
  onAssignmentUpdate,
  onUpgradeVersion,
  onRefresh,
  canAssignDocuments,
  canManageProject,
  isLocked = false,
  onDropdownOptionsChange,
}: DocumentTemplateCardProps) {
  // Version info (used to render the badge in the card body)
  const lockedVersion = project.template_version_locks?.[template.name] || 1;
  const latestVersion = template.current_version || 1;
  const hasNewerVersion = latestVersion > lockedVersion;
  const hasCustomTemplate = !!project.custom_templates?.[template.name];

  const progressValue = calculateProgress(template.name, template);

  return (
    <Card className={`p-4 flex flex-col h-full ${isLocked ? "opacity-75" : ""}`}>
      {/* Card Header - Collapse toggle and menu */}
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        
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
        />
      </div>

      <div className="max-w-[220px]">
        {/* Template Title and Version - fixed height for consistency */}
        <div className="mb-2 min-h-[4.5rem] text-center">
          <h3 className="text-base font-semibold line-clamp-2 mb-1">{template.name}</h3>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge
              variant={hasNewerVersion ? "outline" : "secondary"}
              className={`text-xs ${hasNewerVersion ? "border-amber-500 text-amber-600" : ""}`}
              title={hasNewerVersion
                ? `Using version ${lockedVersion}. Version ${latestVersion} available.`
                : `Using latest version (v${lockedVersion})`
              }
            >
              v{lockedVersion}
              {hasNewerVersion && (
                <ArrowUpCircle className="ml-1 h-3 w-3" />
              )}
            </Badge>
            {hasCustomTemplate && (
              <Badge
                variant="outline"
                className="text-xs border-blue-500 text-blue-600"
                title="This project uses a customized version of the template"
              >
                Customized
              </Badge>
            )}
          </div>
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center py-1">
          <CircularProgress value={progressValue} size={80} strokeWidth={6} />
        </div>

        {/* Assignment Information - fixed height for consistency */}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground min-h-[4.5rem] text-center">
          <p className="truncate">Assigned to: {project.document_assignments?.[template.name]?.assignee_name || 'Not assigned'}</p>
          <p className="truncate">Supervisor: {project.document_assignments?.[template.name]?.supervisor_name || 'Not assigned'}</p>
          <div className="h-6 flex items-center justify-center">
            {project.document_assignments?.[template.name]?.supervisor_checked && (
              <Badge variant="outline" className="text-xs">Checked by supervisor</Badge>
            )}
          </div>
        </div>

        {/* Checkboxes Section - fixed height for consistency */}
        <div className="pt-3 space-y-2 min-h-[3.5rem] flex flex-col items-center">
          {!project.is_archived && canCheckVariables && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`check-${template.name}`}
                checked={project.document_assignments?.[template.name]?.supervisor_checked || false}
                disabled={isLocked}
                onCheckedChange={(checked) => onSupervisorCheck(template.name, checked as boolean)}
              />
              <Label htmlFor={`check-${template.name}`} className="text-xs text-muted-foreground">
                Check by supervisor
              </Label>
            </div>
          )}
          {/* Ready for control checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`ready-${template.name}`}
              checked={project.document_assignments?.[template.name]?.ready_for_control || false}
              disabled={isLocked || project.is_archived || !project.document_assignments?.[template.name]?.supervisor_checked}
              onCheckedChange={(checked) => onReadyForControl(template.name, checked as boolean)}
            />
            <Label htmlFor={`ready-${template.name}`} className="text-xs text-muted-foreground">
              Ready for control
            </Label>
          </div>
        </div>
      </div>

      {/* Collapsible Variables Section */}
      {!collapsed && (
        <div className="grid gap-6 mt-4">
          {template.variables.map((variable: DocumentVariable) => {
            const variableName = variable.name;
            // Use the declared scope from the variable directly (set in template via Content Control tag)
            const declaredScope = (variable as any).scope || 'local';
            const isGlobal = declaredScope === 'global' || globalVariableNames?.includes(variableName);
            const isCategory = declaredScope === 'category' || categoryVariableNames?.includes(variableName);
            const scopeOfVariable = project.variable_propagation_settings?.[template.category]?.[template.name]?.[variableName]?.currentScope;
            const variableType = getVariableType(template.name, variableName);

            return (
              <div key={variableName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGlobal && (
                      <Badge variant="outline" className="text-xs">Global</Badge>
                    )}
                    {isCategory && !isGlobal && (
                      <Badge variant="outline" className="text-xs">Category</Badge>
                    )}
                  </div>
                  {(isGlobal || isCategory) && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`local-${template.name}-${variableName}`}
                        checked={scopeOfVariable === VariablePropagationScope.LOCAL}
                        onCheckedChange={(checked) => {
                          // Determine what scope to revert to based on declared scope
                          const shouldRevertToCategory = isCategory && !isGlobal;
                          onPropagationChange(template.category, template.name, variableName, shouldRevertToCategory, checked as boolean);
                        }}
                      />
                      <Label htmlFor={`local-${template.name}-${variableName}`} className="text-xs text-gray-600">
                        Use local value
                      </Label>
                    </div>
                  )}
                </div>
                
                <EnhancedVariableInput
                  variable={{
                    name: variableName,
                    type: variableType as any,
                    value: (() => {
                      // ✅ D2 X2 정책 — scope별 SSOT 우선 조회.
                      // GLOBAL  → project.global_variables.variables (SSOT)
                      // CATEGORY → project.category_variables[category].variables (SSOT)
                      // LOCAL    → doc-level template_variables[category][template].variables
                      // 모든 scope에서 SSOT가 비어 있으면 옛 doc-level 위치로 fallback (마이그레이션 호환).
                      if (scopeOfVariable === VariablePropagationScope.GLOBAL) {
                        const ssot = project.global_variables?.variables?.find((v: DocumentVariable) => v.name === variableName)?.value;
                        if (ssot !== undefined && ssot !== '' && ssot !== null) return ssot;
                        // legacy fallback — 옛 모델에서 doc-level에 저장됐던 값
                        const allCategories = Object.keys(project.template_variables || {}) as DocumentCategory[];
                        for (const cat of allCategories) {
                          const catTemplateVars = project.template_variables?.[cat] || {};
                          for (const tName of Object.keys(catTemplateVars)) {
                            const tScope = project.variable_propagation_settings?.[cat]?.[tName]?.[variableName]?.currentScope;
                            if (tScope === VariablePropagationScope.GLOBAL) {
                              const varValue = catTemplateVars[tName]?.variables?.find((v: DocumentVariable) => v.name === variableName)?.value;
                              if (varValue !== undefined && varValue !== '') return varValue;
                            }
                          }
                        }
                        return '';
                      }
                      if (scopeOfVariable === VariablePropagationScope.CATEGORY) {
                        const ssot = project.category_variables?.[template.category]?.variables?.find((v: DocumentVariable) => v.name === variableName)?.value;
                        if (ssot !== undefined && ssot !== '' && ssot !== null) return ssot;
                        // legacy fallback
                        const categoryTemplateVars = project.template_variables?.[template.category] || {};
                        for (const tName of Object.keys(categoryTemplateVars)) {
                          const tScope = project.variable_propagation_settings?.[template.category]?.[tName]?.[variableName]?.currentScope;
                          if (tScope === VariablePropagationScope.CATEGORY) {
                            const varValue = categoryTemplateVars[tName]?.variables?.find((v: DocumentVariable) => v.name === variableName)?.value;
                            if (varValue !== undefined && varValue !== '') return varValue;
                          }
                        }
                        return '';
                      }
                      // LOCAL scope (또는 scope 미정의 시 default)
                      return project.template_variables?.[template.category]?.[template.name]?.variables?.find(v => v.name === variableName)?.value || '';
                    })(),
                    // Include dropdownOptions - prioritize custom options from project, fall back to template
                    ...((() => {
                      // Check for custom options in project's template_variables first
                      const customVar = project.template_variables?.[template.category]?.[template.name]?.variables?.find(v => v.name === variableName);
                      if (customVar && 'dropdownOptions' in customVar && customVar.dropdownOptions) {
                        return { dropdownOptions: customVar.dropdownOptions };
                      }
                      // Fall back to original template options
                      if ('dropdownOptions' in variable && variable.dropdownOptions) {
                        return { dropdownOptions: variable.dropdownOptions };
                      }
                      return {};
                    })())
                  } as any}
                  onChange={(value) => {
                    // Determine if this should be treated as local based on current scope
                    const isCurrentlyLocal = scopeOfVariable === VariablePropagationScope.LOCAL;
                    const isCurrentlyCategory = scopeOfVariable === VariablePropagationScope.CATEGORY;
                    
                    onVariableChange(template.name, variableName, value, template.category, 
                      isGlobal && !isCurrentlyLocal && !isCurrentlyCategory, // isGlobal: only if declared global AND not local/category
                      isCategory && !isGlobal && !isCurrentlyLocal // isCategory: only if declared category AND not local
                    );
                  }}
                  disabled={
                    (isGlobal || isCategory)
                      ? (!canEditGeneralVariables || scopeOfVariable !== VariablePropagationScope.LOCAL)
                      : !canEditVariables
                  }
                  projectId={project.id}
                  templateName={template.name}
                  onDropdownOptionsChange={onDropdownOptionsChange ? (options) => 
                    onDropdownOptionsChange(template.name, variableName, template.category, options)
                  : undefined}
                />
                
                {isGlobal && scopeOfVariable !== VariablePropagationScope.LOCAL && (
                  <p className="text-xs text-blue-600">
                    This variable uses the global value. Check "Use local value" to override.
                  </p>
                )}
                {isCategory && !isGlobal && scopeOfVariable !== VariablePropagationScope.LOCAL && (
                  <p className="text-xs text-blue-600">
                    This variable uses the category value. Check "Use local value" to override.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

    </Card>
  );
}
