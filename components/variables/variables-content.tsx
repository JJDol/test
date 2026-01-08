/**
 *  VariablesContent - Orchestrator Component
 *
 * PURPOSE: Main orchestrator component for variable management
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { useTemplates } from "@/hooks/use-templates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { CategorySelector } from "@/components/ui/category-selector";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import { BaseVariable } from "@/lib/types/variable-types";

type DocumentTypeDefinition = {
  id: string;
  name: string;
  description: string;
  lastUpdated?: string;
  variables: VariableDefinition[];
};

type VariableDefinition = {
  id: string;
  name: string;
  type: BaseVariable["type"];
  dropdownOptions?: { displayText: string; value: string }[];
};

type GlobalVariableDefinition = {
  id: string;
  name: string;
  type: BaseVariable["type"];
  description?: string;
  lastUpdated?: string;
  dropdownOptions?: { displayText: string; value: string }[];
};

type DocumentTypeDialogState =
  | {
      mode: "create";
      category: DocumentCategory;
      documentType?: undefined;
    }
  | {
      mode: "edit";
      category: DocumentCategory;
      documentType: DocumentTypeDefinition;
    }
  | null;

const DEFAULT_DOCUMENT_TYPES: Record<DocumentCategory, DocumentTypeDefinition[]> = {
  [DocumentCategory.ARCHITECTURE]: [],
  [DocumentCategory.CONSTRUCTIONS]: [],
  [DocumentCategory.FIRE]: [],
  [DocumentCategory.AUTHORITY_PROCESSING]: [],
  [DocumentCategory.ENERGY]: [],
  [DocumentCategory.HVAC]: [],
  [DocumentCategory.EXECUTION_CONTROL]: []
};

export function VariablesContent() {
  const { templates, loading, error } = useTemplates();
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "GLOBAL">("GLOBAL");
  const [documentTypes, setDocumentTypes] = useState(DEFAULT_DOCUMENT_TYPES);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariableDefinition[]>([]);
  const [dialogState, setDialogState] = useState<DocumentTypeDialogState>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
  });
  const [variableDrafts, setVariableDrafts] = useState<
    Record<string, { name: string; type: BaseVariable["type"] }>
  >({});
  const [globalDraft, setGlobalDraft] = useState<{ name: string; type: BaseVariable["type"] }>({
    name: "",
    type: "text",
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const templateCount = useMemo(() => templates.length, [templates]);
  const totalDocumentTypes = useMemo(
    () => Object.values(documentTypes).reduce((acc, list) => acc + list.length, 0),
    [documentTypes]
  );
  const totalGlobalVariables = globalVariables.length;
  const activeCategory: DocumentCategory | null =
    selectedCategory === "GLOBAL" ? null : (selectedCategory as DocumentCategory);

  useEffect(() => {
    if (!dialogState) {
      setFormValues({
        name: "",
        description: "",
      });
      return;
    }

    if (dialogState.mode === "edit") {
      setFormValues({
        name: dialogState.documentType.name,
        description: dialogState.documentType.description,
      });
    } else {
      setFormValues({
        name: "",
        description: "",
      });
    }
  }, [dialogState]);

  useEffect(() => {
    const loadGlobalDefaults = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("document_default_variables")
          .select("variables")
          .eq("category", "GLOBAL")
          .eq("document_type", "GLOBAL")
          .maybeSingle();

        if (error) {
          console.error("Failed to load document_default_variables:", error);
          return;
        }

        if (!data?.variables) return;

        const globalFromDb: GlobalVariableDefinition[] = (data.variables as any[]).map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          description: v.description,
          lastUpdated: undefined,
          dropdownOptions: v.dropdownOptions,
        }));

        setGlobalVariables(globalFromDb);
      } catch (e) {
        console.error("Unexpected error loading global defaults:", e);
      }
    };

    loadGlobalDefaults();
  }, []);

  useEffect(() => {
    const loadArchitectureDefaults = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "ARCHITECTURE");

        if (error) {
          console.error("Failed to load ARCHITECTURE defaults:", error);
          return;
        }
        if (!data || data.length === 0) return;

        const architectureTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `architecture-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.ARCHITECTURE]: architectureTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading ARCHITECTURE defaults:", e);
      }
    };

    loadArchitectureDefaults();
  }, []);

  useEffect(() => {
    const loadConstructionDefaults = async () => {
      try {
        const supabase = createClient();

        // Fetch all construction document types
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "CONSTRUCTION");

        if (error) {
          console.error("Failed to load construction document_default_variables:", error);
          return;
        }

        if (!data || data.length === 0) return;

        // Transform each row into DocumentTypeDefinition format
        const constructionTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `construction-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        // Update only the CONSTRUCTIONS category in documentTypes
        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.CONSTRUCTIONS]: constructionTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading construction defaults:", e);
      }
    };

    loadConstructionDefaults();
  }, []);

  useEffect(() => {
    const loadFireDefaults = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "FIRE");

        if (error) {
          console.error("Failed to load FIRE defaults:", error);
          return;
        }
        if (!data || data.length === 0) return;

        const fireTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `fire-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.FIRE]: fireTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading FIRE defaults:", e);
      }
    };

    loadFireDefaults();
  }, []);

  useEffect(() => {
    const loadAuthorityProcessingDefaults = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "AUTHORITY PROCESSING");

        if (error) {
          console.error("Failed to load AUTHORITY_PROCESSING defaults:", error);
          return;
        }
        if (!data || data.length === 0) return;

        const authorityProcessingTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `authority-processing-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.AUTHORITY_PROCESSING]: authorityProcessingTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading AUTHORITY_PROCESSING defaults:", e);
      }
    };

    loadAuthorityProcessingDefaults();
  }, []);

  useEffect(() => {
    const loadEnergyDefaults = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "ENERGY");

        if (error) {
          console.error("Failed to load ENERGY defaults:", error);
          return;
        }
        if (!data || data.length === 0) return;

        const energyTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `energy-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.ENERGY]: energyTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading ENERGY defaults:", e);
      }
    };

    loadEnergyDefaults();
  }, []);

  useEffect(() => {
    const loadHvacDefaults = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "HVAC");

        if (error) {
          console.error("Failed to load HVAC defaults:", error);
          return;
        }
        if (!data || data.length === 0) return;

        const hvacTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `hvac-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.HVAC]: hvacTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading HVAC defaults:", e);
      }
    };

    loadHvacDefaults();
  }, []);

  useEffect(() => {
    const loadExecutionControlDefaults = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("document_type, description, variables")
          .eq("category", "EXECUTION CONTROL");

        if (error) {
          console.error("Failed to load EXECUTION CONTROL defaults:", error);
          return;
        }
        if (!data || data.length === 0) return;

        const executionControlTypes: DocumentTypeDefinition[] = data.map((row, index) => ({
          id: `execution-control-${row.document_type.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          name: row.document_type,
          description: row.description || "",
          lastUpdated: undefined,
          variables: (row.variables as any[]).map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.type,
            dropdownOptions: v.dropdownOptions,
          })),
        }));

        setDocumentTypes(prev => ({
          ...prev,
          [DocumentCategory.EXECUTION_CONTROL]: executionControlTypes,
        }));
      } catch (e) {
        console.error("Unexpected error loading EXECUTION CONTROL defaults:", e);
      }
    };

    loadExecutionControlDefaults();
  }, []);

  const handleSaveDocumentType = () => {
    if (!dialogState) return;

    const trimmedName = formValues.name.trim();
    if (!trimmedName) {
      return;
    }

    const updatedType: DocumentTypeDefinition = {
      id:
        dialogState.mode === "edit"
          ? dialogState.documentType.id
          : `${dialogState.category.toLowerCase()}-${Date.now()}`,
      name: trimmedName,
      description: formValues.description.trim(),
      lastUpdated: "just now",
      variables:
        dialogState.mode === "edit" ? dialogState.documentType.variables : [],
    };

    setDocumentTypes(prev => {
      const next = { ...prev };
      const categoryList = next[dialogState.category] ?? [];

      if (dialogState.mode === "edit") {
        next[dialogState.category] = categoryList.map(type =>
          type.id === dialogState.documentType.id ? updatedType : type
        );
      } else {
        next[dialogState.category] = [...categoryList, updatedType];
      }

      return next;
    });

    setDialogState(null);
  };

  const handleDeleteDocumentType = (category: DocumentCategory, id: string) => {
    const confirmed = window.confirm("Delete this document type? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setDocumentTypes(prev => {
      const next = { ...prev };
      next[category] = (next[category] ?? []).filter(type => type.id !== id);
      return next;
    });
  };

  const handleAddGlobalVariable = () => {
    const trimmedName = globalDraft.name.trim();
    if (!trimmedName) {
      return;
    }

    const newVariable: GlobalVariableDefinition = {
      id: `global-${Date.now()}`,
      name: trimmedName,
      type: globalDraft.type,
      lastUpdated: "just now",
    };

    setGlobalVariables(prev => [...prev, newVariable]);
    setGlobalDraft(prev => ({ ...prev, name: "" }));
  };

  const handleDeleteGlobalVariable = (id: string) => {
    setGlobalVariables(prev => prev.filter(variable => variable.id !== id));
  };

  const variableTypeOptions: BaseVariable["type"][] = [
    "text",
    "image",
    "date",
    "number",
    "dropdown",
    "checkbox",
  ];

  const getDraftKey = (category: DocumentCategory, typeId: string) =>
    `${category}-${typeId}`;

  const handleVariableDraftChange = (
    category: DocumentCategory,
    typeId: string,
    field: "name" | "type",
    value: string
  ) => {
    const key = getDraftKey(category, typeId);
    setVariableDrafts(prev => ({
      ...prev,
      [key]: {
        name: field === "name" ? value : prev[key]?.name ?? "",
        type:
          field === "type"
            ? (value as BaseVariable["type"])
            : prev[key]?.type ?? "text",
      },
    }));
  };

  const handleAddVariable = (category: DocumentCategory, typeId: string) => {
    const key = getDraftKey(category, typeId);
    const draft = variableDrafts[key] ?? { name: "", type: "text" };
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      return;
    }

    const newVariable: VariableDefinition = {
      id: `${typeId}-${Date.now()}`,
      name: trimmedName,
      type: draft.type,
    };

    setDocumentTypes(prev => {
      const next = { ...prev };
      next[category] = next[category].map(type =>
        type.id === typeId
          ? { ...type, variables: [...type.variables, newVariable] }
          : type
      );
      return next;
    });

    setVariableDrafts(prev => ({
      ...prev,
      [key]: { name: "", type: draft.type },
    }));
  };

  const handleDeleteVariable = (
    category: DocumentCategory,
    typeId: string,
    variableId: string
  ) => {
    setDocumentTypes(prev => {
      const next = { ...prev };
      next[category] = next[category].map(type =>
        type.id === typeId
          ? {
              ...type,
              variables: type.variables.filter(variable => variable.id !== variableId),
            }
          : type
      );
      return next;
    });
  };

  const getDefaultCollapsed = (sectionId: string) =>
    sectionId === "global" ? false : true;

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const current = prev[sectionId] ?? getDefaultCollapsed(sectionId);
      return {
        ...prev,
        [sectionId]: !current,
      };
    });
  };

  const renderDocumentTypeCard = (category: DocumentCategory, type: DocumentTypeDefinition) => {
    const sectionId = `document-${category}-${type.id}`;
    const isCollapsed = collapsedSections[sectionId] ?? getDefaultCollapsed(sectionId);

    return (
      <li key={type.id} className="rounded-md border px-3 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => toggleSection(sectionId)}
              aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
            </Button>
            <p className="font-medium">{type.name}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDialogState({ mode: "edit", category, documentType: type })}
              aria-label={`Edit ${type.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteDocumentType(category, type.id)}
              aria-label={`Delete ${type.name}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        {type.description && (
          <p className="mt-2 text-sm text-muted-foreground">{type.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {type.variables.length} variable{type.variables.length === 1 ? "" : "s"} mapped
          {type.lastUpdated ? ` • Updated ${type.lastUpdated}` : ""}
        </p>

        {isCollapsed ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Collapsed. Expand to manage variables for this document type.
          </p>
        ) : (
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Variables</p>

            {type.variables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No variables yet. Add the first variable below.
              </p>
            ) : (
              <ul className="space-y-2">
                {type.variables.map(variable => (
                  <li
                    key={variable.id}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">{variable.name}</span>
                        <span className="text-muted-foreground"> • {variable.type}</span>
                      </div>
                      {variable.type === "dropdown" && variable.dropdownOptions && variable.dropdownOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Options:{" "}
                          {variable.dropdownOptions.map(option => option.displayText).join(", ")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteVariable(category, type.id, variable.id)}
                      aria-label={`Delete variable ${variable.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"
              onSubmit={event => {
                event.preventDefault();
                handleAddVariable(category, type.id);
              }}
            >
              <Input
                placeholder="Variable name"
                value={variableDrafts[getDraftKey(category, type.id)]?.name ?? ""}
                onChange={event =>
                  handleVariableDraftChange(category, type.id, "name", event.target.value)
                }
                aria-label="Variable name"
              />
              <Select
                value={variableDrafts[getDraftKey(category, type.id)]?.type ?? "text"}
                onValueChange={value =>
                  handleVariableDraftChange(category, type.id, "type", value)
                }
              >
                <SelectTrigger aria-label="Variable type">
                  <SelectValue placeholder="Variable type" />
                </SelectTrigger>
                <SelectContent>
                  {variableTypeOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </form>
          </div>
        )}
      </li>
    );
  };

  const renderGlobalSection = () => {
    const sectionId = "global";
    const isCollapsed = collapsedSections[sectionId] ?? getDefaultCollapsed(sectionId);

    return (
      <section className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => toggleSection(sectionId)}
            aria-label={isCollapsed ? "Expand global variables" : "Collapse global variables"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
            />
          </Button>
          <p className="text-sm font-semibold text-muted-foreground">Global Variables</p>
        </div>
        <p className="text-xs text-muted-foreground/80">
          {globalVariables.length} variable{globalVariables.length === 1 ? "" : "s"} shared across every document and project.
        </p>

        {!isCollapsed && (
          <>
            {globalVariables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No global variables yet. Use the form below to add common metadata like project name or client.
              </p>
            ) : (
              <ul className="space-y-2">
                {globalVariables.map(variable => (
                  <li
                    key={variable.id}
                    className="flex items-start justify-between rounded border px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{variable.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Type: {variable.type}
                        {variable.description ? ` • ${variable.description}` : ""}
                        {variable.lastUpdated ? ` • Updated ${variable.lastUpdated}` : ""}
                      </p>
                      {variable.type === "dropdown" && variable.dropdownOptions && variable.dropdownOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Options:{" "}
                          {variable.dropdownOptions.map(option => option.displayText).join(", ")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGlobalVariable(variable.id)}
                      aria-label={`Delete ${variable.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"
              onSubmit={event => {
                event.preventDefault();
                handleAddGlobalVariable();
              }}
            >
              <Input
                placeholder="Variable name"
                value={globalDraft.name}
                onChange={event =>
                  setGlobalDraft(prev => ({ ...prev, name: event.target.value }))
                }
                aria-label="Global variable name"
              />
              <Select
                value={globalDraft.type}
                onValueChange={value =>
                  setGlobalDraft(prev => ({ ...prev, type: value as BaseVariable["type"] }))
                }
              >
                <SelectTrigger aria-label="Global variable type">
                  <SelectValue placeholder="Variable type" />
                </SelectTrigger>
                <SelectContent>
                  {variableTypeOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </form>
          </>
        )}
      </section>
    );
  };

  const renderCategoryPanel = (category: DocumentCategory) => {
    const categoryTypes = documentTypes[category] ?? [];
    const displayName = getCategoryDisplayName(category);

    return (
      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground/80">
              {categoryTypes.length} document type{categoryTypes.length === 1 ? "" : "s"} maintained in this category.
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogState({ mode: "create", category })}>
            <Plus className="mr-2 h-4 w-4" />
            Add document type
          </Button>
        </div>

        {categoryTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No document types defined yet. Add the first definition to start tracking variables.
          </p>
        ) : (
          <ul className="space-y-3">
            {categoryTypes.map(type => renderDocumentTypeCard(category, type))}
          </ul>
        )}
      </section>
    );
  };
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Variables</h1>
        <p className="text-muted-foreground">Manage variables used across your master templates.</p>
      </div>

      {loading.overall && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error.overall && (
        <div className="text-sm text-red-600">{error.overall}</div>
      )}

      {!loading.overall && !error.overall && (
        <Card>
          <CardHeader>
            <CardTitle></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* <div className="text-sm text-muted-foreground">
              {templateCount} template{templateCount === 1 ? "" : "s"} detected. Variables will be derived from templates.
              <br />
              {totalDocumentTypes} document type definition{totalDocumentTypes === 1 ? " is" : "s are"} active across all categories.
              <br />
              Global library tracks {totalGlobalVariables} variable{totalGlobalVariables === 1 ? "" : "s"} shared across every document.
            </div> */}



            <CategorySelector
              selectedCategory={selectedCategory}
              onCategoryChange={value =>
                setSelectedCategory(value as DocumentCategory | "GLOBAL")
              }
              allLabel="Global"
              allValue="GLOBAL"
            />

            <div className="space-y-4">
              {selectedCategory === "GLOBAL"
                ? renderGlobalSection()
                : activeCategory
                  ? renderCategoryPanel(activeCategory)
                  : (
                    <p className="text-sm text-muted-foreground">
                      Select a category to manage its document types.
                    </p>
                  )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(dialogState)} onOpenChange={open => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState?.mode === "edit" ? "Edit document type" : "Create document type"}
            </DialogTitle>
            {dialogState && (
              <DialogDescription>
                {dialogState.mode === "edit"
                  ? `Update the definition for ${dialogState.documentType.name}.`
                  : `Add a new document type under ${getCategoryDisplayName(dialogState.category)}.`}
              </DialogDescription>
            )}
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              handleSaveDocumentType();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="document-type-name">
                Name
              </label>
              <Input
                id="document-type-name"
                placeholder="e.g. Fire strategy report"
                value={formValues.name}
                onChange={event => setFormValues(prev => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="document-type-description">
                Description
              </label>
              <Textarea
                id="document-type-description"
                placeholder="Short description that explains how this document type is used."
                value={formValues.description}
                onChange={event =>
                  setFormValues(prev => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogState(null)}>
                Cancel
              </Button>
              <Button type="submit">
                {dialogState?.mode === "edit" ? "Save changes" : "Create type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
