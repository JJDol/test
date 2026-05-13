/**
 * Auto-Create Project from Contract Data
 *
 * PURPOSE: Automatically create a project with pre-filled variables from
 * extracted contract data. Writes into the phase-scoped document model
 * introduced in PR 1 (no legacy `projects.*_templates[]` arrays).
 *
 * Behaviour mirrors POST /api/projects but also pre-fills per-template
 * variables from the AI-extracted `variableMapping`.
 *
 * ROUTE: POST /api/ai/create-project-from-contract
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { ContractData } from '@/lib/services/ai/contract-extractor';
import { DocumentCategory, VariablePropagationScope } from '@/lib/types/types';
import type { DocumentVariable } from '@/lib/types/variable-types';

interface CreateProjectFromContractRequest {
  contractData: ContractData;
  variableMapping: Record<string, any>;
  selectedTemplates?: {
    [category: string]: string;
  };
  assignedUserId?: string;
}

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

async function createProjectFromContractHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    const user = request.user;

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, name, role')
      .eq('id', user.id)
      .single();
    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    if (!userData.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 });
    }
    const companyId = userData.company_id as string;

    const body: CreateProjectFromContractRequest = await request.json();
    const { contractData, variableMapping, selectedTemplates, assignedUserId } = body;
    if (!contractData || !variableMapping) {
      return NextResponse.json(
        { error: 'Missing required fields: contractData and variableMapping' },
        { status: 400 }
      );
    }

    // Resolve assignee.
    const assigneeId = assignedUserId || user.id;
    const { data: assigneeData, error: assigneeError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', assigneeId)
      .eq('company_id', companyId)
      .single();
    if (assigneeError || !assigneeData) {
      return NextResponse.json(
        { error: 'Assigned user not found or not in your company' },
        { status: 404 }
      );
    }

    // ---- Resolve template picks (flatten project-template bundles). --------
    const picks: TemplatePick[] = [];
    if (selectedTemplates && typeof selectedTemplates === 'object') {
      const projectTemplateNames = Object.values(selectedTemplates).filter(
        (v): v is string => typeof v === 'string' && v.length > 0 && v !== 'none'
      );
      if (projectTemplateNames.length > 0) {
        const { data: projectTemplates } = await supabase
          .from('project_templates')
          .select('name, category, templates')
          .eq('company_id', companyId)
          .in('name', projectTemplateNames);
        for (const row of projectTemplates ?? []) {
          const category = normalizeCategory(row.category);
          if (!category) continue;
          for (const templateName of row.templates ?? []) {
            if (!templateName) continue;
            picks.push({ templateName, category });
          }
        }
      }
    }
    const seenNames = new Set<string>();
    const uniquePicks = picks.filter((p) => {
      if (seenNames.has(p.templateName)) return false;
      seenNames.add(p.templateName);
      return true;
    });

    // ---- Load template variables (one shot). -------------------------------
    const templatesByName = new Map<string, { variables: DocumentVariable[] }>();
    if (uniquePicks.length > 0) {
      const { data: templateRows } = await supabase
        .from('document_templates')
        .select('name, variables')
        .eq('company_id', companyId)
        .in('name', uniquePicks.map((p) => p.templateName));
      for (const row of templateRows ?? []) {
        templatesByName.set(row.name, { variables: (row.variables ?? []) as DocumentVariable[] });
      }
    }

    // ---- Decide variable scopes across the selection. ----------------------
    const registry = new Map<
      string,
      { categories: Set<DocumentCategory>; perCategory: Map<DocumentCategory, Set<string>> }
    >();
    for (const pick of uniquePicks) {
      const tpl = templatesByName.get(pick.templateName);
      if (!tpl) continue;
      for (const variable of tpl.variables ?? []) {
        let entry = registry.get(variable.name);
        if (!entry) {
          entry = { categories: new Set(), perCategory: new Map() };
          registry.set(variable.name, entry);
        }
        entry.categories.add(pick.category);
        const set = entry.perCategory.get(pick.category) ?? new Set<string>();
        set.add(pick.templateName);
        entry.perCategory.set(pick.category, set);
      }
    }
    const scopeOf = (varName: string, category: DocumentCategory): VariablePropagationScope => {
      const entry = registry.get(varName);
      if (!entry) return VariablePropagationScope.LOCAL;
      if (entry.categories.size > 1) return VariablePropagationScope.GLOBAL;
      const n = entry.perCategory.get(category)?.size ?? 0;
      return n > 1 ? VariablePropagationScope.CATEGORY : VariablePropagationScope.LOCAL;
    };

    // ---- Parse start date (from contract) if available. -------------------
    // Issue 15 (D3 옵션 B): the contract's endDate is treated as the project
    // start date. Per-phase deadlines are managed separately on the milestone
    // bar.
    let startDate: string | null = null;
    if (contractData.endDate) {
      const parsed = new Date(contractData.endDate);
      if (!isNaN(parsed.getTime())) startDate = parsed.toISOString();
    }

    // ---- Build project-level global / category buckets, pre-filled. -------
    // Schema mirrors the historical one:
    //   global_variables   = { variables: DocumentVariable[] }
    //   category_variables = { [cat]: { variables: DocumentVariable[] } }
    const mappedValue = (raw: unknown): string =>
      raw !== null && raw !== undefined && raw !== '' ? String(raw) : '';

    const globalMap = new Map<string, DocumentVariable>();
    const catMaps = new Map<DocumentCategory, Map<string, DocumentVariable>>();
    for (const pick of uniquePicks) {
      const tpl = templatesByName.get(pick.templateName);
      if (!tpl) continue;
      for (const variable of tpl.variables ?? []) {
        const scope = scopeOf(variable.name, pick.category);
        const filled = { ...variable, value: mappedValue(variableMapping[variable.name]) } as DocumentVariable;
        if (scope === VariablePropagationScope.GLOBAL) {
          if (!globalMap.has(variable.name)) globalMap.set(variable.name, filled);
        } else if (scope === VariablePropagationScope.CATEGORY) {
          let m = catMaps.get(pick.category);
          if (!m) {
            m = new Map();
            catMaps.set(pick.category, m);
          }
          if (!m.has(variable.name)) m.set(variable.name, filled);
        }
      }
    }
    const global_variables = { variables: Array.from(globalMap.values()) };
    const category_variables: Record<string, { variables: DocumentVariable[] }> = {};
    Array.from(catMaps.entries()).forEach(([cat, vars]) => {
      category_variables[cat] = { variables: Array.from(vars.values()) };
    });

    // ---- Insert project. ---------------------------------------------------
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: contractData.projectName,
        location: contractData.projectAddress,
        start_date: startDate,
        leader_id: assigneeData.id,
        company_id: companyId,
        global_variables,
        category_variables,
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
    if (projectError) {
      return NextResponse.json(
        { error: 'Failed to create project', details: projectError.message },
        { status: 500 }
      );
    }

    // ---- First phase is auto-created by DB trigger. -----------------------
    // `trg_projects_auto_first_phase` (PR 3c migration) handles the insert;
    // we just fetch it back.
    const { data: firstPhase, error: phaseError } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', project.id)
      .eq('is_current', true)
      .maybeSingle();
    if (phaseError) throw phaseError;
    if (!firstPhase) {
      return NextResponse.json(
        {
          error:
            'First phase was not auto-created. Ensure migration 20260422000000 ran and the company has an enabled display_order=1 phase definition.',
        },
        { status: 500 }
      );
    }

    // ---- Seed phase documents with pre-filled local variables. ------------
    if (uniquePicks.length > 0) {
      const rows = uniquePicks.map((pick) => {
        const tpl = templatesByName.get(pick.templateName);
        const filledVariables: DocumentVariable[] = (tpl?.variables ?? []).map(
          (v) => ({ ...v, value: mappedValue(variableMapping[v.name]) } as DocumentVariable)
        );
        const propagation: Record<
          string,
          {
            currentScope: VariablePropagationScope;
            possibleScopes: VariablePropagationScope[];
            isOverridden: boolean;
          }
        > = {};
        for (const variable of tpl?.variables ?? []) {
          const scope = scopeOf(variable.name, pick.category);
          const possible: VariablePropagationScope[] = [VariablePropagationScope.LOCAL];
          const catCount = uniquePicks.filter((p) => p.category === pick.category).length;
          if (catCount > 1) possible.push(VariablePropagationScope.CATEGORY);
          const seen = new Set(
            uniquePicks
              .filter((p) => {
                const t = templatesByName.get(p.templateName);
                return (t?.variables ?? []).some((v) => v.name === variable.name);
              })
              .map((p) => p.category)
          );
          if (seen.size > 1) possible.push(VariablePropagationScope.GLOBAL);
          propagation[variable.name] = {
            currentScope: scope,
            possibleScopes: possible,
            isOverridden: false,
          };
        }
        return {
          project_phase_id: firstPhase.id,
          template_name: pick.templateName,
          category: pick.category,
          responsible_discipline: null,
          variables: { variables: filledVariables },
          propagation_settings: propagation,
          assignments: {},
          review_status: {},
          template_version_lock: null,
        };
      });
      const { error: docError } = await supabase.from('project_phase_documents').insert(rows);
      if (docError) throw docError;
    }

    // ---- Assign leader's assigned_projects. -------------------------------
    const { data: assignedUser } = await supabase
      .from('users')
      .select('assigned_projects')
      .eq('id', assigneeData.id)
      .single();
    if (assignedUser) {
      await supabase
        .from('users')
        .update({
          assigned_projects: [...(assignedUser.assigned_projects || []), project.id],
          updated_at: new Date().toISOString(),
        })
        .eq('id', assigneeData.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Project created successfully from contract data',
      project: {
        id: project.id,
        name: project.name,
        location: project.location,
        start_date: project.start_date,
        leader: project.leader,
        createdAt: project.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating project from contract:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createProjectFromContractHandler);
