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
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateSelectorDialog } from "@/components/ui/template-selector-dialog";
import { RefreshCw, Plus, LayoutGrid, List, ArrowUpDown, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DocumentCategory, getCategoryDisplayName, getCategoryTranslationKey, VariablePropagationScope } from "@/lib/types/types";
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
  const [sortMode, setSortMode] = useState<"name-asc" | "name-desc" | "completion-high" | "completion-low">("name-asc");
  const t = useTranslations("projectDetails");
  const tc = useTranslations("common");

  if (!project) {
    return null;
  }

  // Compute filtered global variables: union of variables with GLOBAL scope
  // in any template's propagation_settings across all categories.
  const filteredGlobalVariables = (() => {
    const allPropSettings = project?.variable_propagation_settings || {};
    const globalVarNames = new Set<string>();

    for (const catSettings of Object.values(allPropSettings)) {
      if (!catSettings || typeof catSettings !== 'object') continue;
      for (const templateSettings of Object.values(catSettings as Record<string, any>)) {
        if (!templateSettings || typeof templateSettings !== 'object') continue;
        for (const [varName, setting] of Object.entries(templateSettings as Record<string, any>)) {
          if (setting?.currentScope === VariablePropagationScope.GLOBAL) {
            globalVarNames.add(varName);
          }
        }
      }
    }

    const stored = project?.global_variables?.variables || [];
    if (globalVarNames.size === 0) return stored;

    const result = new Map<string, DocumentVariable>();
    for (const v of stored) result.set(v.name, v);
    // Also pick up globals that may have been mis-filed into category_variables
    for (const cat of Object.values(DocumentCategory)) {
      for (const v of project?.category_variables?.[cat]?.variables || []) {
        if (globalVarNames.has(v.name) && !result.has(v.name)) {
          result.set(v.name, v);
        }
      }
    }
    return Array.from(result.values()).filter(v => globalVarNames.has(v.name));
  })();

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
                    {tc(getCategoryTranslationKey(category))}
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
                {t("categoryDocuments", { category: tc(getCategoryTranslationKey(activeCategory)) })}
              </h1>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t("refresh")}
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {Object.values(DocumentCategory).map((category) => {
            const categoryTemplates = allTemplates.filter(t => t.category === category);
            const templateNames = project?.[`${category.toLowerCase()}_templates` as keyof Project] as string[] || [];
            const filteredTemplates = categoryTemplates.filter(t => templateNames.includes(t.name));
            const sortedCategoryTemplates = [...filteredTemplates].sort((a, b) => {
              if (sortMode === "name-asc") return a.name.localeCompare(b.name);
              if (sortMode === "name-desc") return b.name.localeCompare(a.name);
              const pa = calculateTemplateProgress(a.name, a);
              const pb = calculateTemplateProgress(b.name, b);
              if (sortMode === "completion-high") return pb - pa;
              if (sortMode === "completion-low") return pa - pb;
              return 0;
            });
            // ✅ D2 X2'' (2026-05-13): project.category_variables는 virtualProject가
            // phase-aware로 합성한 결과(activePhase.category_variables[category]가 우선,
            // legacy fallback 포함). 본 컴포넌트는 그 결과를 그대로 사용.
            // 표시 목록은 propagation_settings 기준으로 filter — 어느 도큐먼트라도
            // currentScope === CATEGORY인 변수만 표시 (정책 D2 유지).
            const storedCategoryVariables = project?.category_variables?.[category]?.variables?.filter((variable: any) => {
              const categorySettings = project?.variable_propagation_settings?.[category] || {};
              if (!categorySettings) return false;
              return Object.values(categorySettings).some((templateSettings: any) =>
                templateSettings?.[variable.name]?.currentScope === VariablePropagationScope.CATEGORY
              );
            }) || [];
            // ✅ Issue B fix — SSOT raw bucket을 child에 전달하여 currentValue 직접 조회.
            const categorySSOTVariables = (project?.category_variables?.[category]?.variables ?? []) as DocumentVariable[];

            return (
              <TabsContent key={category} value={category} className="w-full">
                <div className="space-y-6">
                  {/* Loading State */}
                  {loading?.templates ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{t("loadingTemplatesEllipsis")}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Variables Section - Global and Category in one box */}
                      <div className="bg-muted rounded-lg p-4 space-y-4">
                        {/* Global Variables */}
                        <GeneralVariablesSection
                          allTemplates={allTemplates}          
                          globalVariables={filteredGlobalVariables}
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
                          categoryVariables={storedCategoryVariables}
                          categoryTemplates={categoryTemplates.filter(t => templateNames.includes(t.name))}
                          templateVariables={project.template_variables || {}}
                          propagationSettings={project.variable_propagation_settings || {}}
                          globalVariables={project.global_variables?.variables || []}
                          categorySSOTVariables={categorySSOTVariables}
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
                              title={tc("cardView")}
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={viewMode === "list" ? "default" : "ghost"}
                              size="sm"
                              className="h-8 w-8 p-0 rounded-l-none"
                              onClick={() => setViewMode("list")}
                              title={tc("listView")}
                            >
                              <List className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <ArrowUpDown className="h-4 w-4" />
                                  {tc("sort")}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {([
                                  { value: "name-asc", label: tc("nameAZ") },
                                  { value: "name-desc", label: tc("nameZA") },
                                  { value: "completion-high", label: tc("completionHigh") },
                                  { value: "completion-low", label: tc("completionLow") },
                                ] as const).map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    onClick={() => setSortMode(opt.value)}
                                    className={sortMode === opt.value ? "bg-accent" : ""}
                                  >
                                    <Check className={`h-4 w-4 mr-2 ${sortMode === opt.value ? "opacity-100" : "opacity-0"}`} />
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {!project.is_archived && (
                              <TemplateSelectorDialog
                                category={category}
                                onTemplateSelected={onTemplateSelected}
                                onProjectTemplateSelected={onProjectTemplateSelected}
                                existingTemplates={project?.[`${category.toLowerCase()}_templates` as keyof Project] as string[] || []}
                                trigger={
                                  <Button size="sm" className="gap-2" disabled={isLocked}>
                                    <Plus className="h-4 w-4" />
                                    {t("addCategoryDocument", { category: tc(getCategoryTranslationKey(category)) })}
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </div>

                        {/* List View */}
                        {viewMode === "list" ? (
                          <DocumentListView
                            templates={sortedCategoryTemplates}
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
                            onAssignmentUpdate={onAssignmentUpdate}
                            onUpgradeVersion={onUpgradeVersion}
                            onRefresh={onRefresh}
                            canManageProject={isLocked ? false : (currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.id === project.leader_id)}
                            canAssignDocuments={isLocked ? false : (currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.id === project.leader_id)}
                            onDropdownOptionsChange={onDropdownOptionsChange}
                          />
                        ) : (
                          /* Card View (Grid) — responsive: 2 / 3 / 4 / 5 cols by viewport */
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {sortedCategoryTemplates
                              .map((template) => {
                                const isExpanded = !(collapsedTemplates[template.name] ?? true);
                                return (
                                  <div
                                    key={template.name}
                                    className={isExpanded ? "col-span-full w-full" : "mx-auto w-full max-w-[220px]"}
                                  >
                                    <ErrorBoundary
                                      fallback={
                                        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                          <p className="text-destructive text-sm">
                            {t("errorLoadingTemplate", { name: template.name })}
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
                            {t("noDocumentsYet", { category })}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            {t("clickAddToStart", { category })}
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
