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

// ✅ Issue 9 fix — D2 X2 정책: GLOBAL/CATEGORY scope 변수는 SSOT(project.global/category_variables)에서 lookup.
// doc.variables(local)에는 GLOBAL/CATEGORY entry가 없을 수 있으므로 propagation scope에 따라 source 분기.
function lookupVariableForProgress(
  project: Project,
  category: DocumentCategory,
  templateName: string,
  variableName: string
): DocumentVariable | undefined {
  const propagation = (project.variable_propagation_settings?.[category]?.[templateName] ?? {}) as Record<
    string,
    { currentScope?: string }
  >;
  const scope = propagation[variableName]?.currentScope ?? "LOCAL";
  const localVars = (project.template_variables?.[category]?.[templateName]?.variables ?? []) as DocumentVariable[];
  if (scope === "GLOBAL") {
    const globals = (project.global_variables?.variables ?? []) as DocumentVariable[];
    return globals.find((g) => g.name === variableName) ?? localVars.find((l) => l.name === variableName);
  }
  if (scope === "CATEGORY") {
    const cats = (project.category_variables?.[category]?.variables ?? []) as DocumentVariable[];
    return cats.find((c) => c.name === variableName) ?? localVars.find((l) => l.name === variableName);
  }
  return localVars.find((l) => l.name === variableName);
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
          const docVariable = lookupVariableForProgress(project, category, templateName, variable.name);
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
    // ✅ Issue 9 fix — scope-aware lookup (GLOBAL/CATEGORY는 SSOT 우선)
    const templateVariable = lookupVariableForProgress(project, template.category, templateName, variable.name);
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
    // silent=true → loading state를 건드리지 않고 백그라운드로 fetch (Issue 17 follow-up: 인풋 반응성 개선)
    refreshProject: (silent?: boolean) => Promise<void>;
    // 부모 project state 옵티미스틱 업데이트용 (debounce flush 시 즉시 SSOT 반영)
    updateProjectState?: (updater: (prev: any) => any) => void;
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

    // ✅ Issue 11 fix — D1 X1 정책: project_phase_documents가 SSOT.
    // 옛 fallback은 모든 빈 phase에 legacy template list를 그대로 보여줘서
    // phase 5 같은 비어 있는 phase에도 다른 phase의 문서들이 ghost로 보였음.
    // → 첫 phase(legacy 옛 프로젝트 호환)에서만 fallback 유지, 그 외 phase는 진짜 빈 상태로 표시.
    // ✅ D2 X2'' (2026-05-13) — phase-scoped category SSOT 머지 helper.
    // 정책 핵심:
    //  - 변수 LIST (어떤 변수가 category scope인지) = project ∪ phase 의 union
    //    → phase에 한 변수만 입력해도 다른 변수가 사라지지 않음 (mask 방지)
    //  - 변수 VALUE = phase 우선; project entry는 metadata만 유지하고 value는 비움
    //    → 다른 phase의 옛 값이 현재 phase에 leak되지 않음 (D11 phase 격리)
    //  - 마이그레이션 미적용 환경(phaseLevel === null) = legacy fallback (project bucket 그대로)
    //
    // ⚠ 이전 동작(phase에 1개 entry라도 있으면 phase 통째로 SSOT)은 다른 변수가
    // 사라지는 문제 발생 → name 기준 union으로 변경.
    const mergePhaseCategoryVariables = (): Project["category_variables"] => {
      const phaseLevelRaw = activePhase.category_variables as unknown;
      // 마이그레이션 적용 후엔 phase row가 항상 객체(`{}` default). undefined면 마이그레이션 전.
      const isMigrated = phaseLevelRaw !== undefined && phaseLevelRaw !== null;
      const phaseLevel = (phaseLevelRaw ?? {}) as Record<string, { variables?: DocumentVariable[] }>;
      const projectLevel = (project.category_variables ?? {}) as Record<string, { variables?: DocumentVariable[] }>;
      const out: Record<string, { variables: DocumentVariable[] }> = {};
      for (const cat of Object.values(DocumentCategory)) {
        const phaseBucket = (phaseLevel?.[cat]?.variables ?? []) as DocumentVariable[];
        const projectBucket = (projectLevel?.[cat]?.variables ?? []) as DocumentVariable[];
        if (!isMigrated) {
          // 마이그레이션 전 — legacy: project bucket 그대로 (모든 phase 공유 표시)
          out[cat] = { variables: projectBucket };
          continue;
        }
        // name 기준 union — project를 base(metadata만, value는 비움), phase가 덮어씀.
        // → phase에 entry 있는 변수는 그 phase의 value 표시
        // → phase에 entry 없는 변수는 project entry의 type/dropdownOptions 등 metadata만
        //   유지하고 value는 빈 input ('') — 다른 phase의 옛 값 leak 방지
        const byName = new Map<string, DocumentVariable>();
        for (const v of projectBucket) {
          byName.set(v.name, { ...v, value: '' } as DocumentVariable);
        }
        for (const v of phaseBucket) {
          byName.set(v.name, v);
        }
        out[cat] = { variables: Array.from(byName.values()) };
      }
      return out as Project["category_variables"];
    };

    if (activeDocuments.length === 0) {
      const isFirstPhase = phasesState.phases[0]?.id === activePhase.id;
      const hasLegacyTemplates = assignedTemplateNames(project).length > 0;
      if (isFirstPhase && hasLegacyTemplates) {
        // 옛 프로젝트(legacy *_templates만 채워진 케이스) 안전망 — 마이그레이션 후 dead code.
        // Issue 15 (D3 옵션 B): project.start_date is the project start date and
        // is no longer overwritten with the active phase deadline. Surfaces that
        // need the active phase deadline read it from `phases.find(p => p.is_current)`.
        return {
          ...project,
          category_variables: mergePhaseCategoryVariables(),
        } as Project;
      }
      // 정상 빈 phase — *_templates / template_variables 모두 비워 empty state 렌더링 유도.
      const emptyTemplateArrays: Record<string, string[]> = {};
      Object.values(DocumentCategory).forEach((cat) => {
        emptyTemplateArrays[`${cat.toLowerCase()}_templates`] = [];
      });
      return {
        ...project,
        ...emptyTemplateArrays,
        template_variables: {} as Project["template_variables"],
        variable_propagation_settings: {} as Project["variable_propagation_settings"],
        document_assignments: {} as Project["document_assignments"],
        document_review_status: {} as unknown,
        category_variables: mergePhaseCategoryVariables(),
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
      // Issue 15: do not overwrite project.start_date with the phase deadline.
      template_variables: templateVariablesMap as Project["template_variables"],
      variable_propagation_settings: propagationSettings as Project["variable_propagation_settings"],
      document_assignments: assignments as Project["document_assignments"],
      document_review_status: reviewStatus as unknown,
      category_variables: mergePhaseCategoryVariables(),
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
  // ✅ D2 X2'' (2026-05-13) — activePhase ref (flush 콜백 stale closure 방지)
  const activePhaseRef = useRef(activePhase);
  activePhaseRef.current = activePhase;

  // ✅ Issue 12/13/14 fix — D2 X2 정책 (project.global_variables = SSOT)
  // ✅ D2 X2'' (2026-05-13) — Category SSOT는 phase-level (project_phases.category_variables)로 변경
  // - GLOBAL: project.global_variables (project-level, 모든 phase 공유)
  // - CATEGORY: project_phases[activePhase.id].category_variables (phase-level, 같은 phase 내만 공유)
  // - LOCAL: doc.variables
  // doc.variables의 GLOBAL/CATEGORY entry는 derived view로 취급 (생성/조회 시 SSOT 우선).
  // race condition 방지를 위해 pending changes ref + 통합 디바운스 패턴 사용.
  const projectRef = useRef(project);
  projectRef.current = project;
  const pendingGlobalChangesRef = useRef<Record<string, unknown>>({});
  const pendingCategoryChangesRef = useRef<Record<string, Record<string, unknown>>>({});
  const globalDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categoryDebounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const allTemplatesRef = useRef(allTemplates);
  allTemplatesRef.current = allTemplates;

  const resolveVariableType = useCallback((variableName: string): string => {
    for (const tmpl of allTemplatesRef.current) {
      const found = tmpl.variables.find((v) => v.name === variableName);
      if (found?.type) return found.type;
    }
    return "text";
  }, []);

  // ✅ Issue 17 follow-up — 인풋 반응성 개선 (한 글자마다 spinner 뜨는 회귀 fix)
  // 1) 디바운스 만료 즉시 부모 project state에 옵티미스틱 set → 즉각 SSOT 반영
  // 2) PATCH 후 silent refresh (loading state 안 set, spinner 안 뜸)
  // 3) 디바운스는 800ms로 약간 완화 (PATCH 호출 빈도 ↓)
  const flushGlobalChanges = useCallback(async () => {
    const changes = pendingGlobalChangesRef.current;
    pendingGlobalChangesRef.current = {};
    const latestProject = projectRef.current;
    if (!latestProject || Object.keys(changes).length === 0) return;
    const globalWrapper = (latestProject.global_variables ?? { variables: [] }) as { variables?: DocumentVariable[] };
    const nextGlobal = [...(globalWrapper.variables ?? [])];
    for (const [name, val] of Object.entries(changes)) {
      const idx = nextGlobal.findIndex((v) => v.name === name);
      if (idx >= 0) {
        nextGlobal[idx] = { ...nextGlobal[idx], value: val } as DocumentVariable;
      } else {
        nextGlobal.push({ name, type: resolveVariableType(name), value: val } as DocumentVariable);
      }
    }
    const nextGlobalWrapper = { ...globalWrapper, variables: nextGlobal };
    // (1) 옵티미스틱 — 다른 phase 이동 / derived view(generalValue, donut) 즉시 반영
    if (actions.updateProjectState) {
      actions.updateProjectState((prev) => ({
        ...prev,
        project: prev.project ? { ...prev.project, global_variables: nextGlobalWrapper } : prev.project,
      }));
    }
    const patch = { global_variables: nextGlobalWrapper };
    try {
      const res = await fetch(`/api/projects/${latestProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update global variables");
      }
      // (2) silent refresh — spinner 안 뜸. 백그라운드로 server truth 반영.
      await actions.refreshProject(true);
    } catch (err) {
      toast({ title: "Global variable save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      // 실패 시 옵티미스틱 롤백을 위해 정상 refresh
      await actions.refreshProject(false);
    }
  }, [actions, toast, resolveVariableType]);

  // ✅ D2 X2'' (2026-05-13) — Category SSOT를 phase-level로 변경.
  // 저장: project_phases[activePhase.id].category_variables[category].variables
  // (이전: project.category_variables[category].variables)
  // - phase 변경 시 독립
  // - 같은 phase 내 다른 도큐먼트끼리만 공유
  // - silent PATCH(=phasesState.patchPhaseCategoryVariables) 사용 — typing UX 보호
  const flushCategoryChanges = useCallback(async (category: DocumentCategory) => {
    const changes = pendingCategoryChangesRef.current[category];
    delete pendingCategoryChangesRef.current[category];
    if (!changes || Object.keys(changes).length === 0) return;
    const phase = activePhaseRef.current;
    if (!phase) return;
    const categoryWrapperAll = ((phase.category_variables as unknown) ?? {}) as Record<string, { variables?: DocumentVariable[] }>;
    const categoryWrapper = (categoryWrapperAll[category] ?? { variables: [] }) as { variables?: DocumentVariable[] };
    const nextCategory = [...(categoryWrapper.variables ?? [])];
    for (const [name, val] of Object.entries(changes)) {
      const idx = nextCategory.findIndex((v) => v.name === name);
      if (idx >= 0) {
        nextCategory[idx] = { ...nextCategory[idx], value: val } as DocumentVariable;
      } else {
        nextCategory.push({ name, type: resolveVariableType(name), value: val } as DocumentVariable);
      }
    }
    const nextCategoryAll = {
      ...categoryWrapperAll,
      [category]: { ...categoryWrapper, variables: nextCategory },
    } as Record<string, { variables: unknown[] }>;
    await phasesStateRef.current.patchPhaseCategoryVariables(phase.id, nextCategoryAll);
  }, [resolveVariableType]);

  const handleVariableChangePhase = useCallback(
    async (templateName: string, variableName: string, value: unknown, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => {
      // ✅ Issue 12 fix — GLOBAL: SSOT(project.global_variables)에 통합 PATCH
      // 디바운스 800ms — 빠른 typing 시 PATCH 호출 빈도 감소
      // EnhancedVariableInput이 fully controlled(value={variable.value})이므로
      // 부모 state를 즉시 동기해야 사용자 typing이 lost되지 않음 → 옵티미스틱 setState는 onChange 시점에 즉시.
      if (isGlobal) {
        // (1) 즉시 옵티미스틱 — input controlled state 동기 (typing lag 방지)
        if (actions.updateProjectState) {
          actions.updateProjectState((prev: any) => {
            if (!prev.project) return prev;
            const globalWrapper = prev.project.global_variables ?? { variables: [] };
            const nextGlobal = [...(globalWrapper.variables ?? [])];
            const idx = nextGlobal.findIndex((v: DocumentVariable) => v.name === variableName);
            if (idx >= 0) {
              nextGlobal[idx] = { ...nextGlobal[idx], value } as DocumentVariable;
            } else {
              nextGlobal.push({ name: variableName, type: resolveVariableType(variableName), value } as DocumentVariable);
            }
            return {
              ...prev,
              project: {
                ...prev.project,
                global_variables: { ...globalWrapper, variables: nextGlobal },
              },
            };
          });
        }
        // (2) PATCH는 디바운스
        pendingGlobalChangesRef.current[variableName] = value;
        if (globalDebounceTimerRef.current) clearTimeout(globalDebounceTimerRef.current);
        globalDebounceTimerRef.current = setTimeout(() => {
          globalDebounceTimerRef.current = null;
          void flushGlobalChanges();
        }, 800);
        return;
      }

      // ✅ D2 X2'' (2026-05-13) — CATEGORY: phase-scoped SSOT
      // 저장: project_phases[activePhase.id].category_variables[category].variables
      if (isCategory) {
        const phase = activePhaseRef.current;
        if (!phase) return;
        // (1) 즉시 옵티미스틱 — phase row의 category_variables를 머지
        const categoryWrapperAll = ((phase.category_variables as unknown) ?? {}) as Record<string, { variables?: DocumentVariable[] }>;
        const categoryWrapper = categoryWrapperAll[category] ?? { variables: [] };
        const nextCategory = [...(categoryWrapper.variables ?? [])];
        const idx = nextCategory.findIndex((v: DocumentVariable) => v.name === variableName);
        if (idx >= 0) {
          nextCategory[idx] = { ...nextCategory[idx], value } as DocumentVariable;
        } else {
          nextCategory.push({ name: variableName, type: resolveVariableType(variableName), value } as DocumentVariable);
        }
        const optimisticAll = {
          ...categoryWrapperAll,
          [category]: { ...categoryWrapper, variables: nextCategory },
        } as Record<string, { variables: unknown[] }>;
        // (1) 옵티미스틱: hook setData만 즉시 머지 (PATCH 미전송 — 디바운스로 분리)
        void phasesStateRef.current.patchPhaseCategoryVariables(phase.id, optimisticAll, { optimisticOnly: true });
        // (2) pending에 누적 → 디바운스 후 실제 PATCH
        pendingCategoryChangesRef.current[category] = {
          ...(pendingCategoryChangesRef.current[category] ?? {}),
          [variableName]: value,
        };
        if (categoryDebounceTimersRef.current[category]) clearTimeout(categoryDebounceTimersRef.current[category]);
        categoryDebounceTimersRef.current[category] = setTimeout(() => {
          delete categoryDebounceTimersRef.current[category];
          void flushCategoryChanges(category);
        }, 800);
        return;
      }

      // LOCAL scope — 기존 동작 (active phase 내 단일 doc.variables patch)
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
    [activePhase, findDocByTemplate, flushGlobalChanges, flushCategoryChanges, actions, resolveVariableType]
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
      // ✅ Issue 13 fix — template definition을 iterate 기준으로 사용 (D2 X2 정책)
      // doc.variables는 derived view이므로 GLOBAL/CATEGORY scope의 entry가 비어있을 수 있음.
      // 변수 정의(template.variables)를 base로 하고 scope에 따라 SSOT(global/category) 우선 조회,
      // SSOT 미스 시에만 local entry로 fallback.
      const templateMeta = allTemplates.find((t) => t.name === templateName && t.category === category);
      if (!templateMeta) {
        toast({ title: "Template metadata missing", description: `${templateName} definition not found.`, variant: "destructive" });
        return;
      }
      const localVars = ((doc.variables as { variables?: DocumentVariable[] } | null | undefined)?.variables ?? []);
      const globalVars = (project.global_variables?.variables ?? []) as DocumentVariable[];
      // ✅ D2 X2'' (2026-05-13) — Category SSOT는 phase-level. activePhase 우선, legacy fallback
      const phaseCategoryVars = ((activePhase?.category_variables as Record<string, { variables?: DocumentVariable[] }> | undefined)?.[category]?.variables ?? []) as DocumentVariable[];
      const projectCategoryVars = ((project.category_variables as Record<string, { variables?: DocumentVariable[] }> | undefined)?.[category]?.variables ?? []) as DocumentVariable[];
      const categoryVars: DocumentVariable[] = phaseCategoryVars.length > 0 ? phaseCategoryVars : projectCategoryVars;
      const propagation = (doc.propagation_settings ?? {}) as Record<string, { currentScope: VariablePropagationScope }>;
      const variablesObject: Record<string, unknown> = {};
      for (const tmplVar of templateMeta.variables) {
        const name = tmplVar.name;
        const scope = propagation[name]?.currentScope ?? VariablePropagationScope.LOCAL;
        let source: DocumentVariable | undefined;
        if (scope === VariablePropagationScope.GLOBAL) {
          source = globalVars.find((g) => g.name === name) ?? localVars.find((l) => l.name === name);
        } else if (scope === VariablePropagationScope.CATEGORY) {
          source = categoryVars.find((c) => c.name === name) ?? localVars.find((l) => l.name === name);
        } else {
          source = localVars.find((l) => l.name === name);
        }
        if (!source) continue;
        const sourceType = (source as unknown as { type?: string }).type;
        const sourceValue = (source as unknown as { value?: unknown }).value;
        const isTextType = sourceType === "text" || tmplVar.type === "text";
        variablesObject[name] = isTextType ? (sourceValue ?? "") : (source as unknown);
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
    [project, findDocByTemplate, toast, allTemplates, activePhase]
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
