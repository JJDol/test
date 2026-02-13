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

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { DocumentAssignDialog } from "@/components/ui/document-assign-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProjectTemplateReuploadDialog } from "./project-template-reupload-dialog";
import { ChevronDown, ChevronUp, MoreHorizontal, ArrowUpCircle, Upload, RotateCcw, FileText, Trash2 } from "lucide-react";
import { DocumentCategory, VariablePropagationScope } from "@/lib/types/types";
import { DocumentTemplate, Project, User } from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";
import { useToast } from "@/components/ui/toast";

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
}: DocumentTemplateCardProps) {
  const { toast } = useToast();

  // State for dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReuploadDialog, setShowReuploadDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Get current assignments for this template
  const currentAssignments = project.document_assignments?.[template.name];

  // Version info
  const lockedVersion = project.template_version_locks?.[template.name] || 1;
  const latestVersion = template.current_version || 1;
  const hasNewerVersion = latestVersion > lockedVersion;

  // Check if project has a custom template
  const hasCustomTemplate = !!(project.custom_templates?.[template.name]);

  // Handle reset to original
  const handleResetToOriginal = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/reset-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: template.name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset template');
      }

      toast({
        title: "Success",
        description: "Template reset to original",
      });

      setShowResetConfirm(false);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error resetting template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reset template',
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const progressValue = calculateProgress(template.name, template);

  return (
    <Card className="p-4 flex flex-col h-full">
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
        
        {/* Actions Dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!project.is_archived && (
              <DropdownMenuItem onClick={() => onGenerateDocument(template.name, template.category)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate document
              </DropdownMenuItem>
            )}
            {!project.is_archived && hasNewerVersion && onUpgradeVersion && (
              <DropdownMenuItem
                onClick={() => onUpgradeVersion(template.name)}
                className="text-amber-600"
              >
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Upgrade to v{latestVersion}
              </DropdownMenuItem>
            )}
            {!project.is_archived && canManageProject && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowReuploadDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Reupload Document
                </DropdownMenuItem>
                {hasCustomTemplate && (
                  <DropdownMenuItem
                    onClick={() => setShowResetConfirm(true)}
                    className="text-blue-600"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Original
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
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
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from project
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Template Title and Version - fixed height for consistency */}
      <div className="mb-4 min-h-[3.5rem]">
        <h3 className="text-sm font-semibold line-clamp-1 mb-1">{template.name}</h3>
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
      <div className="flex justify-center py-3">
        <CircularProgress value={progressValue} size={80} strokeWidth={6} />
      </div>

      {/* Assignment Information - fixed height for consistency */}
      <div className="mt-3 space-y-1 text-xs text-muted-foreground min-h-[4.5rem]">
        <p className="truncate">Assigned to: {project.document_assignments?.[template.name]?.assignee_name || 'Not assigned'}</p>
        <p className="truncate">Supervisor: {project.document_assignments?.[template.name]?.supervisor_name || 'Not assigned'}</p>
        <div className="h-6 flex items-center">
          {project.document_assignments?.[template.name]?.supervisor_checked && (
            <Badge variant="outline" className="text-xs">Checked by supervisor</Badge>
          )}
        </div>
      </div>

      {/* Checkboxes Section - fixed height for consistency */}
      <div className="mt-auto pt-3 space-y-2 min-h-[3.5rem]">
        {!project.is_archived && canCheckVariables && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`check-${template.name}`}
              checked={project.document_assignments?.[template.name]?.supervisor_checked || false}
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
            disabled={project.is_archived || !project.document_assignments?.[template.name]?.supervisor_checked}
            onCheckedChange={(checked) => onReadyForControl(template.name, checked as boolean)}
          />
          <Label htmlFor={`ready-${template.name}`} className="text-xs text-muted-foreground">
            Ready for control
          </Label>
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
                    value: project.template_variables?.[template.category]?.[template.name]?.variables?.find(v => v.name === variableName)?.value || ''
                  }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove template from project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{template.name}</strong> from this project.
              The template itself will not be deleted and can be added back later.
              Any filled variables for this template will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onTemplateRemove(template.name, template.category)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Original Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to original template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the customized version of <strong>{template.name}</strong> and
              revert to the original global template.
              Your variable values will be preserved, but the template structure will change
              back to the original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetToOriginal}
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset to Original"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Template Reupload Dialog */}
      <ProjectTemplateReuploadDialog
        open={showReuploadDialog}
        onOpenChange={setShowReuploadDialog}
        template={template}
        projectId={project.id}
        onReuploadComplete={async () => {
          if (onRefresh) {
            await onRefresh();
          }
        }}
      />
    </Card>
  );
}
