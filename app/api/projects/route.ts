import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PostgrestError } from "@supabase/supabase-js";
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { DocumentCategory, VariablePropagationScope } from '@/lib/types/types';
import type { DocumentVariable } from '@/lib/types/variable-types';
import { normalizeVariableName } from '@/lib/utils/variable-utils';

export const maxDuration = 60;

/**
 * Projects Collection API Routes
 * 
 * PURPOSE: Manage construction projects at the collection level
 * - List all projects with role-based access control
 * - Create new projects with template assignments
 * - Supports multi-tenant company isolation
 */

async function getProjectsHandler(request: AuthenticatedRequest) {
  const supabase = await createClient();

  try {
    // Get query parameters for ADMIN company filtering
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company_id');

    // Always fetch fresh user data from database to avoid stale JWT issues
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role');
    const serviceClient = createServiceRoleClient();
    
    const { data: userProfile, error: profileError } = await serviceClient
      .from('users')
      .select('role, assigned_projects, company_id')
      .eq('id', request.user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Failed to fetch user profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!userProfile.company_id && userProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Use service role client for queries (already imported above)
    const queryClient = serviceClient;

    // Build query with explicit company filtering
    let query = queryClient
      .from("projects")
      .select(`
        *,
        leader:leader_id (
          id,
          email,
          name,
          role
        )
      `);

    // ALWAYS apply company filtering first (security first)
    if (userProfile.role === 'ADMIN') {
      // ADMIN (developers) can filter by specific company or see all
      if (companyFilter) {
        query = query.eq('company_id', companyFilter);
      }
      // If no companyFilter, ADMIN sees all projects from all companies
      // Note: This is intentional for developer access
    } else {
      // All other roles are ALWAYS restricted to their company
      if (!userProfile.company_id) {
        return NextResponse.json({ 
          error: 'User not associated with any company' 
        }, { status: 403 });
      }
      query = query.eq('company_id', userProfile.company_id);
    }

    // Apply role-based filtering using optimized assigned_projects field
    // Both MANAGER and USER roles use the same logic - show only assigned projects
    if (userProfile.role === 'MANAGER' || userProfile.role === 'USER') {
      if (userProfile.assigned_projects && userProfile.assigned_projects.length > 0) {
        query = query.in('id', userProfile.assigned_projects);
      } else {
        return NextResponse.json([]);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;

    if (data && data.length > 0) {
      const projectIds = data.map((p: any) => p.id);

      /** Normalize bigint / string JSON from PostgREST so Map lookups match `project.id`. */
      const numericProjectId = (id: unknown): number => {
        if (typeof id === 'number' && !Number.isNaN(id)) return id;
        if (typeof id === 'string') return parseInt(id, 10);
        return Number(id);
      };

      // Step 1: Get phase rows per project. We pull every phase (not just the
      // current one) so we can compute both the current-phase deadline (used
      // by "right now" surfaces) and the project-wide deadline (used by
      // surfaces that talk about the project as a whole — kanban sort, AI
      // overdue, `project_deadline` template variable, etc.).
      const { data: allPhases } = await queryClient
        .from("project_phases")
        .select("id, project_id, deadline, is_current")
        .in("project_id", projectIds);

      const currentPhaseDeadlineByProject = new Map<number, string | null>();
      const lastPhaseDeadlineByProject = new Map<number, string | null>();

      // last_phase_deadline = MAX(deadline) across all phases of the project,
      // NULLs ignored. NULL when no phase has a deadline yet.
      for (const phase of allPhases ?? []) {
        const pid = numericProjectId((phase as any).project_id);
        const dl = (phase as any).deadline as string | null;
        if (dl) {
          const prev = lastPhaseDeadlineByProject.get(pid) ?? null;
          if (!prev || new Date(dl).getTime() > new Date(prev).getTime()) {
            lastPhaseDeadlineByProject.set(pid, dl);
          }
        }
      }

      const phases = (allPhases ?? []).filter((p: any) => p.is_current);

      if (phases && phases.length > 0) {
        const phaseIdToProjectId = new Map<string, number>();
        for (const phase of phases) {
          const pid = numericProjectId(phase.project_id);
          phaseIdToProjectId.set(String(phase.id), pid);
          currentPhaseDeadlineByProject.set(pid, (phase as any).deadline ?? null);
        }

        // Step 2: Get documents from project_phase_documents for current phases
        const phaseIds = phases.map((p: any) => p.id);
        const { data: phaseDocs } = await queryClient
          .from("project_phase_documents")
          .select("project_phase_id, assignments")
          .in("project_phase_id", phaseIds);

        // Step 3: Group documents by project and calculate supervisor_checked ratio
        const docsByProject = new Map<number, any[]>();
        for (const doc of phaseDocs ?? []) {
          const projectId = phaseIdToProjectId.get(String(doc.project_phase_id));
          if (projectId === undefined || Number.isNaN(projectId)) continue;
          const list = docsByProject.get(projectId) ?? [];
          list.push(doc);
          docsByProject.set(projectId, list);
        }

        for (const project of data as any[]) {
          const pid = numericProjectId(project.id);
          const docs = docsByProject.get(pid);
          // Only override when the current phase actually has documents to score.
          // Otherwise keep `projects.progress` from the row (e.g. variable fill %)
          // instead of forcing 0 — which made the dashboard look empty on first load.
          if (docs && docs.length > 0) {
            const checkedDocs = docs.filter(
              (d: any) => d.assignments?.supervisor_checked
            ).length;
            project.progress = Math.round((checkedDocs / docs.length) * 100);
          }
        }
      }

      // Hydrate `current_phase_deadline` and `last_phase_deadline` on every
      // row (null when project has no phases / no phase deadlines yet).
      //   * current_phase_deadline → "right now" surfaces (sidebar Phase
      //     Deadline card, dashboard / kanban / profile cards).
      //   * last_phase_deadline → "project as a whole" surfaces (kanban
      //     sort, AI overdue, `project_deadline` template variable).
      for (const project of data as any[]) {
        const pid = numericProjectId(project.id);
        project.current_phase_deadline =
          currentPhaseDeadlineByProject.get(pid) ?? null;
        project.last_phase_deadline =
          lastPhaseDeadlineByProject.get(pid) ?? null;
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    const pgError = error as PostgrestError;
    return NextResponse.json({ error: pgError.message }, { status: 500 });
  }
}

/** Map `project_templates.category` (mixed-case text) → DocumentCategory enum. */
function normalizeCategory(raw: string): DocumentCategory | null {
  const key = String(raw || '').toUpperCase();
  return (Object.values(DocumentCategory) as string[]).includes(key)
    ? (key as DocumentCategory)
    : null;
}

interface TemplatePick {
  templateName: string;
  category: DocumentCategory;
}

/**
 * Expand a list of project_template bundle names → (templateName, category)
 * pairs. Duplicates are collapsed (first-wins). Empty / "none" entries are
 * stripped so callers can pass raw client selections directly.
 */
async function expandBundlesToTemplates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  bundleNames: string[]
): Promise<TemplatePick[]> {
  const clean = bundleNames.filter(
    (v): v is string => typeof v === 'string' && v.length > 0 && v !== 'none'
  );
  if (clean.length === 0) return [];

  const { data: projectTemplates, error } = await supabase
    .from('project_templates')
    .select('name, category, templates')
    .eq('company_id', companyId)
    .in('name', clean);
  if (error) throw error;

  const picks: TemplatePick[] = [];
  for (const row of projectTemplates ?? []) {
    const category = normalizeCategory(row.category);
    if (!category) continue;
    for (const templateName of row.templates ?? []) {
      if (!templateName) continue;
      picks.push({ templateName, category });
    }
  }
  const seen = new Set<string>();
  return picks.filter((p) => {
    if (seen.has(p.templateName)) return false;
    seen.add(p.templateName);
    return true;
  });
}

/**
 * Legacy (pre-PR3d) single-phase payload resolver. Maps
 * `selectedTemplates: { [category]: projectTemplateName }` → picks for the
 * first phase. Kept for backwards compat — the UI and AI-contract flow are
 * expected to migrate to the `phases` payload.
 */
async function resolvePickedTemplates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  selectedTemplates: Record<string, string> | undefined
): Promise<TemplatePick[]> {
  if (!selectedTemplates || typeof selectedTemplates !== 'object') return [];
  return expandBundlesToTemplates(
    supabase,
    companyId,
    Object.values(selectedTemplates)
  );
}

interface VariableScopeDecision {
  templateName: string;
  category: DocumentCategory;
  variables: DocumentVariable[];
  /** Per-variable scope computed across the full project selection. */
  scopes: Record<string, VariablePropagationScope>;
}

/**
 * Detect global / category / local scope for each variable across the picked
 * templates. Mirrors VariableProcessor's rules but works on raw template rows
 * (no dependency on the legacy `projects.*_templates[]` columns).
 */
function decideVariableScopes(
  picks: TemplatePick[],
  templatesByName: Map<string, { variables: DocumentVariable[] }>
): VariableScopeDecision[] {
  // Build a lookup of the explicit scope declared in templates.
  // If the same variable name has conflicting scopes across templates,
  // the most permissive one wins (global > category > local).
  const SCOPE_PRIORITY: Record<string, number> = { global: 3, category: 2, local: 1 };
  const explicitScopes = new Map<string, string>();
  for (const pick of picks) {
    const tpl = templatesByName.get(pick.templateName);
    if (!tpl) continue;
    for (const variable of tpl.variables ?? []) {
      const declared = (variable as any).scope as string | undefined;
      if (!declared) continue;
      const existing = explicitScopes.get(variable.name);
      if (!existing || (SCOPE_PRIORITY[declared] ?? 0) > (SCOPE_PRIORITY[existing] ?? 0)) {
        explicitScopes.set(variable.name, declared);
      }
    }
  }

  // Distribution-based registry (fallback for variables without explicit scope)
  interface Registry {
    categories: Set<DocumentCategory>;
    templatesPerCategory: Map<DocumentCategory, Set<string>>;
  }
  const registry = new Map<string, Registry>();

  for (const pick of picks) {
    const tpl = templatesByName.get(pick.templateName);
    if (!tpl) continue;
    for (const variable of tpl.variables ?? []) {
      const key = variable.name;
      let entry = registry.get(key);
      if (!entry) {
        entry = { categories: new Set(), templatesPerCategory: new Map() };
        registry.set(key, entry);
      }
      entry.categories.add(pick.category);
      const set = entry.templatesPerCategory.get(pick.category) ?? new Set<string>();
      set.add(pick.templateName);
      entry.templatesPerCategory.set(pick.category, set);
    }
  }

  const scopeFor = (varName: string, category: DocumentCategory): VariablePropagationScope => {
    // 1. Prefer explicit scope from template JSON
    const declared = explicitScopes.get(varName);
    if (declared === 'global') return VariablePropagationScope.GLOBAL;
    if (declared === 'category') return VariablePropagationScope.CATEGORY;
    if (declared === 'local') return VariablePropagationScope.LOCAL;

    // 2. Fallback: distribution-based heuristic
    const entry = registry.get(varName);
    if (!entry) return VariablePropagationScope.LOCAL;
    if (entry.categories.size > 1) return VariablePropagationScope.GLOBAL;
    const countInCat = entry.templatesPerCategory.get(category)?.size ?? 0;
    if (countInCat > 1) return VariablePropagationScope.CATEGORY;
    return VariablePropagationScope.LOCAL;
  };

  return picks.map((pick) => {
    const tpl = templatesByName.get(pick.templateName);
    const variables = tpl?.variables ?? [];
    const scopes: Record<string, VariablePropagationScope> = {};
    for (const variable of variables) {
      scopes[variable.name] = scopeFor(variable.name, pick.category);
    }
    return { templateName: pick.templateName, category: pick.category, variables, scopes };
  });
}

/**
 * Build the project-level `global_variables` / `category_variables` payloads
 * for storage on `projects`. Schema mirrors the historical one:
 *   global_variables   = { variables: DocumentVariable[] }
 *   category_variables = { [category]: { variables: DocumentVariable[] } }
 *
 * Values always start empty; users fill them in after creation.
 */
function buildProjectVariableBuckets(decisions: VariableScopeDecision[]) {
  const globalMap = new Map<string, DocumentVariable>();
  const categoryMap = new Map<DocumentCategory, Map<string, DocumentVariable>>();

  for (const dec of decisions) {
    for (const variable of dec.variables) {
      const scope = dec.scopes[variable.name];
      const blank = { ...variable, value: '' } as DocumentVariable;
      if (scope === VariablePropagationScope.GLOBAL) {
        if (!globalMap.has(variable.name)) globalMap.set(variable.name, blank);
      } else if (scope === VariablePropagationScope.CATEGORY) {
        let catVars = categoryMap.get(dec.category);
        if (!catVars) {
          catVars = new Map();
          categoryMap.set(dec.category, catVars);
        }
        if (!catVars.has(variable.name)) catVars.set(variable.name, blank);
      }
    }
  }

  const category_variables: Record<string, { variables: DocumentVariable[] }> = {};
  Array.from(categoryMap.entries()).forEach(([cat, vars]) => {
    category_variables[cat] = { variables: Array.from(vars.values()) };
  });

  return {
    global_variables: { variables: Array.from(globalMap.values()) },
    category_variables,
  };
}

function applyContractPrefillToVariables(
  variables: DocumentVariable[],
  contractFieldMapping: Record<string, string[]>,
  contractValues: Record<string, string | undefined>
): DocumentVariable[] {
  // ✅ normalize-aware 매칭 — 'Client Name' / 'client_name' / 'CLIENT NAME' 등 변형 모두 같은 normalized key로 비교
  const normalizedMapping: Record<string, Set<string>> = {};
  for (const [fieldKey, variableNames] of Object.entries(contractFieldMapping)) {
    normalizedMapping[fieldKey] = new Set(variableNames.map((n) => normalizeVariableName(n)));
  }
  return variables.map((v) => {
    const normName = normalizeVariableName(v.name);
    for (const [fieldKey, _names] of Object.entries(contractFieldMapping)) {
      const value = contractValues[fieldKey];
      if (value && normalizedMapping[fieldKey].has(normName)) {
        return { ...v, value } as DocumentVariable;
      }
    }
    return { ...v, value: v.value ?? '' } as DocumentVariable;
  });
}

function buildPropagationSettingsForDecision(
  dec: VariableScopeDecision,
  allDecisions: VariableScopeDecision[]
): Record<
  string,
  {
    currentScope: VariablePropagationScope;
    possibleScopes: VariablePropagationScope[];
    isOverridden: boolean;
  }
> {
  const propagation: Record<
    string,
    {
      currentScope: VariablePropagationScope;
      possibleScopes: VariablePropagationScope[];
      isOverridden: boolean;
    }
  > = {};
  for (const variable of dec.variables) {
    const scope = dec.scopes[variable.name];
    const possible: VariablePropagationScope[] = [VariablePropagationScope.LOCAL];
    const catCount = allDecisions.filter((d) => d.category === dec.category).length;
    if (catCount > 1) possible.push(VariablePropagationScope.CATEGORY);
    const seenCategories = new Set(
      allDecisions
        .filter((d) => d.variables.some((v) => v.name === variable.name))
        .map((d) => d.category)
    );
    if (seenCategories.size > 1)
      possible.push(VariablePropagationScope.GLOBAL);
    propagation[variable.name] = {
      currentScope: scope,
      possibleScopes: possible,
      isOverridden: false,
    };
  }
  return propagation;
}

/**
 * Legacy `projects.*_templates[]` + JSONB fields must stay in sync with
 * `project_phase_documents` so the project-details UI (which still reads the
 * row) shows templates and variables immediately after creation.
 */
function buildLegacyProjectTemplateFieldsFromDecisions(
  decisionIndex: Map<string, VariableScopeDecision>,
  allDecisions: VariableScopeDecision[],
  contractFieldMapping: Record<string, string[]>,
  contractValues: Record<string, string | undefined>
): Record<string, unknown> {
  const templateArrays: Record<string, string[]> = {};
  for (const cat of Object.values(DocumentCategory)) {
    templateArrays[`${cat.toLowerCase()}_templates`] = [];
  }

  const template_variables: Record<
    string,
    Record<string, { variables: DocumentVariable[] }>
  > = {};
  const variable_propagation_settings: Record<
    string,
    Record<
      string,
      Record<
        string,
        {
          currentScope: VariablePropagationScope;
          possibleScopes: VariablePropagationScope[];
          isOverridden: boolean;
        }
      >
    >
  > = {};

  for (const dec of Array.from(decisionIndex.values())) {
    const arrKey = `${dec.category.toLowerCase()}_templates`;
    if (!templateArrays[arrKey].includes(dec.templateName)) {
      templateArrays[arrKey].push(dec.templateName);
    }

    const blankVariables = applyContractPrefillToVariables(
      dec.variables,
      contractFieldMapping,
      contractValues
    );
    const propagation = buildPropagationSettingsForDecision(dec, allDecisions);

    if (!template_variables[dec.category]) template_variables[dec.category] = {};
    template_variables[dec.category][dec.templateName] = {
      variables: blankVariables,
    };
    if (!variable_propagation_settings[dec.category]) {
      variable_propagation_settings[dec.category] = {};
    }
    variable_propagation_settings[dec.category][dec.templateName] = propagation;
  }

  return {
    ...templateArrays,
    template_variables,
    variable_propagation_settings,
  };
}

async function createProjectHandler(request: AuthenticatedRequest) {
  const supabase = await createClient();

  try {
    // Current user profile (auth middleware already validated the session).
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();
    if (currentUserError) throw currentUserError;

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 });
    }
    const companyId = currentUserProfile.company_id as string;

    const body = await request.json();
    const {
      name,
      location,
      // `start_date` is the canonical name (D3 option B). `deadline` is kept
      // as a temporary alias so older clients / cached bundles that still
      // post `deadline` continue to work — interpreted as the start date.
      start_date: startDateInput,
      deadline: legacyDeadlineInput,
      assignedTo,
      selectedTemplates,
      phases: phasesPayload,
      // Additional detail fields from AI contract extraction
      clientName,
      documentReceiver,
      caseNumber,
      constructionAddress,
      cadastralNumber,
      cadastralDistrict,
      subject,
      regarding,
    } = body as {
      name: string;
      location: string;
      start_date?: string | null;
      deadline?: string | null;
      assignedTo: string;
      selectedTemplates?: Record<string, string>;
      phases?: Array<{
        phase_definition_id: string;
        deadline?: string | null;
        is_current?: boolean;
        selected_templates?: Record<string, string>;
        templates?: Array<{ category?: string; template_name: string }>;
        selection_mode?: 'single' | 'package';
      }>;
      clientName?: string;
      documentReceiver?: string;
      caseNumber?: string;
      constructionAddress?: string;
      cadastralNumber?: string;
      cadastralDistrict?: string;
      subject?: string;
      regarding?: string;
    };

    const startDate: string | null =
      (typeof startDateInput === 'string' && startDateInput) ||
      (typeof legacyDeadlineInput === 'string' && legacyDeadlineInput) ||
      null;

    // Resolve leader.
    if (!assignedTo || typeof assignedTo !== 'string' || assignedTo.trim() === '') {
      return NextResponse.json(
        { error: 'Project leader (assignedTo) is required' },
        { status: 400 }
      );
    }
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq."${assignedTo}",email.eq."${assignedTo}"`)
      .eq('company_id', companyId)
      .single();
    if (userError) throw userError;
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found or not in your company' },
        { status: 404 }
      );
    }

    // ----------------------------------------------------------------------
    // Resolve phase selections.
    //
    // Two accepted shapes:
    //   (1) Legacy single-phase: `selectedTemplates: { [category]: bundleName }`
    //       → treated as P1-only selection.
    //   (2) Phase-scoped (PR 3d): `phases: Array<{ phase_definition_id,
    //       selected_templates? / templates?, deadline? }>`
    //       → lets the wizard pre-populate multiple phases.
    // ----------------------------------------------------------------------
    interface ResolvedPhase {
      phaseDefinitionId: string;
      deadline: string | null;
      picks: TemplatePick[];
    }
    const resolvedPhases: ResolvedPhase[] = [];

    // Load the company's phase catalog once so we can validate ids and find P1.
    const { data: phaseDefs, error: phaseDefsError } = await supabase
      .from('phase_definitions')
      .select('id, display_order, is_enabled')
      .eq('company_id', companyId);
    if (phaseDefsError) throw phaseDefsError;
    const defsById = new Map(
      (phaseDefs ?? []).map((d) => [d.id as string, d])
    );
    // Multiple enabled rows at display_order=1 should not happen, but the DB
    // trigger uses LIMIT 1 without ORDER BY while the client picks `.find()`.
    // That mismatch drops `phaseIdByDefId` lookups → P1 documents never insert.
    const p1Candidates = (phaseDefs ?? [])
      .filter((d) => d.display_order === 1 && d.is_enabled)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const firstPhaseDef = p1Candidates[0];
    const p1DefinitionIds = new Set(p1Candidates.map((d) => d.id as string));
    if (!firstPhaseDef) {
      console.error(
        '[POST /api/projects] No enabled display_order=1 phase_definition for company',
        companyId
      );
      return NextResponse.json(
        {
          error:
            'Company has no enabled phase_definitions row at display_order=1.',
        },
        { status: 500 }
      );
    }

    if (Array.isArray(phasesPayload) && phasesPayload.length > 0) {
      for (const p of phasesPayload) {
        if (!p?.phase_definition_id) continue;
        const def = defsById.get(p.phase_definition_id);
        if (!def || !def.is_enabled) {
          console.error(
            '[POST /api/projects] Unknown/disabled phase_definition_id in payload',
            { provided: p.phase_definition_id, companyId }
          );
          return NextResponse.json(
            {
              error: `Unknown or disabled phase_definition_id: ${p.phase_definition_id}`,
            },
            { status: 400 }
          );
        }
        let picks: TemplatePick[];
        const isSingleMode = p.selection_mode === 'single';

        if (isSingleMode && Array.isArray(p.templates) && p.templates.length > 0) {
          // Single mode: template_name is already a document_template name.
          // Build TemplatePick directly from the submitted (category, template_name) pairs.
          picks = [];
          const seen = new Set<string>();
          for (const t of p.templates) {
            if (!t.template_name || seen.has(t.template_name)) continue;
            seen.add(t.template_name);
            const cat = normalizeCategory(t.category ?? '');
            if (cat) picks.push({ templateName: t.template_name, category: cat });
          }
        } else if (Array.isArray(p.templates) && p.templates.length > 0) {
          // Package mode: expand project_template bundles to document_templates
          picks = await expandBundlesToTemplates(
            supabase,
            companyId,
            p.templates.map((t) => t.template_name)
          );
        } else if (p.selected_templates) {
          picks = await expandBundlesToTemplates(
            supabase,
            companyId,
            Object.values(p.selected_templates)
          );
        } else {
          picks = [];
        }
        resolvedPhases.push({
          phaseDefinitionId: p.phase_definition_id,
          deadline: p.deadline ?? null,
          picks,
        });
      }
    } else {
      // Legacy path — route the whole selection onto P1. P1 deadline is left
      // null here; the user manages phase deadlines in the milestone bar.
      const picks = await resolvePickedTemplates(
        supabase,
        companyId,
        selectedTemplates
      );
      resolvedPhases.push({
        phaseDefinitionId: firstPhaseDef.id as string,
        deadline: null,
        picks,
      });
    }

    // Ensure P1 always exists in the plan so the trigger-created row is
    // represented even if the client forgot to include it.
    if (!resolvedPhases.some((rp) => p1DefinitionIds.has(rp.phaseDefinitionId))) {
      resolvedPhases.unshift({
        phaseDefinitionId: firstPhaseDef.id as string,
        deadline: null,
        picks: [],
      });
    }

    // Flatten for cross-phase scope detection. A variable is GLOBAL when it
    // shows up in multiple categories; CATEGORY when it shows up in multiple
    // templates of the same category; LOCAL otherwise. Phase is not part of
    // this decision — scope is project-wide so carrying a variable between
    // phases uses the same bucket.
    let allPicks: TemplatePick[] = [];
    for (const rp of resolvedPhases) allPicks.push(...rp.picks);

    const templatesByName = new Map<string, { variables: DocumentVariable[] }>();
    if (allPicks.length > 0) {
      // Service role: same `company_id` as the project; avoids RLS hiding rows when
      // resolving `project_templates.templates` → `document_templates.name` (exact match only).
      const serviceForTemplates = createServiceRoleClient();
      const { data: companyTemplateRows, error: templateLoadError } = await serviceForTemplates
        .from('document_templates')
        .select('name, category, variables')
        .eq('company_id', companyId);
      if (templateLoadError) throw templateLoadError;

      const byExactName = new Map<
        string,
        { name: string; category: DocumentCategory; variables: DocumentVariable[] }
      >();

      for (const row of companyTemplateRows ?? []) {
        const cat = normalizeCategory(String(row.category ?? ''));
        if (!cat) continue;
        const variables = (row.variables ?? []) as DocumentVariable[];
        byExactName.set(row.name, { name: row.name, category: cat, variables });
      }

      const missingLabels: string[] = [];
      for (const rp of resolvedPhases) {
        const next: TemplatePick[] = [];
        const dedupe = new Set<string>();
        for (const pick of rp.picks) {
          const hit = byExactName.get(pick.templateName);
          if (!hit) {
            missingLabels.push(`${pick.category}:${pick.templateName}`);
            continue;
          }
          const dedupeKey = `${hit.category}::${hit.name}`;
          if (dedupe.has(dedupeKey)) continue;
          dedupe.add(dedupeKey);
          next.push({
            templateName: hit.name,
            category: hit.category,
          });
        }
        rp.picks = next;
      }

      allPicks = [];
      for (const rp of resolvedPhases) allPicks.push(...rp.picks);

      if (missingLabels.length > 0) {
        console.warn(
          '[POST /api/projects] Dropped picks: project_templates.templates[] string must equal document_templates.name',
          { missing: missingLabels, companyId }
        );
      }

      for (const pick of allPicks) {
        const row = byExactName.get(pick.templateName);
        if (row) {
          templatesByName.set(pick.templateName, { variables: row.variables });
        }
      }
    }

    const decisions = decideVariableScopes(allPicks, templatesByName);
    const { global_variables, category_variables } =
      buildProjectVariableBuckets(decisions);

    // Prefill global_variables with values from AI contract extraction.
    // The mapping connects frontend field keys to the Danish AND English variable names
    // used in templates (mirroring contract-extractor.ts mapToProjectVariables).
    // ✅ Issue follow-up: 영어 변수명 추가 + normalize-aware 매칭 (Client Name / client / client_name 등 변형 모두 커버)
    const contractFieldMapping: Record<string, string[]> = {
      clientName: [
        'Bygherres navn', 'Bygherre navn', 'Bygherrenavn', 'Kunde navn',
        'client_name', 'client', 'Client Name', 'Client', 'Client_Name',
      ],
      documentReceiver: [
        'Modtager', 'Dokumentmodtager',
        'document_recipient', 'Document Recipient', 'document_receiver',
      ],
      caseNumber: [
        'Sagsnummer', 'Sagsnr', 'Sag nr', 'sagsNr',
        'case_number', 'Case Number', 'project_number', 'Project Number',
      ],
      constructionAddress: [
        'Byggeadresse', 'Byggepladsens adresse',
        'project_address', 'Project Address', 'construction_address', 'Construction Address',
      ],
      cadastralNumber: [
        'Matrikelnummer', 'Matrikel', 'matrikelNr',
        'matrikelnr', 'matrikel_nr', 'Matrikel nr.', 'Cadastral Number', 'cadastral_number',
      ],
      cadastralDistrict: [
        'Ejerlav', 'ejerlav', 'Cadastral District', 'cadastral_district',
      ],
      subject: ['Emne', 'subject', 'Subject'],
      regarding: [
        'Vedrørende', 'Vedr', 'Vedr.', 'vedrrende',
        'regarding', 'Regarding',
      ],
    };
    const contractValues: Record<string, string | undefined> = {
      clientName, documentReceiver, caseNumber,
      constructionAddress, cadastralNumber, cadastralDistrict,
      subject, regarding,
    };
    // normalize-aware 매칭: 'Client Name', 'client_name', 'CLIENT NAME' 등 모두 같은 normalized key로 비교
    const normalizedMapping: Record<string, Set<string>> = {};
    for (const [fieldKey, variableNames] of Object.entries(contractFieldMapping)) {
      normalizedMapping[fieldKey] = new Set(variableNames.map((n) => normalizeVariableName(n)));
    }
    const matchVariable = (gvName: string, fieldKey: string): boolean => {
      const norm = normalizeVariableName(gvName);
      return normalizedMapping[fieldKey].has(norm);
    };
    for (const [fieldKey, _variableNames] of Object.entries(contractFieldMapping)) {
      const value = contractValues[fieldKey];
      if (!value) continue;
      for (const gv of global_variables.variables) {
        if (matchVariable(gv.name, fieldKey) && !gv.value) {
          (gv as any).value = value;
        }
      }
      for (const catBucket of Object.values(category_variables)) {
        for (const cv of catBucket.variables) {
          if (matchVariable(cv.name, fieldKey) && !cv.value) {
            (cv as any).value = value;
          }
        }
      }
    }

    // ✅ Issue 16 fix — D4 옵션 ① 단방향 초기 시드.
    // 프로젝트 생성 입력값(name/location/start_date/leader)을 global_variables에 시드한다.
    // 이후 변경은 SSOT(project.global_variables) 단방향 흐름이며,
    // projects.{name, location, start_date, leader_id} 컬럼은 변경하지 않는다.
    // (시연 영향 최소화 — 기존 프로젝트 식별/대시보드 표기는 그대로 유지)
    //
    // Issue 15 (D3 옵션 B): `project_deadline` 변수는 더 이상 프로젝트
    // 시작일을 가리키지 않는다. 시드 시점에는 P1(=current phase)의 deadline을
    // 사용하고, 이후 phase가 advance되면 다음 phase deadline은 phase 변경
    // 트리거 또는 generate-document API의 fallback에서 다시 매핑된다.
    const seedProjectGlobal = (variableName: string, value: unknown) => {
      if (value === undefined || value === null || value === '') return;
      const existingIdx = global_variables.variables.findIndex((v) => v.name === variableName);
      if (existingIdx >= 0) {
        // contract prefill이 이미 채웠으면 그 값 우선
        if (!(global_variables.variables[existingIdx] as any).value) {
          (global_variables.variables[existingIdx] as any).value = value;
        }
      } else {
        global_variables.variables.push({ name: variableName, type: 'text', value } as any);
      }
    };
    const p1PlanForSeed = resolvedPhases.find((rp) =>
      p1DefinitionIds.has(rp.phaseDefinitionId)
    );
    seedProjectGlobal('project_name', name);
    seedProjectGlobal('project_location', location);
    seedProjectGlobal('project_start_date', startDate);
    seedProjectGlobal('project_deadline', p1PlanForSeed?.deadline ?? null);
    seedProjectGlobal('project_leader', userData.name);

    // Quick lookup: for a given (templateName, category), return the matching
    // decision so we can seed phase documents consistently.
    const decisionIndex = new Map<string, (typeof decisions)[number]>();
    for (const d of decisions) {
      decisionIndex.set(`${d.category}::${d.templateName}`, d);
    }

    // ---- Insert project row ------------------------------------------------
    // Insert with empty variables first; populate after documents are confirmed.
    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        location,
        start_date: startDate,
        leader_id: userData.id,
        company_id: companyId,
        global_variables: { variables: [] },
        category_variables: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        leader:leader_id ( id, email, name, role )
      `
      )
      .single();
    if (projectError) throw projectError;

    // ---- First phase is auto-created by DB trigger -------------------------
    // Read back the P1 row the trigger created. Reuse/update it instead of
    // inserting a duplicate. If the trigger didn't fire (e.g. missing migration),
    // create P1 manually as a fallback.
    let firstPhase: { id: string; phase_definition_id: string } | null = null;
    const { data: triggerPhase, error: phaseError } = await supabase
      .from('project_phases')
      .select('id, phase_definition_id')
      .eq('project_id', projectRow.id)
      .eq('is_current', true)
      .maybeSingle();
    if (phaseError) throw phaseError;
    firstPhase = triggerPhase as { id: string; phase_definition_id: string } | null;

    if (!firstPhase) {
      // Manual fallback when the trigger didn't fire. P1 deadline comes from
      // the matching phases payload entry (if any) — never from the project's
      // start_date, which now has separate semantics (Issue 15).
      const p1PlanFallback = resolvedPhases.find((rp) =>
        p1DefinitionIds.has(rp.phaseDefinitionId)
      );
      const { data: manualP1, error: manualError } = await supabase
        .from('project_phases')
        .insert({
          project_id: projectRow.id,
          phase_definition_id: firstPhaseDef.id,
          deadline: p1PlanFallback?.deadline ?? null,
          is_current: true,
        })
        .select('id, phase_definition_id')
        .single();
      if (manualError) throw manualError;
      firstPhase = manualP1 as { id: string; phase_definition_id: string };
    }

    // ---- Insert additional phases (everything except P1) ------------------
    //
    // P1 already exists courtesy of the trigger. For any other phase the user
    // selected, create a row here so documents have somewhere to live.
    const phaseIdByDefId = new Map<string, string>();
    phaseIdByDefId.set(
      firstPhase.phase_definition_id as string,
      firstPhase.id as string
    );

    const extraPhaseRows = resolvedPhases
      .filter((rp) => rp.phaseDefinitionId !== firstPhase.phase_definition_id)
      .map((rp) => ({
        project_id: projectRow.id,
        phase_definition_id: rp.phaseDefinitionId,
        deadline: rp.deadline,
        is_current: false,
      }));
    if (extraPhaseRows.length > 0) {
      const { data: extras, error: extrasError } = await supabase
        .from('project_phases')
        .insert(extraPhaseRows)
        .select('id, phase_definition_id');
      if (extrasError) throw extrasError;
      for (const row of extras ?? []) {
        phaseIdByDefId.set(
          row.phase_definition_id as string,
          row.id as string
        );
      }
    }

    // Map every enabled display_order=1 definition id to the single P1 row
    // (whichever uuid the trigger chose) so seeded docs always attach.
    for (const pid of Array.from(p1DefinitionIds)) {
      phaseIdByDefId.set(pid, firstPhase.id as string);
    }

    // Optional: update the auto-created P1 deadline if the user supplied one
    // via the phases payload. Issue 15: project.start_date is no longer used
    // as the P1 deadline seed, so we always honour the explicit phase value.
    const p1Plan = resolvedPhases.find((rp) =>
      p1DefinitionIds.has(rp.phaseDefinitionId)
    );
    if (p1Plan && p1Plan.deadline) {
      await supabase
        .from('project_phases')
        .update({ deadline: p1Plan.deadline })
        .eq('id', firstPhase.id);
    }

    // ---- Seed phase documents ---------------------------------------------
    const docRows: Array<Record<string, unknown>> = [];
    for (const rp of resolvedPhases) {
      const phaseId = phaseIdByDefId.get(rp.phaseDefinitionId);
      if (!phaseId) {
        continue;
      }
      for (const pick of rp.picks) {
        const dec = decisionIndex.get(`${pick.category}::${pick.templateName}`);
        if (!dec) {
          continue;
        }
        const blankVariables = applyContractPrefillToVariables(
          dec.variables,
          contractFieldMapping,
          contractValues
        );
        const propagation = buildPropagationSettingsForDecision(dec, decisions);
        docRows.push({
          project_phase_id: phaseId,
          template_name: dec.templateName,
          category: dec.category,
          responsible_discipline: null,
          variables: { variables: blankVariables },
          propagation_settings: propagation,
          assignments: {},
          review_status: {},
          template_version_lock: null,
        });
      }
    }

    const pickTotal = resolvedPhases.reduce((n, rp) => n + rp.picks.length, 0);

    if (pickTotal > 0 && docRows.length === 0) {
      console.error('[POST /api/projects] PHASE_DOC_SEED_EMPTY', {
        projectId: projectRow.id,
        pickTotal,
        resolvedPhases: resolvedPhases.map((rp) => ({
          phaseDefinitionId: rp.phaseDefinitionId,
          picks: rp.picks.map((p) => `${p.category}:${p.templateName}`),
        })),
      });
      return NextResponse.json(
        {
          error:
            '프로젝트는 생성됐지만 페이즈 문서 행을 만들지 못했습니다. 서버 로그(PHASE_DOC_SEED_EMPTY)를 확인하세요.',
          code: 'PHASE_DOC_SEED_EMPTY',
        },
        { status: 500 }
      );
    }

    if (docRows.length > 0) {
      // Use service role so seeding is not blocked by RLS (e.g. creator is
      // PROJECT_MANAGER but leader_id is another user — see project_phase_documents INSERT policies).
      const service = createServiceRoleClient();
      const { error: docError } = await service
        .from('project_phase_documents')
        .insert(docRows);
      if (docError) {
        throw docError;
      }

      const legacyTemplateFields = buildLegacyProjectTemplateFieldsFromDecisions(
        decisionIndex,
        decisions,
        contractFieldMapping,
        contractValues
      );

      // Keep legacy `projects` columns in sync when they still exist. After
      // migration `20260422000000_finalize_phase_system` those columns are
      // dropped — do not fail project creation if the update rejects.
      try {
        const { error: legacyUpdateError } = await supabase
          .from('projects')
          .update({
            ...legacyTemplateFields,
            global_variables,
            category_variables,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectRow.id);
        if (legacyUpdateError) throw legacyUpdateError;
      } catch (legacyErr) {
        const onlyVarsPayload = {
          global_variables,
          category_variables,
          updated_at: new Date().toISOString(),
        };
        const { error: varsOnlyError } = await supabase
          .from('projects')
          .update(onlyVarsPayload)
          .eq('id', projectRow.id);
        if (varsOnlyError) {
          console.warn(
            '[POST /api/projects] Project variable buckets not persisted on projects row:',
            varsOnlyError
          );
        }
        console.warn(
          '[POST /api/projects] Legacy template columns update skipped (expected if phase-finalized schema)',
          legacyErr
        );
      }
    }

    // ---- Assign leader's assigned_projects --------------------------------
    const { data: assignedUser } = await supabase
      .from('users')
      .select('assigned_projects')
      .eq('id', userData.id)
      .single();
    if (assignedUser) {
      const next = [...(assignedUser.assigned_projects || []), projectRow.id];
      await supabase
        .from('users')
        .update({
          assigned_projects: next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.id);
    }

    return NextResponse.json(projectRow);
  } catch (error) {
    const pgError = error as PostgrestError;
    // Log the full object (message + details + hint + code) so the Postgres
    // side of any failure is visible in the dev terminal.
    console.error('[POST /api/projects] Unhandled error:', {
      message: pgError?.message,
      details: pgError?.details,
      hint: pgError?.hint,
      code: pgError?.code,
      raw: error,
    });
    return NextResponse.json(
      {
        error:
          pgError?.message ||
          (error instanceof Error ? error.message : 'Unknown error'),
        details: pgError?.details,
        hint: pgError?.hint,
        code: pgError?.code,
      },
      { status: 500 }
    );
  }
}
// Handle CORS preflight for Word add-in
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Apply authentication wrappers
export const GET = withAuth(getProjectsHandler);
export const POST = withAuth(createProjectHandler); 