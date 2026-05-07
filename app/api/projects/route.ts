import { createClient } from '@/lib/supabase/server';
import { PostgrestError } from "@supabase/supabase-js";
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { DocumentCategory, VariablePropagationScope } from '@/lib/types/types';
import type { DocumentVariable } from '@/lib/types/variable-types';

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
      const { data: phases } = await queryClient
        .from("project_phases")
        .select("project_id, is_current, documents")
        .in("project_id", projectIds)
        .eq("is_current", true);

      if (phases) {
        const currentPhaseMap = new Map<number, any>();
        for (const phase of phases) {
          currentPhaseMap.set(phase.project_id, phase);
        }

        for (const project of data as any[]) {
          const currentPhase = currentPhaseMap.get(project.id);
          if (currentPhase?.documents) {
            const docs = currentPhase.documents as any[];
            const totalDocs = docs.length;
            if (totalDocs > 0) {
              const checkedDocs = docs.filter(
                (d: any) => d.assignments?.supervisor_checked
              ).length;
              project.progress = Math.round((checkedDocs / totalDocs) * 100);
            } else {
              project.progress = 0;
            }
          } else {
            project.progress = 0;
          }
        }
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
      deadline,
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
      deadline: string;
      assignedTo: string;
      selectedTemplates?: Record<string, string>;
      phases?: Array<{
        phase_definition_id: string;
        deadline?: string | null;
        is_current?: boolean;
        selected_templates?: Record<string, string>;
        templates?: Array<{ category?: string; template_name: string }>;
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
    const firstPhaseDef = (phaseDefs ?? []).find(
      (d) => d.display_order === 1 && d.is_enabled
    );
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
        // Prefer the flat list; fall back to the category-keyed map.
        let picks: TemplatePick[];
        if (Array.isArray(p.templates) && p.templates.length > 0) {
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
      // Legacy path — route the whole selection onto P1.
      const picks = await resolvePickedTemplates(
        supabase,
        companyId,
        selectedTemplates
      );
      resolvedPhases.push({
        phaseDefinitionId: firstPhaseDef.id as string,
        deadline: deadline ?? null,
        picks,
      });
    }

    // Ensure P1 always exists in the plan so the trigger-created row is
    // represented even if the client forgot to include it.
    if (
      !resolvedPhases.some((rp) => rp.phaseDefinitionId === firstPhaseDef.id)
    ) {
      resolvedPhases.unshift({
        phaseDefinitionId: firstPhaseDef.id as string,
        deadline: deadline ?? null,
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
      const uniqueNames = Array.from(new Set(allPicks.map((p) => p.templateName)));
      const { data: templateRows, error: templateError } = await supabase
        .from('document_templates')
        .select('name, variables')
        .eq('company_id', companyId)
        .in('name', uniqueNames);
      if (templateError) throw templateError;

      const found = new Set<string>();
      for (const row of templateRows ?? []) {
        templatesByName.set(row.name, {
          variables: (row.variables ?? []) as DocumentVariable[],
        });
        found.add(row.name);
      }
      const missing = uniqueNames.filter((n) => !found.has(n));
      if (missing.length > 0) {
        console.warn(
          '[POST /api/projects] Skipping templates not found in document_templates',
          { missing, companyId }
        );
        for (const rp of resolvedPhases) {
          rp.picks = rp.picks.filter((p) => !missing.includes(p.templateName));
        }
        allPicks = [];
        for (const rp of resolvedPhases) allPicks.push(...rp.picks);
      }
    }

    const decisions = decideVariableScopes(allPicks, templatesByName);
    const { global_variables, category_variables } =
      buildProjectVariableBuckets(decisions);

    // Prefill global_variables with values from AI contract extraction.
    // The mapping connects frontend field keys to the Danish variable names
    // used in templates (mirroring contract-extractor.ts mapToProjectVariables).
    const contractFieldMapping: Record<string, string[]> = {
      clientName: ['Bygherres navn', 'Bygherre navn', 'Bygherrenavn', 'Kunde navn'],
      documentReceiver: ['Modtager', 'Dokumentmodtager'],
      caseNumber: ['Sagsnummer', 'Sagsnr', 'Sag nr'],
      constructionAddress: ['Byggeadresse', 'Byggepladsens adresse'],
      cadastralNumber: ['Matrikelnummer', 'Matrikel'],
      cadastralDistrict: ['Ejerlav'],
      subject: ['Emne'],
      regarding: ['Vedrørende', 'Vedr', 'Vedr.'],
    };
    const contractValues: Record<string, string | undefined> = {
      clientName, documentReceiver, caseNumber,
      constructionAddress, cadastralNumber, cadastralDistrict,
      subject, regarding,
    };
    for (const [fieldKey, variableNames] of Object.entries(contractFieldMapping)) {
      const value = contractValues[fieldKey];
      if (!value) continue;
      for (const gv of global_variables.variables) {
        if (variableNames.includes(gv.name) && !gv.value) {
          (gv as any).value = value;
        }
      }
      for (const catBucket of Object.values(category_variables)) {
        for (const cv of catBucket.variables) {
          if (variableNames.includes(cv.name) && !cv.value) {
            (cv as any).value = value;
          }
        }
      }
    }

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
        deadline,
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
      const { data: manualP1, error: manualError } = await supabase
        .from('project_phases')
        .insert({
          project_id: projectRow.id,
          phase_definition_id: firstPhaseDef.id,
          deadline: deadline ?? null,
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

    // Optional: update the auto-created P1 deadline if the user supplied one
    // via the phases payload (the trigger used project.deadline as the seed).
    const p1Plan = resolvedPhases.find(
      (rp) => rp.phaseDefinitionId === firstPhase.phase_definition_id
    );
    if (p1Plan && p1Plan.deadline && p1Plan.deadline !== deadline) {
      await supabase
        .from('project_phases')
        .update({ deadline: p1Plan.deadline })
        .eq('id', firstPhase.id);
    }

    // ---- Seed phase documents ---------------------------------------------
    const docRows: Array<Record<string, unknown>> = [];
    for (const rp of resolvedPhases) {
      const phaseId = phaseIdByDefId.get(rp.phaseDefinitionId);
      if (!phaseId) continue;
      for (const pick of rp.picks) {
        const dec = decisionIndex.get(`${pick.category}::${pick.templateName}`);
        if (!dec) continue;
        const blankVariables: DocumentVariable[] = dec.variables.map(
          (v) => {
            for (const [fieldKey, variableNames] of Object.entries(contractFieldMapping)) {
              const value = contractValues[fieldKey];
              if (value && variableNames.includes(v.name)) {
                return { ...v, value } as DocumentVariable;
              }
            }
            return { ...v, value: '' } as DocumentVariable;
          }
        );
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
          const possible: VariablePropagationScope[] = [
            VariablePropagationScope.LOCAL,
          ];
          const catCount = decisions.filter(
            (d) => d.category === dec.category
          ).length;
          if (catCount > 1) possible.push(VariablePropagationScope.CATEGORY);
          const seenCategories = new Set(
            decisions
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
    if (docRows.length > 0) {
      const { error: docError } = await supabase
        .from('project_phase_documents')
        .insert(docRows);
      if (docError) throw docError;

      // Documents created successfully — now populate project-level variables.
      await supabase
        .from('projects')
        .update({
          global_variables,
          category_variables,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectRow.id);
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