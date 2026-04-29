import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { VariableProcessor } from '@/lib/services/processors/project-variable-processor';
import { buildProjectTemplateSourceFromPhaseDocuments } from '@/lib/phases/build-phase-variable-project-snapshot';

function cloneJson<T>(v: T): T {
  if (v === null || v === undefined) return v;
  return JSON.parse(JSON.stringify(v));
}

async function loadCurrentPhaseDocumentsWithIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
) {
  const { data: phase } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .maybeSingle();

  if (!phase?.id) {
    return { phaseId: null as string | null, docs: [] as Record<string, unknown>[] };
  }

  const { data: docs, error } = await supabase
    .from('project_phase_documents')
    .select('id, category, template_name, variables, propagation_settings')
    .eq('project_phase_id', phase.id);

  if (error) {
    console.error('loadCurrentPhaseDocumentsWithIds:', error);
    return { phaseId: phase.id as string, docs: [] as Record<string, unknown>[] };
  }

  return { phaseId: phase.id as string, docs: (docs ?? []) as Record<string, unknown>[] };
}

/**
 * Project Variables API Routes
 *
 * GET/POST: Template + propagation payloads are sourced from the **current**
 * phase's `project_phase_documents` when rows exist; otherwise legacy
 * `projects.template_variables` is used. Global/category variable definitions
 * stay on `projects`.
 */

