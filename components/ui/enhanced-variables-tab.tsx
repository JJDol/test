"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Loader2, Save, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { VariableInput } from "@/components/ui/variable-input";
import { DocumentCategory } from "@/lib/types/types";
import { VariableType} from "@/utils/variable-type-styles"

interface ProcessedVariable {
  name: string;
  type: VariableType;
  documents: string[];
  isGeneral: boolean;
}

interface ProjectVariables {
  generalVariables: ProcessedVariable[];
  documentSpecificVariables: { [templateName: string]: ProcessedVariable[] };
  generalVariablesByCategory: { [category: string]: ProcessedVariable[] };
}

interface CurrentValues {
  general: { [variableName: string]: { value: any; type: string } };
  template: { [templateName: string]: { [variableName: string]: any } };
  propagation: {
    [templateName: string]: {
      [variableName: string]: { use_general: boolean };
    };
  };
}

interface Permissions {
  canEdit: boolean;
  canEditGeneral: boolean;
}

interface EnhancedVariablesTabProps {
  projectId: string;
  templates: Array<{
    name: string;
    category: DocumentCategory;
    variables: string[];
  }>;
}

export function EnhancedVariablesTab({ projectId, templates }: EnhancedVariablesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processedVariables, setProcessedVariables] = useState<ProjectVariables | null>(null);
  const [currentValues, setCurrentValues] = useState<CurrentValues>({
    general: {},
    template: {},
    propagation: {}
  });
  const [permissions, setPermissions] = useState<Permissions>({
    canEdit: false,
    canEditGeneral: false
  });
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>(DocumentCategory.ARCHITECTURE);
  const [collapsedGeneralSections, setCollapsedGeneralSections] = useState<{ [category: string]: boolean }>({});
  const { toast } = useToast();

  const fetchVariables = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/variables`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch variables');
      }

      const data = await response.json();
      console.log('Fetched variables data:', data);
      console.log('Permissions received:', data.permissions);
      
      setProcessedVariables({
        generalVariables: data.generalVariables,
        documentSpecificVariables: data.documentSpecificVariables,
        generalVariablesByCategory: data.generalVariablesByCategory || {}
      });
      setCurrentValues(data.currentValues);
      setPermissions(data.permissions);
    } catch (error) {
      console.error('Error fetching variables:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch variables',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveVariables = async () => {
    try {
      setSaving(true);
      
      const payload = {
        generalVariables: currentValues.general,
        templateVariables: currentValues.template,
        propagationSettings: currentValues.propagation
      };
      
      console.log('Saving variables with payload:', payload);
      console.log('Current permissions:', permissions);
      
      const response = await fetch(`/api/projects/${projectId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error response:', error);
        throw new Error(error.error || 'Failed to save variables');
      }

      const result = await response.json();
      console.log('Save successful:', result);

      toast({
        title: "Success",
        description: "Variables saved successfully",
      });
      
      // Refresh data to see the saved values
      await fetchVariables();
    } catch (error) {
      console.error('Error saving variables:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save variables',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchVariables();
  }, [projectId]);

  // Initialize propagation settings when processed variables are loaded
  useEffect(() => {
    if (processedVariables) {
      initializePropagationSettings();
    }
  }, [processedVariables]);

  const updateGeneralVariable = (variableName: string, value: any) => {
    console.log('updateGeneralVariable called:', { variableName, value, canEditGeneral: permissions.canEditGeneral });
    
    if (!permissions.canEditGeneral) {
      console.log('Cannot edit general variables - permission denied');
      return;
    }
    
    setCurrentValues(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [variableName]: {
          value,
          type: processedVariables?.generalVariables.find(v => v.name === variableName)?.type || 'text'
        }
      }
    }));
  };

  const updateTemplateVariable = (templateName: string, variableName: string, value: any) => {
    if (!permissions.canEdit) return;
    
    setCurrentValues(prev => ({
      ...prev,
      template: {
        ...prev.template,
        [templateName]: {
          ...prev.template[templateName],
          [variableName]: value
        }
      }
    }));
  };

  const updatePropagationSetting = (templateName: string, variableName: string, useGeneral: boolean) => {
    if (!permissions.canEditGeneral) return;
    
    setCurrentValues(prev => ({
      ...prev,
      propagation: {
        ...prev.propagation,
        [templateName]: {
          ...prev.propagation[templateName],
          [variableName]: { use_general: useGeneral }
        }
      }
    }));
  };

  // Initialize propagation settings for new templates that share general variables
  const initializePropagationSettings = () => {
    if (!processedVariables) return;
    
    const newPropagationSettings: typeof currentValues.propagation = {};
    let hasChanges = false;
    
    // Go through all templates and their general variables
    Object.values(DocumentCategory).forEach(category => {
      const categoryTemplates = getTemplatesByCategory(category);
      const categoryGeneralVariables = processedVariables.generalVariablesByCategory?.[category] || [];
      
      categoryTemplates.forEach(template => {
        const generalVarsInTemplate = categoryGeneralVariables.filter(
          gv => gv.documents.includes(template.name)
        );
        
        if (generalVarsInTemplate.length > 0) {
          if (!newPropagationSettings[template.name]) {
            newPropagationSettings[template.name] = {};
          }
          
          generalVarsInTemplate.forEach(variable => {
            // Only initialize if not already set
            if (currentValues.propagation[template.name]?.[variable.name]?.use_general === undefined) {
              newPropagationSettings[template.name][variable.name] = { use_general: true };
              hasChanges = true;
            }
          });
        }
      });
    });
    
    // Update state if we have new propagation settings
    if (hasChanges) {
      setCurrentValues(prev => ({
        ...prev,
        propagation: {
          ...prev.propagation,
          ...newPropagationSettings
        }
      }));
    }
  };

  const getVariableValue = (variableName: string, templateName?: string): any => {
    if (templateName) {
      const useGeneral = isUsingGeneral(templateName, variableName);
      if (useGeneral && currentValues.general[variableName]) {
        return currentValues.general[variableName].value || '';
      }
      const templateValue = currentValues.template[templateName]?.[variableName];
      return templateValue === null || templateValue === undefined ? '' : templateValue;
    }
    const generalValue = currentValues.general[variableName]?.value;
    return generalValue === null || generalValue === undefined ? '' : generalValue;
  };

  const isUsingGeneral = (templateName: string, variableName: string): boolean => {
    // Check if there's an explicit propagation setting
    const propagationSetting = currentValues.propagation[templateName]?.[variableName]?.use_general;
    
    // If no explicit setting, default to true for general variables (they should propagate by default)
    if (propagationSetting === undefined) {
      // Check if this variable is a general variable
      const isGeneralVariable = processedVariables?.generalVariablesByCategory 
        ? Object.values(processedVariables.generalVariablesByCategory)
            .flat()
            .some(gv => gv.name === variableName && gv.documents.includes(templateName))
        : false;
      
      return isGeneralVariable; // Default to true for general variables, false for template-specific
    }
    
    return propagationSetting;
  };

  const toggleGeneralSectionCollapse = (category: string) => {
    setCollapsedGeneralSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getTemplatesByCategory = (category: DocumentCategory) => {
    return templates.filter(template => template.category === category);
  };

  const getCategoryVariables = (category: DocumentCategory) => {
    const categoryTemplates = getTemplatesByCategory(category);
    const variables: { [templateName: string]: ProcessedVariable[] } = {};
    
    categoryTemplates.forEach(template => {
      variables[template.name] = processedVariables?.documentSpecificVariables[template.name] || [];
    });
    
    return variables;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!processedVariables) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No variables found</p>
        <Button onClick={fetchVariables} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document-Specific Variables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Variables</CardTitle>
            <div className="flex gap-2">
              <Button onClick={fetchVariables} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={saveVariables} disabled={saving || !permissions.canEdit} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as DocumentCategory)}>
            {(() => {
              // Use the total number of document categories from the enum
              const totalCategories = Object.values(DocumentCategory).length;
              
              return (
                <TabsList className={`grid grid-cols-${totalCategories} mb-6 w-full`}>
                  {Object.values(DocumentCategory).map((category) => {
                    const categoryTemplates = getTemplatesByCategory(category);
                    return (
                      <TabsTrigger
                        key={category}
                        value={category}
                        className="px-4 py-2"
                        disabled={categoryTemplates.length === 0}
                      >
                        <div className="text-center">
                          <div className="text-xs">{category.replace('_', ' ')}</div>
                          {categoryTemplates.length > 0 && (
                            <div className="text-xs text-gray-500">({categoryTemplates.length})</div>
                          )}
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              );
            })()}

            {Object.values(DocumentCategory).map((category) => {
              const categoryTemplates = getTemplatesByCategory(category);
              const categoryVariables = getCategoryVariables(category);
              const categoryGeneralVariables = processedVariables?.generalVariablesByCategory?.[category] || [];

              return (
                <TabsContent key={category} value={category} className="space-y-4">
                  {categoryTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No {category.replace('_', ' ').toLowerCase()} templates in this project
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Category-specific General Variables Section */}
                      {categoryGeneralVariables.length > 0 && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2">
                                General Variables for {category.replace('_', ' ')}
                                <Badge variant="outline">{categoryGeneralVariables.length}</Badge>
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleGeneralSectionCollapse(category)}
                              >
                                {collapsedGeneralSections[category] ? <ChevronDown /> : <ChevronUp />}
                              </Button>
                            </div>
                          </CardHeader>
                          {!collapsedGeneralSections[category] && (
                            <CardContent className="space-y-4">
                              <p className="text-sm text-gray-600">
                                These variables appear in multiple {category.replace('_', ' ').toLowerCase()} templates and can be filled once to propagate everywhere.
                              </p>
                              <div className="grid gap-4">
                                {categoryGeneralVariables.map((variable) => (
                                  <div key={variable.name}>
                                    <VariableInput
                                      name={variable.name}
                                      type={variable.type}
                                      value={getVariableValue(variable.name)}
                                      onChange={(value) => updateGeneralVariable(variable.name, value)}
                                      disabled={!permissions.canEditGeneral}
                                    />
                                    <div className="mt-1 text-xs text-gray-500">
                                      Used in: {variable.documents.join(', ')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      )}

                      {categoryTemplates.map((template) => {
                        const templateVariables = categoryVariables[template.name] || [];
                        const generalVarsInTemplate = categoryGeneralVariables.filter(
                          gv => gv.documents.includes(template.name)
                        );
                        const allTemplateVars = [...generalVarsInTemplate, ...templateVariables];

                        return (
                          <Card key={template.name}>
                            <CardHeader>
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {allTemplateVars.length === 0 ? (
                                <p className="text-sm text-gray-500">No variables in this template</p>
                              ) : (
                                <>
                                  {/* General variables used in this template */}
                                  {generalVarsInTemplate.length > 0 && (
                                    <div>
                                      <Label className="text-sm font-medium text-blue-600">
                                        General Variables (can propagate)
                                      </Label>
                                      <div className="space-y-4 mt-2">
                                        {generalVarsInTemplate.map((variable) => (
                                          <div key={variable.name} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                checked={isUsingGeneral(template.name, variable.name)}
                                                onCheckedChange={(checked) => 
                                                  updatePropagationSetting(template.name, variable.name, checked as boolean)
                                                }
                                                disabled={!permissions.canEditGeneral}
                                              />
                                              <Label className="text-sm">
                                                Use from General Variables
                                              </Label>
                                            </div>
                                            <VariableInput
                                              name={variable.name}
                                              type={variable.type}
                                              value={getVariableValue(variable.name, template.name)}
                                              onChange={(value) => {
                                                if (isUsingGeneral(template.name, variable.name)) {
                                                  updateGeneralVariable(variable.name, value);
                                                } else {
                                                  updateTemplateVariable(template.name, variable.name, value);
                                                }
                                              }}
                                              disabled={
                                                !permissions.canEdit || 
                                                (isUsingGeneral(template.name, variable.name) && !permissions.canEditGeneral)
                                              }
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Document-specific variables */}
                                  {templateVariables.length > 0 && (
                                    <div>
                                      {generalVarsInTemplate.length > 0 && <hr className="my-4 border-gray-200" />}
                                      <Label className="text-sm font-medium text-purple-600">
                                        Document-Specific Variables
                                      </Label>
                                      <div className="space-y-4 mt-2">
                                        {templateVariables.map((variable) => (
                                          <VariableInput
                                            key={variable.name}
                                            name={variable.name}
                                            type={variable.type}
                                            value={getVariableValue(variable.name, template.name)}
                                            onChange={(value) => 
                                              updateTemplateVariable(template.name, variable.name, value)
                                            }
                                            disabled={!permissions.canEdit}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 