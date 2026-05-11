"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingWrapper } from "@/components/ui/loading-wrapper";
import { ProjectOverview } from "./project-overview";
import { ProjectDocumentsSection } from "./project-documents-section";
import { MilestoneBar } from "./milestone-bar";
import { PhaseControlPanel } from "./phase-control-panel";
import {
  DocumentCategory,
  VariablePropagationScope,
  User,
  Project,
  DocumentTemplate,
  ProjectTemplate,
} from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import { useProjectPhases } from "@/hooks/use-project-phases";
import { useToast } from "@/components/ui/toast";

function isVariableValueFilled(docVariable: DocumentVariable): boolean {
  const value = docVariable.value;
  const type = docVariable.type;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return value !== undefined && value !== null;
  if (typeof value === "boolean") return value !== undefined && value !== null;
  switch (type) {
    case "dropdown":
    case "date":
    case "image":
    case "text":
      return false;
    case "checkbox":
      return value !== false;
    case "number":
      return false;
    default:
      return false;
  }
}

function assignedTemplateNames(project: Project): string[] {
  return [
    ...(project.architecture_templates || []),
    ...(project.constructions_templates || []),
    ...(project.fire_templates || []),
    ...(project.authority_processing_templates || []),
    ...(project.energy_templates || []),
    ...(project.hvac_templates || []),
    ...(project.execution_control_templates || []),
  ];
}

function computeOverallProgress(
  project: Project | null,
  allTemplates: DocumentTemplate[]
): number {
  if (!project || !allTemplates.length) return 0;
  let totalVariables = 0;
  let filledVariables = 0;
  Object.values(DocumentCategory).forEach((category) => {
    const categoryTemplates = project.template_variables?.[category] || {};
    Object.keys(categoryTemplates).forEach((templateName) => {
      const template = allTemplates.find((t) => t.name === templateName);
      if (template?.variables) {
        totalVariables += template.variables.length;
        template.variables.forEach((variable) => {
          const docVariable = project.template_variables?.[category]?.[
            templateName
          ]?.variables?.find((v) => v.name === variable.name);
          if (docVariable && isVariableValueFilled(docVariable)) {
            filledVariables++;
          }
        });
      }
    });
  });
  return totalVariables === 0
    ? 0
    : Math.round((filledVariables / totalVariables) * 100);
}

function computeCheckedProgress(project: Project | null): number {
  if (!project) return 0;
  const assigned = assignedTemplateNames(project);
  if (assigned.length === 0) return 0;
  const checked = assigned.filter(
    (name) => project.document_assignments?.[name]?.supervisor_checked
  ).length;
  return Math.round((checked / assigned.length) * 100);
}

function computeControlProgress(project: Project | null): number {
  if (!project) return 0;
  const assigned = assignedTemplateNames(project);
  if (assigned.length === 0) return 0;
  const ready = assigned.filter(
    (name) => project.document_assignments?.[name]?.ready_for_control
  ).length;
  return Math.round((ready / assigned.length) * 100);
}

function computeTemplateProgress(
  project: Project | null,
  templateName: string,
  template: DocumentTemplate
): number {
  if (!project || !template.variables.length) return 0;
  const total = template.variables.length;
  let filled = 0;
  template.variables.forEach((variable) => {
    const templateVariable = project.template_variables?.[
      template.category
    ]?.[templateName]?.variables?.find((v) => v.name === variable.name);
    if (templateVariable && isVariableValueFilled(templateVariable)) {
      filled++;
    }
  });
  return Math.round((filled / total) * 100);
}