async function getVariablesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError || !userProfile?.company_id) {
      return NextResponse.json({ error: "User not assigned to company" }, { status: 403 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', userProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const canAccess =
      userProfile.role === 'ADMIN' ||
      userProfile.role === 'COMPANY_ADMIN' ||
      project.leader_id === request.user.id ||
      project.workers?.includes(request.user.id);

    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { docs } = await loadCurrentPhaseDocumentsWithIds(supabase, projectId);
    const projectForProcessor =
      docs.length > 0
        ? buildProjectTemplateSourceFromPhaseDocuments(
            project as Record<string, unknown>,
            docs as Parameters<typeof buildProjectTemplateSourceFromPhaseDocuments>[1]
          )
        : null;

    const variableProcessor = new VariableProcessor();
    const processedVariables = await variableProcessor.processProjectVariables(
      projectId,
      userProfile.company_id,
      request.user.id,
      projectForProcessor ?? undefined
    );

    const varName = (v: any) => (typeof v === 'string' ? v : v.name);

    const flattenedGeneralValues: {
      [variableName: string]: { value: any; type: string };
    } = {};

    const flattenSource = (projectForProcessor ?? project) as typeof project;

    if (project.global_variables?.variables) {
      project.global_variables.variables.forEach((variable: any) => {
        if (variable.name) {
          let variableValue = '';
          const categories = Object.keys(flattenSource.template_variables || {});

          for (const cat of categories) {
            const templates = Object.keys(flattenSource.template_variables[cat] || {});
            for (const tName of templates) {
              const vars = flattenSource.template_variables[cat][tName]?.variables || [];
              const v = vars.find((varObj: any) => varName(varObj) === variable.name);
              if (v && v.value) {
                variableValue = v.value;
                break;
              }
            }
            if (variableValue) break;
          }

          flattenedGeneralValues[variable.name] = {
            value: variableValue,
            type: variable.type || 'text',
          };
        }
      });
    }

    if (project.category_variables) {
      Object.values(project.category_variables).forEach((catObj: any) => {
        if (catObj.variables) {
          catObj.variables.forEach((variable: any) => {
            if (variable.name && !flattenedGeneralValues[variable.name]) {
              let variableValue = '';
              const categories = Object.keys(flattenSource.template_variables || {});
              for (const cat of categories) {
                const templates = Object.keys(flattenSource.template_variables[cat] || {});
                for (const tName of templates) {
                  const vars = flattenSource.template_variables[cat][tName]?.variables || [];
                  const v = vars.find((varObj: any) => varName(varObj) === variable.name);
                  if (v && v.value) {
                    variableValue = v.value;
                    break;
                  }
                }
                if (variableValue) break;
              }

              flattenedGeneralValues[variable.name] = {
                value: variableValue,
                type: variable.type || 'text',
              };
            }
          });
        }
      });
    }

    return NextResponse.json({
      generalVariables: processedVariables.globalVariables,
      documentSpecificVariables: processedVariables.documentSpecificVariables,
      generalVariablesByCategory: processedVariables.categoryVariables,
      currentValues: {
        general: flattenedGeneralValues,
        template: flattenSource.template_variables || {},
        propagation: flattenSource.variable_propagation_settings || {},
      },
    });
  } catch (error) {
    console.error('Error fetching variables:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function updateVariablesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const {
      generalVariables = null,
      templateVariables = null,
      propagationSettings = null,
    } = await request.json();

    const supabase = await createClient();

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError || !userProfile?.company_id) {
      return NextResponse.json({ error: "User not assigned to company" }, { status: 403 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', userProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const variableProcessor = new VariableProcessor();
    const permission = await variableProcessor.checkProjectAccess(
      projectId,
      userProfile.company_id,
      request.user.id
    );

    if (!permission) {
      return NextResponse.json({ error: "Edit access denied" }, { status: 403 });
    }

    const { docs } = await loadCurrentPhaseDocumentsWithIds(supabase, projectId);
    const usePhaseDocuments = docs.length > 0;

    const projectPayload = usePhaseDocuments
      ? buildProjectTemplateSourceFromPhaseDocuments(
          project as Record<string, unknown>,
          docs as Parameters<typeof buildProjectTemplateSourceFromPhaseDocuments>[1]
        )
      : (project as Record<string, unknown>);

    let updatedTemplateVariables = cloneJson(
      (projectPayload.template_variables || {}) as Record<string, Record<string, { variables: any[] }>>
    );

    let mergedPropagation = cloneJson(
      (projectPayload.variable_propagation_settings || {}) as Record<
        string,
        Record<string, Record<string, unknown>>
      >
    );

    if (generalVariables && permission) {
      Object.entries(generalVariables).forEach(([variableName, variableData]: [string, any]) => {
        const value = variableData.value;

        const isGlobal = project.global_variables?.variables?.some((v: any) => v.name === variableName);

        if (isGlobal) {
          Object.keys(updatedTemplateVariables || {}).forEach((cat) => {
            Object.keys(updatedTemplateVariables[cat] || {}).forEach((tName) => {
              const scope =
                (projectPayload as any).variable_propagation_settings?.[cat]?.[tName]?.[variableName]
                  ?.currentScope;
              if (scope === 'GLOBAL') {
                if (!updatedTemplateVariables[cat][tName]) {
                  updatedTemplateVariables[cat][tName] = { variables: [] };
                }
                const vIndex = updatedTemplateVariables[cat][tName].variables.findIndex(
                  (v: any) => v.name === variableName
                );
                if (vIndex >= 0) {
                  updatedTemplateVariables[cat][tName].variables[vIndex].value = value;
                }
              }
            });
          });
        }

        Object.keys(project.category_variables || {}).forEach((cat) => {
          const isCategoryVar = project.category_variables[cat]?.variables?.some(
            (v: any) => v.name === variableName
          );
          if (isCategoryVar) {
            Object.keys(updatedTemplateVariables[cat] || {}).forEach((tName) => {
              const scope =
                (projectPayload as any).variable_propagation_settings?.[cat]?.[tName]?.[variableName]
                  ?.currentScope;
              if (scope === 'CATEGORY') {
                if (!updatedTemplateVariables[cat][tName]) {
                  updatedTemplateVariables[cat][tName] = { variables: [] };
                }
                const vIndex = updatedTemplateVariables[cat][tName].variables.findIndex(
                  (v: any) => v.name === variableName
                );
                if (vIndex >= 0) {
                  updatedTemplateVariables[cat][tName].variables[vIndex].value = value;
                }
              }
            });
          }
        });
      });
    }

    if (templateVariables) {
      Object.keys(templateVariables).forEach((cat) => {
        if (!updatedTemplateVariables[cat]) updatedTemplateVariables[cat] = {};
        Object.assign(updatedTemplateVariables[cat], templateVariables[cat] || {});
      });
    }

    if (propagationSettings && permission) {
      mergedPropagation = propagationSettings as typeof mergedPropagation;
    }

    const updatedAt = new Date().toISOString();

    if (usePhaseDocuments) {
      for (const d of docs) {
        const cat = String(d.category);
        const tName = String(d.template_name);
        const variables =
          updatedTemplateVariables?.[cat]?.[tName] ?? (d.variables as { variables: any[] });
        const propagation =
          mergedPropagation?.[cat]?.[tName] ?? (d.propagation_settings as Record<string, unknown>) ?? {};

        const { error: uerr } = await supabase
          .from('project_phase_documents')
          .update({
            variables,
            propagation_settings: propagation,
            updated_at: updatedAt,
          })
          .eq('id', d.id as string);

        if (uerr) {
          console.error('Error updating phase document variables:', uerr);
          return NextResponse.json(
            { error: "Failed to update variables", details: uerr.message },
            { status: 500 }
          );
        }
      }

      const { error: projErr } = await supabase
        .from('projects')
        .update({ updated_at: updatedAt })
        .eq('id', projectId)
        .eq('company_id', userProfile.company_id);

      if (projErr) {
        console.error('Error updating project timestamp:', projErr);
        return NextResponse.json(
          { error: "Failed to update project", details: projErr.message },
          { status: 500 }
        );
      }
    } else {
      const updateData: Record<string, unknown> = {
        updated_at: updatedAt,
        template_variables: updatedTemplateVariables,
        variable_propagation_settings: mergedPropagation,
      };

      const { error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('company_id', userProfile.company_id);

      if (updateError) {
        console.error('Error updating project variables:', updateError);
        return NextResponse.json(
          { error: "Failed to update variables", details: updateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Variables updated successfully",
    });
  } catch (error) {
    console.error('Error updating variables:', error);
    return NextResponse.json(
      {
        error: "Failed to update variables",
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://aticon-autodoc-new.vercel.app',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export const GET = withAuthDynamic(getVariablesHandler);
export const POST = withAuthDynamic(updateVariablesHandler);
