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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { DocumentAssignDialog } from "@/components/ui/document-assign-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
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
  onGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  onTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
  onAssignmentUpdate: (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => Promise<void>;
  canAssignDocuments: boolean;
  canManageProject: boolean;
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
  onGenerateDocument,
  onTemplateRemove,
  onAssignmentUpdate,
  canAssignDocuments,
  canManageProject,
}: DocumentTemplateCardProps) {

  // Get current assignments for this template
  const currentAssignments = project.document_assignments?.[template.name];

  return (
    <Card className="p-6">
      {/* Template Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{template.name}</h3>
          <p className="text-sm text-gray-500">{template.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Actions Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!project.is_archived && (
                <DropdownMenuItem onClick={() => onGenerateDocument(template.name, template.category)}>
                  Generate document
                </DropdownMenuItem>
              )}
              {canAssignDocuments && (
                <DocumentAssignDialog
                  projectId={Number(project.id)}
                  templateName={template.name}
                  category={template.category}
                  onAssignmentUpdate={onAssignmentUpdate}
                  currentAssignments={currentAssignments}
                />
              )}
              {canManageProject && (
                <DropdownMenuItem 
                  onClick={() => onTemplateRemove(template.name, template.category)} 
                  className="text-red-600"
                >
                  Delete selected document
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
      </div>

      {/* Progress and Assignment Summary */}
      <div className="flex items-center gap-4 mt-2">
        <Progress value={calculateProgress(template.name, template)} className="flex-1" />
        <span className="text-sm text-gray-500">
          {calculateProgress(template.name, template)}% Complete
        </span>
      </div>

      {/* Assignment Information */}
      {project.document_assignments?.[template.name] && (
        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p>Assigned to: {project.document_assignments[template.name].assignee_name || 'Not assigned'}</p>
          <p>Supervisor: {project.document_assignments[template.name].supervisor_name || 'Not assigned'}</p>
          {project.document_assignments[template.name].supervisor_checked && (
            <Badge variant="outline">Checked by supervisor</Badge>
          )}
        </div>
      )}

      {/* Supervisor Check */}
      {!project.is_archived && canCheckVariables && (
        <div className="flex items-center gap-2 mt-3">
          <Checkbox
            id={`check-${template.name}`}
            checked={project.document_assignments?.[template.name]?.supervisor_checked || false}
            onCheckedChange={(checked) => onSupervisorCheck(template.name, checked as boolean)}
          />
          <Label htmlFor={`check-${template.name}`} className="text-sm text-gray-600">
            Check by supervisor
          </Label>
        </div>
      )}

      {/* Collapsible Variables Section */}
      {!collapsed && (
        <div className="grid gap-6 mt-4">
          {template.variables.map((variable: DocumentVariable) => {
            const variableName = variable.name;
            const isGeneral = globalVariableNames?.includes(variableName) || false;
            const isCategoryVariable = categoryVariableNames?.includes(variableName) || false;
            const scopeOfVariable = project.variable_propagation_settings?.[template.category]?.[template.name]?.[variableName]?.currentScope;
            // console.log('Debug - scopeOfVariable:', scopeOfVariable, 'for variable:', variableName, 'template:', template.name);
            const variableType = getVariableType(template.name, variableName);

            return (
              <div key={variableName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGeneral && (
                      <Badge variant="outline" className="text-xs">Global</Badge>
                    )}
                    {isCategoryVariable && (
                      <Badge variant="outline" className="text-xs">Category</Badge>
                    )}
                  </div>
                  {(isGeneral || isCategoryVariable) && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`local-${template.name}-${variableName}`}
                        checked={scopeOfVariable === VariablePropagationScope.LOCAL}
                        onCheckedChange={(checked) => {
                          // Determine what scope to revert to based on variable type
                          const shouldRevertToCategory = isCategoryVariable;
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
                    value: project.template_variables?.[template.category]?.[template.name]?.variables?.find(v => v.name === variableName)?.value || ''
                  }}
                  onChange={(value) => {
                    // Determine if this should be treated as local based on current scope
                    const isCurrentlyLocal = scopeOfVariable === VariablePropagationScope.LOCAL;
                    const isCurrentlyCategory = scopeOfVariable === VariablePropagationScope.CATEGORY;
                    
                    onVariableChange(template.name, variableName, value, template.category, 
                      isGeneral && !isCurrentlyLocal && !isCurrentlyCategory, // isGlobal: only if it's global AND not local/category
                      isCategoryVariable && !isCurrentlyLocal // isCategory: only if it's category AND not local
                    );
                  }}
                  disabled={
                    (isGeneral || isCategoryVariable)
                      ? (!canEditGeneralVariables || scopeOfVariable !== VariablePropagationScope.LOCAL)
                      : !canEditVariables
                  }
                  projectId={project.id}
                  templateName={template.name}
                />
                
                {isGeneral && scopeOfVariable !== VariablePropagationScope.LOCAL && (
                  <p className="text-xs text-blue-600">
                    This variable uses the general value. Check "Use local value" to override.
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