interface ProjectDetailsContentProps {
  project: Project | null;
  currentUser: User | null;
  workers: any[];
  activeCategory: DocumentCategory;
  templates: DocumentTemplate[];
  allTemplates: DocumentTemplate[];
  templateVariables: any;
  collapsedTemplates: { [key: string]: boolean };
  collapsedGlobalSection: boolean;
  collapsedCategorySections: { [key: string]: boolean };
  loadingAction: string;
  loading: {
    project: boolean;
    workers: boolean;
    currentUser: boolean;
    templates: boolean;
    overall: boolean;
  };
  error: {
    project: string | null;
    workers: string | null;
    currentUser: string | null;
    templates: string | null;
    overall: string | null;
  };
  canEditVariables: (templateName: string) => boolean;
  canCheckVariables: (templateName: string) => boolean;
  canEditGeneralVariables: () => boolean;
  calculateTemplateProgress: (templateName: string, template: DocumentTemplate) => number;
  calculateOverallProgress: () => number;
  calculateCheckedProgress: () => number;
  getVariableType: (templateName: string, variableName: string) => string;
  getStatusColor: (status: any) => string;
  actions: {
    fetchProject: () => Promise<void>;
    fetchUsers: () => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
    fetchTemplatesForCategory: (category: DocumentCategory) => Promise<void>;
    setActiveCategory: (category: DocumentCategory) => void;
    refreshProject: () => Promise<void>;
    handleVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
    handlePropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
    updateGeneralVariables: () => Promise<void>;
    cleanupCrossCategoryVariables: () => Promise<void>;
    toggleTemplateCollapse: (templateName: string) => void;
    collapseAllTemplates: () => void;
    toggleGlobalSectionCollapse: () => void;
    toggleCategorySectionCollapse: (category: DocumentCategory) => void;
    setTemplateVariables: (variables: any) => void;
    handleDownloadProject: (phaseIds?: string[]) => Promise<void>;
    handleGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
    handleTemplateSelected: (template: DocumentTemplate) => void;
    handleProjectTemplateSelected: (projectTemplate: ProjectTemplate) => void;
    handleTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
    handleSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
    handleReadyForControl: (templateName: string, checked: boolean) => Promise<void>;
    handleAssignmentUpdate: (templateName: string, assignments: {
      assignee_id?: string;
      assignee_name?: string;
      supervisor_id?: string;
      supervisor_name?: string;
    }) => Promise<void>;
    handleUpgradeVersion?: (templateName: string) => Promise<void>;
    handleArchiveProject: () => Promise<void>;
    handleProjectDeleted: () => void;
    handleBackToDashboard: () => void;
    handleCleanupVariables: () => Promise<void>;
    handlePropagateGeneralValues: () => Promise<void>;
    handleDropdownOptionsChange?: (templateName: string, variableName: string, category: DocumentCategory, options: { displayText: string; value: string }[]) => Promise<void>;
  };
}

