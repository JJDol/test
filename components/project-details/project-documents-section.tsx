/**
 * 🏢 ProjectDocumentsSection - Main Documents and Variables Section
 * 
 * PURPOSE: Handles the main documents area with category tabs and template management
 * - Category tabs navigation
 * - Template selector dialog
 * - General variables section
 * - Document template cards
 * - Refresh functionality
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across project components
 * - Clean separation of concerns
 * - Professional UI with proper loading states
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateSelectorDialog } from "@/components/ui/template-selector-dialog";
import { RefreshCw, Plus, LayoutGrid, List } from "lucide-react";
import { DocumentCategory, getCategoryDisplayName, VariablePropagationScope } from "@/lib/types/types";
import { GeneralVariablesSection} from './general-variables-section';
import { CategoryVariablesSection } from "@/components/ui/category-variables-section";
import { DocumentTemplateCard } from './document-template-card';
import { DocumentListView } from './document-list-view';
import { Project, DocumentTemplate, User, ProjectTemplate } from "@/lib/types/types";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DocumentVariable } from "@/lib/types/variable-types";
import { Badge } from "@/components/ui/badge";

interface ProjectDocumentsSectionProps {
  // Data
  project: Project | null;
  currentUser: User | null;
  activeCategory: DocumentCategory;
  templates: DocumentTemplate[];
  allTemplates: DocumentTemplate[];
  
  // State
  collapsedTemplates: { [key: string]: boolean };
  collapsedGlobalSection: boolean;
  collapsedCategorySections: { [key: string]: boolean };
  templateVariables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
  
  // Loading states
  loading?: {
    templates: boolean;
  };
  
  // Error states
  error?: {
    templates: string | null;
  };

  /** When the active phase is locked, all interactive elements are disabled except Generate Document and navigation tabs. */
  isLocked?: boolean;
  
  // Computed values
  canEditVariables: (templateName: string) => boolean;
  canCheckVariables: (templateName: string) => boolean;
  canEditGeneralVariables: () => boolean;
  calculateTemplateProgress: (templateName: string, template: DocumentTemplate) => number;
  getVariableType: (templateName: string, variableName: string) => string;
  
  // Actions
  onTabChange: (category: DocumentCategory) => void;
  onRefresh: () => void;
  onTemplateSelected: (template: DocumentTemplate) => void;
  onProjectTemplateSelected: (projectTemplate: ProjectTemplate) => void;
  onTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
  onVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
  onPropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
  onSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
  onReadyForControl: (templateName: string, checked: boolean) => Promise<void>;
  onGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  onAssignmentUpdate: (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => Promise<void>;
  onUpgradeVersion?: (templateName: string) => Promise<void>;
  onToggleTemplateCollapse: (templateName: string) => void;
  onCollapseAllTemplates: () => void;
  onToggleGlobalSectionCollapse: () => void;
  onToggleCategorySectionCollapse: (category: DocumentCategory) => void;
  onDropdownOptionsChange?: (templateName: string, variableName: string, category: DocumentCategory, options: { displayText: string; value: string }[]) => Promise<void>;
}

