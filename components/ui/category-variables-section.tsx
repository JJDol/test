/**
 * 🏢 CategoryVariablesSection - Category Variables Display Component
 * 
 * PURPOSE: Displays category variables for a specific category
 * - Shows variables that appear in multiple templates within the same category
 * - Handles global vs category value selection
 * - Collapsible section with toggle functionality
 * - Variable input components with proper permissions
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across project components
 * - Clean separation of concerns
 */

"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DocumentCategory, VariablePropagationScope } from "@/lib/types/types";
import { DocumentTemplate } from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

interface CategoryVariablesSectionProps {
  category: DocumentCategory;
  categoryVariables: DocumentVariable[];
  categoryTemplates: DocumentTemplate[];
  templateVariables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  } | {};
  propagationSettings: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        [variableName: string]: {
          possibleScopes: VariablePropagationScope[];
          currentScope: VariablePropagationScope;
          isOverridden: boolean;
        };
      };
    };
  } | {};
  globalVariables: DocumentVariable[];
  /**
   * ✅ Issue B + D2 X2'' (2026-05-13)
   * Category SSOT (phase-level via virtualProject.category_variables[category].variables).
   * 값 조회는 이 SSOT 우선, 비어있으면 templateVariables(legacy)로 fallback.
   */
  categorySSOTVariables?: DocumentVariable[];
  collapsed: boolean;
  canEdit: boolean;
  projectId?: string;
  onToggleCollapse: () => void;
  onVariableChange: (templateName: string, name: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
  onPropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
}

export function CategoryVariablesSection({
  category,
  categoryVariables,
  categoryTemplates,
  templateVariables,
  propagationSettings,
  globalVariables,
  categorySSOTVariables,
  collapsed,
  canEdit,
  projectId,
  onToggleCollapse,
  onVariableChange,
  onPropagationChange,
}: CategoryVariablesSectionProps) {
  const t = useTranslations("projectDetails");
  // Helper function to get the current scope for a variable in a template
  const getVariableScope = (templateName: string, variableName: string) => {
    return (propagationSettings as any)[category]?.[templateName]?.[variableName]?.currentScope;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {t("categoryVariables")}
            <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200 rounded px-2 min-w-[1.5rem] justify-center">
              {categoryVariables.length}
            </Badge>
          </h3>
          <p className="text-sm text-gray-600">
            {t("categoryVariablesDescription", { category })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </div>
      
      {!collapsed && (
        <div className="grid gap-4">
          {categoryVariables.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              {t("noCategoryVariablesFound")}
            </p>
          )}
          {categoryVariables.map((variable) => {
            // Use declared scope from the variable directly
            const declaredScope = (variable as any).scope || 'category';
            // Check if this variable is also declared as global
            const isGlobalVariable = declaredScope === 'global' || globalVariables.some(gv => gv.name === variable.name);
            
            // Find the first template that has this variable to use as reference
            const firstTemplate = categoryTemplates.find(template => 
              template.variables.some(v => v.name === variable.name)
            );
            
            if (!firstTemplate) return null;
            
            // Check if any template in the category has this variable set to category scope
            const hasCategoryScope = categoryTemplates.some(template => {
              const scope = getVariableScope(template.name, variable.name);
              return scope === VariablePropagationScope.CATEGORY;
            });
            
            // Get the current scope for this variable in the first template (for display purposes)
            const currentScope = getVariableScope(firstTemplate.name, variable.name);
            const useCategory = hasCategoryScope;
            
            // ✅ Issue B + D2 X2'' (2026-05-13) — SSOT 우선 조회
            // useCategory=true 일 땐 categorySSOTVariables(=phase의 category_variables[category].variables)에서 직접 값 조회.
            // SSOT 미스 시에만 legacy templateVariables 경로로 fallback.
            // useCategory=false 일 땐 global SSOT는 부모(virtualProject.global_variables)가
            // 이미 globalVariables prop으로 전달되므로 이를 우선 조회.
            let currentValue: any = '';
            if (useCategory) {
              const ssotEntry = (categorySSOTVariables ?? []).find((v) => v.name === variable.name);
              if (ssotEntry && ssotEntry.value !== undefined && ssotEntry.value !== null && ssotEntry.value !== '') {
                currentValue = ssotEntry.value;
              } else {
                // legacy fallback (마이그레이션 전 안전망)
                for (const template of categoryTemplates) {
                  const scope = getVariableScope(template.name, variable.name);
                  if (scope === VariablePropagationScope.CATEGORY) {
                    const variableObj = (templateVariables as any)[template.category]?.[template.name]?.variables?.find((v: DocumentVariable) => v.name === variable.name);
                    if (variableObj && variableObj.value && variableObj.value !== '') {
                      currentValue = variableObj.value;
                      break;
                    }
                  }
                }
              }
            } else {
              // GLOBAL scope 표시 — global SSOT 우선
              const globalEntry = globalVariables.find((v) => v.name === variable.name);
              if (globalEntry && globalEntry.value !== undefined && globalEntry.value !== null && globalEntry.value !== '') {
                currentValue = globalEntry.value;
              } else {
                // legacy fallback
                for (const template of categoryTemplates) {
                  const scope = getVariableScope(template.name, variable.name);
                  if (scope === VariablePropagationScope.GLOBAL) {
                    const variableObj = (templateVariables as any)[template.category]?.[template.name]?.variables?.find((v: DocumentVariable) => v.name === variable.name);
                    if (variableObj && variableObj.value && variableObj.value !== '') {
                      currentValue = variableObj.value;
                      break;
                    }
                  }
                }
              }
            }
            
            // Get dropdownOptions from the first template's variable definition
            const originalVariable = firstTemplate.variables.find(v => v.name === variable.name);
            
            return (
              <div key={variable.name} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <EnhancedVariableInput
                    variable={{
                      name: variable.name,
                      type: variable.type as any,
                      value: currentValue,
                      // Include dropdownOptions from the original template variable
                      ...(originalVariable && 'dropdownOptions' in originalVariable && { dropdownOptions: originalVariable.dropdownOptions })
                    } as any}
                    onChange={(value) => {
                      // Determine if this should be treated as local based on current scope
                      const isCurrentlyLocal = currentScope === VariablePropagationScope.LOCAL;

                      onVariableChange(firstTemplate.name, variable.name, value, firstTemplate.category,
                        false, // isGlobal: never global in category section
                        hasCategoryScope && !isCurrentlyLocal // isCategory: only if any template has category scope AND not local
                      );
                    }}
                    disabled={!canEdit}
                    projectId={projectId}
                    templateName={firstTemplate.name}
                  />
                  
                  {isGlobalVariable && (
                    <div className="flex items-center space-x-2 ml-4">
                      <Checkbox
                        id={`use-category-${variable.name}`}
                        checked={useCategory}
                        onCheckedChange={(checked) => onPropagationChange(firstTemplate.category, firstTemplate.name, variable.name, checked as boolean, false)}
                        disabled={!canEdit}
                      />
                      <label 
                        htmlFor={`use-category-${variable.name}`}
                        className="text-sm text-gray-600 cursor-pointer"
                      >
                        {t("useCategoryValue")}
                      </label>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    {t("usedIn")} {categoryTemplates.filter(template => 
                      template.variables.some(v => v.name === variable.name)
                    ).map(template => template.name).join(', ')}
                  </p>
                  {isGlobalVariable && (
                    <p className="text-blue-600">
                      {useCategory ? t("usingCategoryValue") : t("usingGlobalValue")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
