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

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateSelectorDialog } from "@/components/ui/template-selector-dialog";
import { RefreshCw, Plus } from "lucide-react";
import { DocumentCategory, getCategoryDisplayName, VariablePropagationScope } from "@/lib/types/types";
import { GeneralVariablesSection} from './general-variables-section';
import { CategoryVariablesSection } from "@/components/ui/category-variables-section";
import { DocumentTemplateCard } from './document-template-card';
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
  onGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  onAssignmentUpdate: (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => Promise<void>;
  onUpgradeVersion?: (templateName: string) => Promise<void>;
  onToggleTemplateCollapse: (templateName: string) => void;
  onToggleGlobalSectionCollapse: () => void;
  onToggleCategorySectionCollapse: (category: DocumentCategory) => void;
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
  onGenerateDocument,
  onAssignmentUpdate,
  onUpgradeVersion,
  onToggleTemplateCollapse,
  onToggleGlobalSectionCollapse,
  onToggleCategorySectionCollapse,
}: ProjectDocumentsSectionProps) {
  if (!project) {
    return null;
  }

  return (
    <div className="bg-background border rounded-lg w-full">
      <div className="w-full p-6">
        {/* General Variables Section - Global across all categories */}
        {project?.global_variables?.variables && project.global_variables.variables.length > 0 && (
            <GeneralVariablesSection
              allTemplates={allTemplates}          
              globalVariables={project.global_variables.variables}
              templateVariables={templateVariables}
              propagationSettings={project?.variable_propagation_settings || {} as any}
              project={project}
              collapsed={collapsedGlobalSection}
              canEdit={canEditGeneralVariables()}
              onToggleCollapse={() => onToggleGlobalSectionCollapse()}
              onVariableChange={onVariableChange}
            />
        )}

        {/* Header Section */}
        <div className="mb-6 pb-4 border-b flex flex-col">
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

        
        
        {/* Category Tabs */}
        <Tabs defaultValue={activeCategory} className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 mb-8 w-full h-auto">
            {Object.values(DocumentCategory).map((category) => {
              const templateNames = project?.[`${category.toLowerCase()}_templates` as keyof Project] as string[] || [];
              const count = templateNames.length;
              
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  onClick={() => onTabChange(category)}
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
          {/* Add Document Button */}
          {!project.is_archived && (
            <div className="flex justify-end mb-6">
              <TemplateSelectorDialog
                category={activeCategory}
                onTemplateSelected={onTemplateSelected}
                onProjectTemplateSelected={onProjectTemplateSelected}
                existingTemplates={project?.[`${activeCategory.toLowerCase()}_templates` as keyof Project] as string[] || []}
                trigger={
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add {getCategoryDisplayName(activeCategory)} Document
                  </Button>
                }
              />
            </div>
          )}
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

                      {/* Category Variables Section */}
                      {project.category_variables?.[category]?.variables&& project.category_variables?.[category]?.variables.length > 0 && (
                        <CategoryVariablesSection
                          category={category}
                          categoryVariables={project.category_variables?.[category]?.variables || []}
                          categoryTemplates={Object.keys(project.template_variables?.[category] || {}).map((templateName) => allTemplates.find((t) => t.name === templateName) || null).filter((t) => t !== null) as DocumentTemplate[]}
                          templateVariables={project.template_variables || {}}
                          propagationSettings={project.variable_propagation_settings || {}}
                          globalVariables={project.global_variables?.variables || []}
                          collapsed={collapsedCategorySections[category] || false}
                          canEdit={canEditGeneralVariables()}
                          projectId={project.id}
                          onToggleCollapse={() => onToggleCategorySectionCollapse(category)}
                          onVariableChange={onVariableChange}
                          onPropagationChange={onPropagationChange}
                        />
                      )}

                      {/* Document Template Cards */}
                      {categoryTemplates
                        .filter(t => templateNames.includes(t.name))
                        .map((template) => (
                      <ErrorBoundary
                        key={template.name}
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
                          collapsed={collapsedTemplates[template.name]}
                          categoryVariableNames={project.category_variables?.[template.category]?.variables?.map((v: any) => v.name) || []}
                          globalVariableNames={project.global_variables?.variables?.map((v: any) => v.name) || []}
                          canEditVariables={canEditVariables(template.name)}
                          canCheckVariables={canCheckVariables(template.name)}
                          canEditGeneralVariables={canEditGeneralVariables()}
                          calculateProgress={calculateTemplateProgress}
                          getVariableType={getVariableType}
                          onToggleCollapse={() => onToggleTemplateCollapse(template.name)}
                          onVariableChange={onVariableChange}
                          onPropagationChange={onPropagationChange}
                          onSupervisorCheck={onSupervisorCheck}
                          onGenerateDocument={onGenerateDocument}
                          onTemplateRemove={onTemplateRemove}
                          onAssignmentUpdate={onAssignmentUpdate}
                          onUpgradeVersion={onUpgradeVersion}
                          onRefresh={onRefresh}
                          canAssignDocuments={currentUser?.role === 'ADMIN' || currentUser?.id === project.leader_id ||
                            currentUser?.id === project.document_assignments?.[template.name]?.supervisor_id}
                          canManageProject={currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.id === project.leader_id}
                        />
                      </ErrorBoundary>
                        ))}
                      
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
