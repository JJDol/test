/**
 * 🏢 GeneralVariablesSection - General Variables Display Component
 * 
 * PURPOSE: Displays general variables for a specific category
 * - Shows variables that appear in multiple templates
 * - Collapsible section with toggle functionality
 * - Variable input components with proper permissions
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across project components
 * - Clean separation of concerns
 */

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedVariableInput } from "@/components/enhanced-variable-input";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DocumentCategory, Project, VariablePropagationScope } from "@/lib/types/types";
import { DocumentTemplate } from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";

interface GeneralVariablesSectionProps {
  allTemplates: DocumentTemplate[];
  globalVariables: DocumentVariable[];
  templateVariables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
  propagationSettings: {
    [category in DocumentCategory]: {
    [templateName: string]: {
      [variableName: string]: {possibleScopes: VariablePropagationScope[], currentScope: VariablePropagationScope, isOverridden: boolean};
    };
  };}
  project: Project;
  collapsed: boolean; 
  canEdit: boolean;
  onToggleCollapse: () => void;
  onVariableChange: (templateName: string, name: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
}

export function GeneralVariablesSection({
  allTemplates,
  globalVariables,
  templateVariables,
  propagationSettings,
  project,
  collapsed,
  canEdit,
  onToggleCollapse,
  onVariableChange,
}: GeneralVariablesSectionProps) {
  // Helper function to get all template names assigned to this project
  const getProjectTemplateNames = (): string[] => {
    const templateNames: string[] = [];
    
    // Get templates from each category field
    Object.values(DocumentCategory).forEach(category => {
      const categoryField = `${category.toLowerCase()}_templates` as keyof Project;
      const templates = project[categoryField] as string[] || [];
      templateNames.push(...templates);
    });
    
    return templateNames;
  };
   
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Global Variables
            <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200 rounded px-2 min-w-[1.5rem] justify-center">
              {globalVariables.length}
            </Badge>
          </h3>
          <p className="text-sm text-gray-600">
            These variables appear in multiple categories
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
          {globalVariables.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No global variables found. Global variables are shared across all categories.
            </p>
          )}
          {globalVariables.map((variable) => {
            // ✅ Issue 12 fix — D2 X2 정책: SSOT(project.global_variables)에서 직접 조회.
            // 기존: 모든 template의 doc.variables를 순회해 첫 non-empty 값을 사용 (옛 SSOT 패턴).
            //       이 경로는 GLOBAL scope 변수의 입력 값이 doc.variables에 동기되지 않으면 빈값으로 표시됨.
            // 신규: project.global_variables.variables에서 직접 lookup.
            //       SSOT entry 미존재 시 기존 doc.variables 경로로 fallback (마이그레이션 호환).
            let generalValue: any = '';
            const ssotEntry = (project.global_variables?.variables ?? []).find((v) => v.name === variable.name);
            if (ssotEntry && ssotEntry.value !== undefined && ssotEntry.value !== null && ssotEntry.value !== '') {
              generalValue = ssotEntry.value;
            } else {
              for (const template of allTemplates) {
                const propagationSetting = propagationSettings[template.category]?.[template.name]?.[variable.name];
                const useGlobal = propagationSetting?.currentScope !== VariablePropagationScope.LOCAL && propagationSetting?.currentScope !== VariablePropagationScope.CATEGORY;
                if (useGlobal) {
                  const variableObj = templateVariables[template.category]?.[template.name]?.variables?.find(v => v.name === variable.name);
                  if (variableObj && variableObj.value && variableObj.value !== '') {
                    generalValue = variableObj.value;
                    break;
                  }
                }
              }
            }
            
            // Find the original template variable to get dropdownOptions
            const projectTemplateNames = getProjectTemplateNames();
            const templateWithVariable = allTemplates.find(template =>
              template.variables.some(v => v.name === variable.name) &&
              projectTemplateNames.includes(template.name)
            );
            const originalVariable = templateWithVariable?.variables.find(v => v.name === variable.name);
            
            return (
              <div key={variable.name} className="space-y-2">
                <EnhancedVariableInput
                  variable={{
                    name: variable.name,
                    type: variable.type as any,
                    value: generalValue,
                    // Include dropdownOptions from the original template variable
                    ...(originalVariable && 'dropdownOptions' in originalVariable && { dropdownOptions: originalVariable.dropdownOptions })
                  } as any}
                  onChange={(value) => {
                      // For general variables, just call handleVariableChange with any template that contains this variable
                      // The function will handle the propagation logic
                      const projectTemplateNames = getProjectTemplateNames();
                      const firstTemplate = allTemplates.find(template =>
                        template.variables.some(v => v.name === variable.name) &&
                        projectTemplateNames.includes(template.name)
                      );
                    if (firstTemplate) {
                      onVariableChange(firstTemplate.name, variable.name, value, firstTemplate.category,  true, false);
                    }
                  }}
                  disabled={!canEdit}
                  projectId={project.id}
                  templateName={(() => {
                    const projectTemplateNames = getProjectTemplateNames();
                    return allTemplates.find(template =>
                      template.variables.some(v => v.name === variable.name) &&
                      projectTemplateNames.includes(template.name)
                    )?.name;
                  })()}
                />
                <p className="text-xs text-gray-600">
                  
                  Used in: {(() => {
                    const projectTemplateNames = getProjectTemplateNames();
                    const matchingTemplates = allTemplates.filter(template => 
                      template.variables.some(v => v.name === variable.name) &&
                      projectTemplateNames.includes(template.name)
                    );
                    return matchingTemplates.map(template => template.name).join(', ');
                  })()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
