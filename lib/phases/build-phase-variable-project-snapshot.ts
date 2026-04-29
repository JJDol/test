/**
 * Build a synthetic `projects`-shaped row for VariableProcessor / variables API
 * from `project_phase_documents` on the current phase.
 */

import { DocumentCategory } from "@/lib/types/types";

export type PhaseDocRow = {
  category: string;
  template_name: string;
  variables: unknown;
  propagation_settings: unknown;
};

export function buildProjectTemplateSourceFromPhaseDocuments<
  T extends Record<string, unknown>,
>(baseProject: T, docs: PhaseDocRow[]): T & Record<string, unknown> {
  const template_variables: Record<string, Record<string, { variables: unknown[] }>> = {};
  const variable_propagation_settings: Record<
    string,
    Record<string, Record<string, unknown>>
  > = {};
  const templatesByCategory: Record<string, string[]> = {};

  for (const doc of docs) {
    const cat = doc.category as string;
    if (!template_variables[cat]) template_variables[cat] = {};
    const raw = doc.variables;
    const varsPayload =
      raw &&
      typeof raw === "object" &&
      raw !== null &&
      Array.isArray((raw as { variables?: unknown }).variables)
        ? (raw as { variables: unknown[] })
        : { variables: [] as unknown[] };
    template_variables[cat][doc.template_name] = varsPayload;

    if (!variable_propagation_settings[cat]) variable_propagation_settings[cat] = {};
    variable_propagation_settings[cat][doc.template_name] =
      (doc.propagation_settings as Record<string, unknown>) ?? {};

    if (!templatesByCategory[cat]) templatesByCategory[cat] = [];
    templatesByCategory[cat].push(doc.template_name);
  }

  const templateArrays: Record<string, string[]> = {};
  Object.values(DocumentCategory).forEach((cat) => {
    const key = `${String(cat).toLowerCase()}_templates`;
    templateArrays[key] = templatesByCategory[cat] ?? [];
  });

  return {
    ...baseProject,
    ...templateArrays,
    template_variables,
    variable_propagation_settings,
  };
}