export function ProjectDocumentsSection({
  project,
  currentUser,
  activeCategory,
  templates,
  allTemplates,
  collapsedTemplates,
  collapsedGlobalSection,
  collapsedCategorySections,
  templateVariables,
  loading,
  error,
  canEditVariables,
  canCheckVariables,
  canEditGeneralVariables,
  calculateTemplateProgress,
  getVariableType,
  onTabChange,
  onRefresh,
  onTemplateSelected,
  onProjectTemplateSelected,
  onTemplateRemove,
  onVariableChange,
  onPropagationChange,
  onSupervisorCheck,
  onReadyForControl,
  onGenerateDocument,
  onAssignmentUpdate,
  onUpgradeVersion,
  onToggleTemplateCollapse,
  onCollapseAllTemplates,
  onToggleGlobalSectionCollapse,
  onToggleCategorySectionCollapse,
  isLocked = false,
  onDropdownOptionsChange,
}: ProjectDocumentsSectionProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (!project) {
    return null;
  }

  return (
    <div className="bg-background w-full">
      <div className="w-full">
        {/* Category Tabs - At the top */}
        <Tabs defaultValue={activeCategory} className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 mb-6 w-full h-auto">
            {Object.values(DocumentCategory).map((category) => {
              const templateNames = project?.[`${category.toLowerCase()}_templates` as keyof Project] as string[] || [];
              const count = templateNames.length;
              
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  onClick={() => {
                    onCollapseAllTemplates();
                    onTabChange(category);
                  }}
                  className="px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    {getCategoryDisplayName(category)}
                    {count > 0 && (
                      <Badge 
                        variant="default" 
                        className="px-1.5 py-0.5 min-w-[1.25rem] h-5 justify-center bg-black text-white hover:bg-black/90"
                      >
                        {count}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Header Section */}
          <div className="mt-8 mb-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold tracking-tight">
                {getCategoryDisplayName(activeCategory)} Documents
              </h1>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {Object.values(DocumentCategory).map((category) => {
            const categoryTemplates = allTemplates.filter(t => t.category === category);
            const templateNames = project?.[`${category.toLowerCase()}_templates` as keyof Project] as string[] || [];
            const storedCategoryVariables = project?.category_variables?.[category]?.variables?.filter((variable: any) => {
              const categorySettings = project?.variable_propagation_settings?.[category] || {};
              if (!categorySettings) return false;
              
              // Check if any template in this category has this variable set to category
              return Object.values(categorySettings).some((templateSettings: any) => 
                templateSettings?.[variable.name]?.currentScope === VariablePropagationScope.CATEGORY
              );
            }) || [];

            return (
              <TabsContent key={category} value={category} className="w-full">
                <div className="space-y-6">
                  {/* Loading State */}
                  {loading?.templates ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading templates...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Variables Section - Global and Category in one box */}
                      <div className="bg-muted rounded-lg p-4 space-y-4">
                        {/* Global Variables */}
                        <GeneralVariablesSection
                          allTemplates={allTemplates}          
                          globalVariables={project?.global_variables?.variables || []}
                          templateVariables={templateVariables}
                          propagationSettings={project?.variable_propagation_settings || {} as any}
                          project={project}
                          collapsed={collapsedGlobalSection}
                          canEdit={isLocked ? false : canEditGeneralVariables()}
                          onToggleCollapse={() => onToggleGlobalSectionCollapse()}
                          onVariableChange={onVariableChange}
                        />

                        {/* Category Variables */}
                        <CategoryVariablesSection
                          category={category}
                          categoryVariables={project.category_variables?.[category]?.variables || []}
                          categoryTemplates={categoryTemplates.filter(t => templateNames.includes(t.name))}
                          templateVariables={project.template_variables || {}}
                          propagationSettings={project.variable_propagation_settings || {}}
                          globalVariables={project.global_variables?.variables || []}
                          collapsed={collapsedCategorySections[category] ?? true}
                          canEdit={isLocked ? false : canEditGeneralVariables()}
                          projectId={project.id}
                          onToggleCollapse={() => onToggleCategorySectionCollapse(category)}
                          onVariableChange={onVariableChange}
                          onPropagationChange={onPropagationChange}
                        />
                      </div>

                      {/* Document Template Cards */}
                      <div className="border rounded-lg p-4">
                        {/* Top Bar: View Toggle + Add Document Button */}
                        <div className="flex items-center justify-between mb-4">
                          {/* View Toggle */}
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant={viewMode === "grid" ? "default" : "ghost"}
                              size="sm"
                              className="h-8 w-8 p-0 rounded-r-none"
                              onClick={() => setViewMode("grid")}
                              title="Card View"
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={viewMode === "list" ? "default" : "ghost"}
                              size="sm"
                              className="h-8 w-8 p-0 rounded-l-none"
                              onClick={() => setViewMode("list")}
                              title="List View"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                          </div>

                          {!project.is_archived && (
                            <TemplateSelectorDialog
                              category={category}
                              onTemplateSelected={onTemplateSelected}
                              onProjectTemplateSelected={onProjectTemplateSelected}
                              existingTemplates={project?.[`${category.toLowerCase()}_templates` as keyof Project] as string[] || []}
                              trigger={
                                <Button size="sm" className="gap-2" disabled={isLocked}>
                                  <Plus className="h-4 w-4" />
                                  Add {getCategoryDisplayName(category)} Document
                                </Button>
                              }
                            />
                          )}
                        </div>

                        {/* List View */}
                        {viewMode === "list" ? (
                          <DocumentListView
                            templates={categoryTemplates.filter(t => templateNames.includes(t.name))}
                            project={project}
                            currentUser={currentUser}
                            templateVariables={templateVariables}
                            isLocked={isLocked}
                            calculateTemplateProgress={calculateTemplateProgress}
                            getVariableType={getVariableType}
                            canEditVariables={canEditVariables}
                            canCheckVariables={canCheckVariables}
                            canEditGeneralVariables={canEditGeneralVariables}
                            onVariableChange={onVariableChange}
                            onPropagationChange={onPropagationChange}
                            onSupervisorCheck={onSupervisorCheck}
                            onReadyForControl={onReadyForControl}
                            onGenerateDocument={onGenerateDocument}
                            onTemplateRemove={onTemplateRemove}
                            onDropdownOptionsChange={onDropdownOptionsChange}
                          />
                        ) : (
                          /* Card View (Grid) */
                          <div className="flex flex-wrap gap-4">
                            {categoryTemplates
                              .filter(t => templateNames.includes(t.name))
                              .map((template) => {
                                const isExpanded = !(collapsedTemplates[template.name] ?? true);
                                return (
                                  <div 
                                    key={template.name}
                                    className={isExpanded ? "w-full" : "w-[200px]"}
                                  >
                                    <ErrorBoundary
                                      fallback={
                                        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                                          <p className="text-destructive text-sm">
                                            Error loading template: {template.name}
                                          </p>
                                        </div>
                                      }
                                      onError={(error) => {
                                        console.error(`Error in template ${template.name}:`, error);
                                      }}
                                    >
                                      <DocumentTemplateCard
                                        template={template}
                                        project={project}
                                        currentUser={currentUser}
                                        templateVariables={templateVariables[template.category]?.[template.name]?.variables || []}
                                        collapsed={collapsedTemplates[template.name] ?? true}
                                        categoryVariableNames={project.category_variables?.[template.category]?.variables?.map((v: any) => v.name) || []}
                                        globalVariableNames={project.global_variables?.variables?.map((v: any) => v.name) || []}
                                        canEditVariables={isLocked ? false : canEditVariables(template.name)}
                                        canCheckVariables={isLocked ? false : canCheckVariables(template.name)}
                                        canEditGeneralVariables={isLocked ? false : canEditGeneralVariables()}
                                        isLocked={isLocked}
                                        calculateProgress={calculateTemplateProgress}
                                        getVariableType={getVariableType}
                                        onToggleCollapse={() => onToggleTemplateCollapse(template.name)}
                                        onVariableChange={onVariableChange}
                                        onPropagationChange={onPropagationChange}
                                        onSupervisorCheck={onSupervisorCheck}
                                        onReadyForControl={onReadyForControl}
                                        onGenerateDocument={onGenerateDocument}
                                        onTemplateRemove={onTemplateRemove}
                                        onAssignmentUpdate={onAssignmentUpdate}
                                        onUpgradeVersion={onUpgradeVersion}
                                        onRefresh={onRefresh}
                                        canAssignDocuments={isLocked ? false : (currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.id === project.leader_id ||
                                          currentUser?.id === project.document_assignments?.[template.name]?.supervisor_id)}
                                        canManageProject={isLocked ? false : (currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.id === project.leader_id)}
                                        onDropdownOptionsChange={onDropdownOptionsChange}
                                      />
                                    </ErrorBoundary>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                      
                      {/* Empty State */}
                      {templateNames.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            No {getCategoryDisplayName(category)} documents added to this project yet.
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            Click "Add {getCategoryDisplayName(category)} Document" to get started.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