export function ProjectDetailsContent({
  project,
  currentUser,
  workers: _workers,
  activeCategory,
  templates,
  allTemplates,
  templateVariables,
  collapsedTemplates,
  collapsedGlobalSection,
  collapsedCategorySections,
  loadingAction,
  loading,
  error,
  canEditVariables,
  canCheckVariables,
  canEditGeneralVariables,
  calculateTemplateProgress: _legacyTemplateProgress,
  calculateOverallProgress: _legacyOverall,
  calculateCheckedProgress: _legacyChecked,
  getVariableType,
  getStatusColor: _getStatusColor,
  actions,
}: ProjectDetailsContentProps) {
  const { toast } = useToast();
  const permissions = useProjectPermissions(project, currentUser);
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = project?.id != null ? String(project.id) : null;
  const phasesState = useProjectPhases(projectId);
  const urlPhaseId = searchParams.get("phase");

  const activePhase = useMemo(() => {
    if (!phasesState.phases.length) return null;
    if (urlPhaseId) {
      const fromUrl = phasesState.phases.find((p) => p.id === urlPhaseId);
      if (fromUrl) return fromUrl;
    }
    return phasesState.currentPhase ?? phasesState.phases[0];
  }, [phasesState.phases, phasesState.currentPhase, urlPhaseId]);

  const activeDocuments = activePhase?.documents ?? [];

  const virtualProject = useMemo<Project | null>(() => {
    if (!project) return project;
    // While phases are loading, or before any phase row exists, keep the
    // `/api/projects/[id]` snapshot — otherwise we wipe `*_templates` and the UI
    // shows an empty project even though the row + phase documents are fine.
    if (phasesState.loading) return project;
    if (!phasesState.phases.length) return project;
    if (!activePhase) return project;

    // Current phase has no `project_phase_documents` rows but the project row
    // was populated (e.g. create-project sync). Show legacy fields as fallback.
    if (
      activeDocuments.length === 0 &&
      assignedTemplateNames(project).length > 0
    ) {
      return {
        ...project,
        deadline: activePhase.deadline ?? project.deadline,
      } as Project;
    }

    const templateVariablesMap: Record<string, Record<string, unknown>> = {};
    const propagationSettings: Record<string, Record<string, unknown>> = {};
    const assignments: Record<string, unknown> = {};
    const reviewStatus: Record<string, unknown> = {};
    const templatesByCategory: Record<string, string[]> = {};

    for (const doc of activeDocuments) {
      const cat = doc.category as DocumentCategory;
      if (!templateVariablesMap[cat]) templateVariablesMap[cat] = {};
      templateVariablesMap[cat][doc.template_name] = doc.variables ?? { variables: [] };

      if (!propagationSettings[cat]) propagationSettings[cat] = {};
      propagationSettings[cat][doc.template_name] = doc.propagation_settings ?? {};

      assignments[doc.template_name] = doc.assignments ?? {};
      reviewStatus[doc.template_name] = doc.review_status ?? {};

      if (!templatesByCategory[cat]) templatesByCategory[cat] = [];
      templatesByCategory[cat].push(doc.template_name);
    }

    const templateArrays: Record<string, string[]> = {};
    Object.values(DocumentCategory).forEach((cat) => {
      templateArrays[`${cat.toLowerCase()}_templates`] = templatesByCategory[cat] ?? [];
    });

    return {
      ...project,
      ...templateArrays,
      deadline: activePhase.deadline ?? project.deadline,
      template_variables: templateVariablesMap as Project["template_variables"],
      variable_propagation_settings: propagationSettings as Project["variable_propagation_settings"],
      document_assignments: assignments as Project["document_assignments"],
      document_review_status: reviewStatus as unknown,
    } as Project;
  }, [
    project,
    activePhase,
    activeDocuments,
    phasesState.loading,
    phasesState.phases.length,
  ]);

  const progressProject = virtualProject ?? project;

  const overallForView = useMemo(
    () => computeOverallProgress(progressProject, allTemplates),
    [progressProject, allTemplates]
  );
  const checkedForView = useMemo(
    () => computeCheckedProgress(progressProject),
    [progressProject]
  );
  const controlForView = useMemo(
    () => computeControlProgress(progressProject),
    [progressProject]
  );

  const phaseTemplateVariables = useMemo(() => {
    return (
      (virtualProject?.template_variables as typeof templateVariables) ??
      ({} as typeof templateVariables)
    );
  }, [virtualProject, templateVariables]);

  const calculateTemplateProgressScoped = useCallback(
    (templateName: string, template: DocumentTemplate) =>
      computeTemplateProgress(progressProject, templateName, template),
    [progressProject]
  );

  const findDocByTemplate = useCallback(
    (templateName: string, category?: DocumentCategory) =>
      activeDocuments.find(
        (d) =>
          d.template_name === templateName &&
          (category ? d.category === category : true)
      ) ?? null,
    [activeDocuments]
  );

  // Phase-scoped handlers
  const handleTemplateSelectedPhase = useCallback(
    async (template: DocumentTemplate) => {
      if (!activePhase) {
        toast({ title: "No active phase", description: "Select or create a phase before adding documents.", variant: "destructive" });
        return;
      }
      if (activeDocuments.some((d) => d.category === template.category && d.template_name === template.name)) {
        toast({ title: "Already added", description: `${template.name} is already in this phase.`, variant: "destructive" });
        return;
      }
      const seedVars = template.variables.map((v) => ({ name: v.name, type: v.type }));
      const seedProp: Record<string, unknown> = {};
      for (const v of template.variables) {
        const scopes: VariablePropagationScope[] = [VariablePropagationScope.LOCAL];
        const isGlobal = !!project?.global_variables?.variables?.find((g: DocumentVariable) => g.name === v.name);
        const isCategory = !!project?.category_variables?.[template.category]?.variables?.find((c: DocumentVariable) => c.name === v.name);
        if (isGlobal) scopes.push(VariablePropagationScope.GLOBAL);
        if (isCategory) scopes.push(VariablePropagationScope.CATEGORY);
        let currentScope: VariablePropagationScope = VariablePropagationScope.LOCAL;
        if (isGlobal) currentScope = VariablePropagationScope.GLOBAL;
        else if (isCategory) currentScope = VariablePropagationScope.CATEGORY;
        seedProp[v.name] = { possibleScopes: scopes, currentScope, isOverridden: false };
      }
      const added = await phasesState.addPhaseDocument(activePhase.id, {
        template_name: template.name,
        category: template.category,
        variables: { variables: seedVars },
        propagation_settings: seedProp,
      });
      if (added) {
        toast({ title: "Template added", description: `${template.name} added to ${activePhase.definition.name}.` });
      }
    },
    [activePhase, activeDocuments, project, phasesState, toast]
  );

  const handleProjectTemplateSelectedPhase = useCallback(
    async (projectTemplate: ProjectTemplate) => {
      if (!activePhase) {
        toast({ title: "No active phase", description: "Select or create a phase before adding a package.", variant: "destructive" });
        return;
      }
      if (!project) return;
      const templatesToAdd = allTemplates.filter(
        (t) => projectTemplate.templates.includes(t.name) && t.category === projectTemplate.category
      );
      const currentInPhase = new Set(
        activeDocuments.filter((d) => d.category === projectTemplate.category).map((d) => d.template_name)
      );
      const newTemplates = templatesToAdd.filter((t) => !currentInPhase.has(t.name));
      if (newTemplates.length === 0) {
        toast({ title: "Already Added", description: "All templates from this package are already in this phase." });
        return;
      }
      toast({ title: "Adding package", description: `Adding ${newTemplates.length} template(s) to ${activePhase.definition.name}…` });
      for (const template of newTemplates) {
        const seedVars = template.variables.map((v) => ({ name: v.name, type: v.type }));
        const seedProp: Record<string, unknown> = {};
        for (const v of template.variables) {
          const scopes: VariablePropagationScope[] = [VariablePropagationScope.LOCAL];
          const isGlobal = !!project?.global_variables?.variables?.find((g: DocumentVariable) => g.name === v.name);
          const isCategory = !!project?.category_variables?.[template.category]?.variables?.find((c: DocumentVariable) => c.name === v.name);
          if (isGlobal) scopes.push(VariablePropagationScope.GLOBAL);
          if (isCategory) scopes.push(VariablePropagationScope.CATEGORY);
          let currentScope: VariablePropagationScope = VariablePropagationScope.LOCAL;
          if (isGlobal) currentScope = VariablePropagationScope.GLOBAL;
          else if (isCategory) currentScope = VariablePropagationScope.CATEGORY;
          seedProp[v.name] = { possibleScopes: scopes, currentScope, isOverridden: false };
        }
        const added = await phasesState.addPhaseDocument(activePhase.id, {
          template_name: template.name,
          category: template.category,
          variables: { variables: seedVars },
          propagation_settings: seedProp,
        });
        if (!added) {
          toast({ title: "Package partially added", description: "Some templates could not be added. Try again.", variant: "destructive" });
          return;
        }
      }
      await phasesState.refresh();
      toast({ title: "Package added", description: `Added ${newTemplates.length} document(s) from "${projectTemplate.name}".` });
    },
    [activePhase, activeDocuments, project, allTemplates, phasesState, toast]
  );

  const handleTemplateRemovePhase = useCallback(
    async (templateName: string, category: DocumentCategory) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName, category);
      if (!doc) return;
      const ok = await phasesState.removePhaseDocument(activePhase.id, doc.id);
      if (ok) {
        toast({ title: "Template removed", description: `${templateName} removed from this phase.` });
      }
    },
    [activePhase, findDocByTemplate, phasesState, toast]
  );

  const variableDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingPatchRef = useRef<Record<string, { phaseId: string; docId: string; patch: Record<string, unknown> }>>({});
  const phasesStateRef = useRef(phasesState);
  phasesStateRef.current = phasesState;

  const handleVariableChangePhase = useCallback(
    async (templateName: string, variableName: string, value: unknown, category: DocumentCategory, _isGlobal: boolean, _isCategory: boolean) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName, category);
      if (!doc) return;
      const currentWrapper = (doc.variables ?? {}) as { variables?: DocumentVariable[] };
      const currentVars = currentWrapper.variables ?? [];
      let found = false;
      const nextVars = currentVars.map((v) => {
        if (v.name === variableName) { found = true; return { ...v, value } as DocumentVariable; }
        return v;
      });
      if (!found) nextVars.push({ name: variableName, value } as DocumentVariable);

      const patch = { variables: { ...currentWrapper, variables: nextVars } };

      phasesStateRef.current.patchPhaseDocument(activePhase.id, doc.id, patch, { localOnly: true });

      const debounceKey = `${doc.id}::${variableName}`;
      pendingPatchRef.current[debounceKey] = { phaseId: activePhase.id, docId: doc.id, patch };

      if (variableDebounceRef.current[debounceKey]) {
        clearTimeout(variableDebounceRef.current[debounceKey]);
      }
      variableDebounceRef.current[debounceKey] = setTimeout(() => {
        delete variableDebounceRef.current[debounceKey];
        const pending = pendingPatchRef.current[debounceKey];
        if (pending) {
          delete pendingPatchRef.current[debounceKey];
          phasesStateRef.current.patchPhaseDocument(pending.phaseId, pending.docId, pending.patch, { optimistic: false, skipResponseMerge: true });
        }
      }, 600);
    },
    [activePhase, findDocByTemplate]
  );

  const handleSupervisorCheckPhase = useCallback(
    async (templateName: string, checked: boolean) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName);
      if (!doc) return;
      await phasesState.patchPhaseDocument(activePhase.id, doc.id, {
        assignments: { ...(doc.assignments ?? {}), supervisor_checked: checked },
      });
    },
    [activePhase, findDocByTemplate, phasesState]
  );

  const handleReadyForControlPhase = useCallback(
    async (templateName: string, checked: boolean) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName);
      if (!doc) return;
      await phasesState.patchPhaseDocument(activePhase.id, doc.id, {
        assignments: { ...(doc.assignments ?? {}), ready_for_control: checked },
      });
    },
    [activePhase, findDocByTemplate, phasesState]
  );

  const handleAssignmentUpdatePhase = useCallback(
    async (templateName: string, incoming: { assignee_id?: string; assignee_name?: string; supervisor_id?: string; supervisor_name?: string }) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName);
      if (!doc) return;
      await phasesState.patchPhaseDocument(activePhase.id, doc.id, {
        assignments: { ...(doc.assignments ?? {}), ...incoming, assigned_at: new Date().toISOString() },
      });
    },
    [activePhase, findDocByTemplate, phasesState]
  );

  const handleDropdownOptionsChangePhase = useCallback(
    async (templateName: string, variableName: string, category: DocumentCategory, options: { displayText: string; value: string }[]) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName, category);
      if (!doc) return;
      const currentWrapper = (doc.variables ?? {}) as { variables?: DocumentVariable[] };
      const currentVars = [...(currentWrapper.variables ?? [])];
      const idx = currentVars.findIndex((v) => v.name === variableName);
      const templateMeta = allTemplates.find((t) => t.name === templateName);
      const originalVar = templateMeta?.variables.find((v) => v.name === variableName);
      if (idx >= 0) {
        currentVars[idx] = { ...currentVars[idx], dropdownOptions: options } as DocumentVariable;
      } else {
        currentVars.push({ name: variableName, type: originalVar?.type || "dropdown", value: "", dropdownOptions: options } as DocumentVariable);
      }
      await phasesState.patchPhaseDocument(activePhase.id, doc.id, {
        variables: { ...currentWrapper, variables: currentVars },
      });
      toast({ title: "Options updated", description: `Dropdown options for "${variableName}" have been saved.` });
    },
    [activePhase, findDocByTemplate, phasesState, allTemplates, toast]
  );

  const handleGenerateDocumentPhase = useCallback(
    async (templateName: string, category: DocumentCategory) => {
      if (!project) return;
      const doc = findDocByTemplate(templateName, category);
      if (!doc) {
        toast({ title: "Template not in this phase", description: `${templateName} is not attached to the active phase.`, variant: "destructive" });
        return;
      }
      const localVars = ((doc.variables as { variables?: DocumentVariable[] } | null | undefined)?.variables ?? []);
      const globalVars = (project.global_variables?.variables ?? []) as DocumentVariable[];
      const categoryVars = ((project.category_variables as Record<string, { variables?: DocumentVariable[] }> | undefined)?.[category]?.variables ?? []) as DocumentVariable[];
      const propagation = (doc.propagation_settings ?? {}) as Record<string, { currentScope: VariablePropagationScope }>;
      const variablesObject: Record<string, unknown> = {};
      for (const v of localVars) {
        const scope = propagation[v.name]?.currentScope ?? VariablePropagationScope.LOCAL;
        let source: DocumentVariable | undefined = v;
        if (scope === VariablePropagationScope.GLOBAL) source = globalVars.find((g) => g.name === v.name) ?? v;
        else if (scope === VariablePropagationScope.CATEGORY) source = categoryVars.find((g) => g.name === v.name) ?? v;
        const typed = source as unknown as { type?: string; value?: unknown };
        variablesObject[v.name] = typed?.type === "text" ? (typed.value ?? "") : (source as unknown);
      }
      try {
        const response = await fetch(`/api/projects/${project.id}/generate-document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateName, category, variables: variablesObject }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to generate document");
        }
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition");
        const match = contentDisposition?.match(/filename="(.+)"/);
        const filename = match ? match[1] : `${templateName}.docx`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: "Document Generated", description: `${templateName} has been generated and downloaded.` });
      } catch (err) {
        toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      }
    },
    [project, findDocByTemplate, toast]
  );

  const handlePropagationChangePhase = useCallback(
    async (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => {
      if (!activePhase) return;
      const doc = findDocByTemplate(templateName, templateCategory);
      if (!doc) return;
      const currentSettings = (doc.propagation_settings ?? {}) as Record<string, { possibleScopes: VariablePropagationScope[]; currentScope: VariablePropagationScope; isOverridden: boolean }>;
      const current = currentSettings[variableName];
      if (!current) return;
      const nextScope: VariablePropagationScope = useLocal
        ? VariablePropagationScope.LOCAL
        : useCategory
          ? VariablePropagationScope.CATEGORY
          : VariablePropagationScope.GLOBAL;
      await phasesState.patchPhaseDocument(activePhase.id, doc.id, {
        propagation_settings: { ...currentSettings, [variableName]: { ...current, currentScope: nextScope, isOverridden: true } },
      });
    },
    [activePhase, findDocByTemplate, phasesState]
  );

  // Remove invalid phase ID from URL
  useEffect(() => {
    if (!urlPhaseId || !phasesState.phases.length) return;
    const exists = phasesState.phases.some((p) => p.id === urlPhaseId);
    if (!exists) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("phase");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }
  }, [urlPhaseId, phasesState.phases, router, searchParams]);

  const handleSelectPhase = useCallback(
    (phaseId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("phase", phaseId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const canManagePhases = permissions.canManageProject();

  return (
    <LoadingWrapper
      loading={loading.overall || !project}
      error={error.overall}
      onRetry={actions.refreshProject}
      variant="page"
      loadingMessage="Loading project details..."
      errorTitle="Failed to load project"
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={actions.handleBackToDashboard}
          disabled={loadingAction !== "none"}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold">{project?.name}</h1>

        {/* Phase Milestone Bar + Control Panel */}
        {projectId && !phasesState.loading && !phasesState.error && (
          <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: "#F0E6E6" }}>
            <MilestoneBar
              slots={phasesState.slots}
              activePhaseId={activePhase?.id ?? null}
              onSelectPhase={handleSelectPhase}
              canManagePhases={canManagePhases}
              onAddPhase={async (definitionId, deadline) => {
                const added = await phasesState.addPhase({
                  phase_definition_id: definitionId,
                  deadline,
                });
                if (added) handleSelectPhase(added.id);
              }}
            />
            <PhaseControlPanel
              activePhase={activePhase}
              currentPhase={phasesState.currentPhase}
              hold={phasesState.hold}
              canManage={canManagePhases}
              onUpdatePhase={phasesState.updatePhase}
              onSetHold={phasesState.setHold}
            />
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* Left Sidebar - Project Overview */}
          <div className="w-64 flex-shrink-0">
            <ProjectOverview
              project={virtualProject ?? project}
              currentUser={currentUser}
              loadingAction={loadingAction}
              overallProgress={overallForView}
              checkedProgress={checkedForView}
              controlProgress={controlForView}
              canManageProject={permissions.canManageProject()}
              canArchiveProject={permissions.canArchiveProject()}
              canDeleteProject={permissions.canDeleteProject()}
              canUpdateProject={permissions.canUpdateProject()}
              canAssignWorkers={permissions.canAssignWorkers()}
              canDownloadProject={permissions.canDownloadProject()}
              phases={phasesState.phases}
              onBackToDashboard={actions.handleBackToDashboard}
              onDownloadProject={actions.handleDownloadProject}
              onArchiveProject={actions.handleArchiveProject}
              onProjectDeleted={actions.handleProjectDeleted}
              onProjectUpdated={actions.refreshProject}
              hold={phasesState.hold}
              onSetHold={phasesState.setHold}
              showPhaseHoldControls={!!projectId && !phasesState.loading && !phasesState.error}
            />
          </div>

          {/* Right Content - Project Documents Section */}
          <div className="flex-1 min-w-0">
            <ProjectDocumentsSection
              project={virtualProject ?? project}
              currentUser={currentUser}
              activeCategory={activeCategory}
              templates={templates}
              allTemplates={allTemplates}
              collapsedTemplates={collapsedTemplates}
              collapsedGlobalSection={collapsedGlobalSection}
              collapsedCategorySections={collapsedCategorySections}
              templateVariables={phaseTemplateVariables}
              loading={loading}
              error={error}
              isLocked={activePhase?.is_locked ?? false}
              canEditVariables={canEditVariables}
              canCheckVariables={canCheckVariables}
              canEditGeneralVariables={canEditGeneralVariables}
              calculateTemplateProgress={calculateTemplateProgressScoped}
              getVariableType={getVariableType}
              onTabChange={actions.setActiveCategory}
              onRefresh={async () => {
                await actions.refreshProject();
                await phasesState.refresh();
              }}
              onTemplateSelected={handleTemplateSelectedPhase}
              onProjectTemplateSelected={handleProjectTemplateSelectedPhase}
              onTemplateRemove={handleTemplateRemovePhase}
              onVariableChange={handleVariableChangePhase}
              onPropagationChange={handlePropagationChangePhase}
              onSupervisorCheck={handleSupervisorCheckPhase}
              onReadyForControl={handleReadyForControlPhase}
              onGenerateDocument={handleGenerateDocumentPhase}
              onAssignmentUpdate={handleAssignmentUpdatePhase}
              onUpgradeVersion={actions.handleUpgradeVersion}
              onToggleTemplateCollapse={actions.toggleTemplateCollapse}
              onCollapseAllTemplates={actions.collapseAllTemplates}
              onToggleGlobalSectionCollapse={actions.toggleGlobalSectionCollapse}
              onToggleCategorySectionCollapse={actions.toggleCategorySectionCollapse}
              onDropdownOptionsChange={handleDropdownOptionsChangePhase}
            />
          </div>
        </div>
      </div>
    </LoadingWrapper>
  );
}
