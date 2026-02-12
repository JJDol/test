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
import { ChevronDown, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
  isDefault?: boolean; // Marks variable as non-editable/non-deletable
};

// Default variables that are automatically added to every new document type
// These cannot be edited or deleted by users
const DEFAULT_DOCUMENT_TYPE_VARIABLES: VariableDefinition[] = [
  { id: "default-document-id", name: "Document ID", type: "text", isDefault: true },
  { id: "default-document-title", name: "Document Title", type: "text", isDefault: true },
  { id: "default-document-type", name: "Document Type", type: "text", isDefault: true },
  { id: "default-revision-id", name: "Revision ID", type: "text", isDefault: true },
  { id: "default-revision-date", name: "Revision Date", type: "date", isDefault: true },
  { id: "default-emne-subject", name: "Subject", type: "text", isDefault: true },
  { id: "default-published-date", name: "Published Date", type: "date", isDefault: true },
];

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

// Type for category default variables
type CategoryDefaultVariable = {
  id: string;
  name: string;
  type: BaseVariable["type"];
  description?: string;
  dropdownOptions?: { displayText: string; value: string }[];
  isDefault: boolean;
};

type CategoryDefaults = Record<DocumentCategory, CategoryDefaultVariable[]>;

export function VariablesContent() {
  const { templates, loading, error } = useTemplates();
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "GLOBAL">("GLOBAL");
  const [documentTypes, setDocumentTypes] = useState(DEFAULT_DOCUMENT_TYPES);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariableDefinition[]>([]);
  const [categoryDefaults, setCategoryDefaults] = useState<CategoryDefaults>({
    [DocumentCategory.ARCHITECTURE]: [],
    [DocumentCategory.CONSTRUCTIONS]: [],
    [DocumentCategory.FIRE]: [],
    [DocumentCategory.AUTHORITY_PROCESSING]: [],
    [DocumentCategory.ENERGY]: [],
    [DocumentCategory.HVAC]: [],
    [DocumentCategory.EXECUTION_CONTROL]: [],
  });
  const [dialogState, setDialogState] = useState<DocumentTypeDialogState>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
  });
  const [variableDrafts, setVariableDrafts] = useState<
    Record<string, { name: string; type: BaseVariable["type"]; dropdownOptions: { displayText: string; value: string }[] }>
  >({});
  const [globalDraft, setGlobalDraft] = useState<{ name: string; type: BaseVariable["type"]; dropdownOptions: { displayText: string; value: string }[] }>({
    name: "",
    type: "text",
    dropdownOptions: [],
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [dropdownOptionInputs, setDropdownOptionInputs] = useState<Record<string, string>>({});
  const [globalDropdownOptionInput, setGlobalDropdownOptionInput] = useState("");
  const [editingVariable, setEditingVariable] = useState<{
    id: string;
    name: string;
    type: BaseVariable["type"];
    dropdownOptions: { displayText: string; value: string }[];
    category?: DocumentCategory;
    typeId?: string;
    isGlobal: boolean;
  } | null>(null);
  const [editDropdownOptionInput, setEditDropdownOptionInput] = useState("");
  const [deletingVariable, setDeletingVariable] = useState<{
    id: string;
    name: string;
    isGlobal: boolean;
    category?: DocumentCategory;
    typeId?: string;
  } | null>(null);

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

  // Load category defaults for all categories
  useEffect(() => {
    const loadCategoryDefaults = async () => {
      try {
        const supabase = createClient();
        
        // Fetch all category defaults (where document_type = 'CATEGORY_DEFAULTS')
        const { data, error } = await supabase
          .from("document_default_variables")
          .select("category, variables")
          .eq("document_type", "CATEGORY_DEFAULTS");

        if (error) {
          console.error("Failed to load category defaults:", error);
          return;
        }

        if (!data || data.length === 0) return;

        // Map database category names to DocumentCategory enum
        const categoryMapping: Record<string, DocumentCategory> = {
          "ARCHITECTURE": DocumentCategory.ARCHITECTURE,
          "CONSTRUCTION": DocumentCategory.CONSTRUCTIONS,
          "FIRE": DocumentCategory.FIRE,
          "AUTHORITY PROCESSING": DocumentCategory.AUTHORITY_PROCESSING,
          "ENERGY": DocumentCategory.ENERGY,
          "HVAC": DocumentCategory.HVAC,
          "EXECUTION CONTROL": DocumentCategory.EXECUTION_CONTROL,
        };

        const newDefaults: CategoryDefaults = {
          [DocumentCategory.ARCHITECTURE]: [],
          [DocumentCategory.CONSTRUCTIONS]: [],
          [DocumentCategory.FIRE]: [],
          [DocumentCategory.AUTHORITY_PROCESSING]: [],
          [DocumentCategory.ENERGY]: [],
          [DocumentCategory.HVAC]: [],
          [DocumentCategory.EXECUTION_CONTROL]: [],
        };

        data.forEach(row => {
          const category = categoryMapping[row.category];
          if (category && row.variables) {
            newDefaults[category] = (row.variables as any[]).map(v => ({
              id: v.id,
              name: v.name,
              type: v.type,
              description: v.description,
              dropdownOptions: v.dropdownOptions,
              isDefault: true,
            }));
          }
        });

        setCategoryDefaults(newDefaults);
      } catch (e) {
        console.error("Unexpected error loading category defaults:", e);
      }
    };

    loadCategoryDefaults();
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

  // Database persistence functions
  const saveGlobalVariablesToDb = async (variables: GlobalVariableDefinition[]) => {
    try {
      const supabase = createClient();
      const variablesForDb = variables.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        description: v.description,
        dropdownOptions: v.dropdownOptions,
      }));

      const { error } = await supabase
        .from("document_default_variables")
        .upsert(
          {
            category: "GLOBAL",
            document_type: "GLOBAL",
            variables: variablesForDb,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "category,document_type" }
        );

      if (error) {
        console.error("Failed to save global variables:", error);
      }
    } catch (e) {
      console.error("Unexpected error saving global variables:", e);
    }
  };

  const getCategoryDbName = (category: DocumentCategory): string => {
    const mapping: Record<DocumentCategory, string> = {
      [DocumentCategory.ARCHITECTURE]: "ARCHITECTURE",
      [DocumentCategory.CONSTRUCTIONS]: "CONSTRUCTION",
      [DocumentCategory.FIRE]: "FIRE",
      [DocumentCategory.AUTHORITY_PROCESSING]: "AUTHORITY PROCESSING",
      [DocumentCategory.ENERGY]: "ENERGY",
      [DocumentCategory.HVAC]: "HVAC",
      [DocumentCategory.EXECUTION_CONTROL]: "EXECUTION CONTROL",
    };
    return mapping[category] || category;
  };

  const saveDocumentTypeToDb = async (
    category: DocumentCategory,
    documentType: DocumentTypeDefinition
  ) => {
    try {
      const supabase = createClient();
      const variablesForDb = documentType.variables.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        dropdownOptions: v.dropdownOptions,
      }));

      const { error } = await supabase
        .from("document_default_variables")
        .upsert(
          {
            category: getCategoryDbName(category),
            document_type: documentType.name,
            description: documentType.description,
            variables: variablesForDb,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "category,document_type" }
        );

      if (error) {
        console.error("Failed to save document type:", error);
      }
    } catch (e) {
      console.error("Unexpected error saving document type:", e);
    }
  };

  const deleteDocumentTypeFromDb = async (category: DocumentCategory, documentTypeName: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_default_variables")
        .delete()
        .eq("category", getCategoryDbName(category))
        .eq("document_type", documentTypeName);

      if (error) {
        console.error("Failed to delete document type:", error);
      }
    } catch (e) {
      console.error("Unexpected error deleting document type:", e);
    }
  };

  const handleSaveDocumentType = async () => {
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
        dialogState.mode === "edit" 
          ? dialogState.documentType.variables 
          : [...DEFAULT_DOCUMENT_TYPE_VARIABLES], // Pre-populate with default variables
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

    // Save to database
    await saveDocumentTypeToDb(dialogState.category, updatedType);

    setDialogState(null);
  };

  const handleDeleteDocumentType = async (category: DocumentCategory, id: string) => {
    const confirmed = window.confirm("Delete this document type? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    // Find the document type name before deleting
    const docType = documentTypes[category]?.find(type => type.id === id);

    setDocumentTypes(prev => {
      const next = { ...prev };
      next[category] = (next[category] ?? []).filter(type => type.id !== id);
      return next;
    });

    // Delete from database
    if (docType) {
      await deleteDocumentTypeFromDb(category, docType.name);
    }
  };

  const handleAddGlobalVariable = async () => {
    const trimmedName = globalDraft.name.trim();
    if (!trimmedName) {
      return;
    }

    const newVariable: GlobalVariableDefinition = {
      id: `global-${Date.now()}`,
      name: trimmedName,
      type: globalDraft.type,
      lastUpdated: "just now",
      dropdownOptions: globalDraft.type === "dropdown" ? globalDraft.dropdownOptions : undefined,
    };

    const updatedVariables = [...globalVariables, newVariable];
    setGlobalVariables(updatedVariables);
    setGlobalDraft({ name: "", type: "text", dropdownOptions: [] });

    // Save to database
    await saveGlobalVariablesToDb(updatedVariables);
  };

  const handleGlobalDropdownOptionAdd = (option: { displayText: string; value: string }) => {
    setGlobalDraft(prev => ({
      ...prev,
      dropdownOptions: [...prev.dropdownOptions, option],
    }));
  };

  const handleGlobalDropdownOptionRemove = (index: number) => {
    setGlobalDraft(prev => ({
      ...prev,
      dropdownOptions: prev.dropdownOptions.filter((_, i) => i !== index),
    }));
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
        type: field === "type" ? (value as BaseVariable["type"]) : prev[key]?.type ?? "text",
        dropdownOptions: field === "type" && value !== "dropdown" ? [] : prev[key]?.dropdownOptions ?? [],
      },
    }));
  };

  const handleVariableDropdownOptionAdd = (category: DocumentCategory, typeId: string, option: { displayText: string; value: string }) => {
    const key = getDraftKey(category, typeId);
    setVariableDrafts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        name: prev[key]?.name ?? "",
        type: prev[key]?.type ?? "dropdown",
        dropdownOptions: [...(prev[key]?.dropdownOptions ?? []), option],
      },
    }));
  };

  const handleVariableDropdownOptionRemove = (category: DocumentCategory, typeId: string, index: number) => {
    const key = getDraftKey(category, typeId);
    setVariableDrafts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        name: prev[key]?.name ?? "",
        type: prev[key]?.type ?? "dropdown",
        dropdownOptions: (prev[key]?.dropdownOptions ?? []).filter((_, i) => i !== index),
      },
    }));
  };

  const handleAddVariable = async (category: DocumentCategory, typeId: string) => {
    const key = getDraftKey(category, typeId);
    const draft = variableDrafts[key] ?? { name: "", type: "text", dropdownOptions: [] };
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      return;
    }

    const newVariable: VariableDefinition = {
      id: `${typeId}-${Date.now()}`,
      name: trimmedName,
      type: draft.type,
      dropdownOptions: draft.type === "dropdown" ? draft.dropdownOptions : undefined,
    };

    // Find the document type and update it
    const docType = documentTypes[category]?.find(type => type.id === typeId);
    if (!docType) return;

    const updatedDocType: DocumentTypeDefinition = {
      ...docType,
      variables: [...docType.variables, newVariable],
    };

    setDocumentTypes(prev => {
      const next = { ...prev };
      next[category] = next[category].map(type =>
        type.id === typeId ? updatedDocType : type
      );
      return next;
    });

    setVariableDrafts(prev => ({
      ...prev,
      [key]: { name: "", type: draft.type, dropdownOptions: [] },
    }));

    // Save to database
    await saveDocumentTypeToDb(category, updatedDocType);
  };

  const handleUpdateVariable = async () => {
    if (!editingVariable) return;

    const trimmedName = editingVariable.name.trim();
    if (!trimmedName) return;

    // Safety check: prevent editing default variables
    if (editingVariable.category && editingVariable.typeId) {
      const docType = documentTypes[editingVariable.category]?.find(type => type.id === editingVariable.typeId);
      const variable = docType?.variables.find(v => v.id === editingVariable.id);
      if (variable?.isDefault) {
        console.warn("Cannot edit default variables");
        setEditingVariable(null);
        return;
      }
    }

    if (editingVariable.isGlobal) {
      const updatedVariables = globalVariables.map(v =>
        v.id === editingVariable.id
          ? {
              ...v,
              name: trimmedName,
              type: editingVariable.type,
              dropdownOptions: editingVariable.type === "dropdown" ? editingVariable.dropdownOptions : undefined,
              lastUpdated: "just now",
            }
          : v
      );
      setGlobalVariables(updatedVariables);
      await saveGlobalVariablesToDb(updatedVariables);
    } else if (editingVariable.category && editingVariable.typeId) {
      const docType = documentTypes[editingVariable.category]?.find(type => type.id === editingVariable.typeId);
      if (!docType) return;

      const updatedDocType: DocumentTypeDefinition = {
        ...docType,
        variables: docType.variables.map(v =>
          v.id === editingVariable.id
            ? {
                ...v,
                name: trimmedName,
                type: editingVariable.type,
                dropdownOptions: editingVariable.type === "dropdown" ? editingVariable.dropdownOptions : undefined,
              }
            : v
        ),
      };

      setDocumentTypes(prev => {
        const next = { ...prev };
        next[editingVariable.category!] = next[editingVariable.category!].map(type =>
          type.id === editingVariable.typeId ? updatedDocType : type
        );
        return next;
      });
      await saveDocumentTypeToDb(editingVariable.category, updatedDocType);
    }

    setEditingVariable(null);
    setEditDropdownOptionInput("");
  };

  const handleConfirmDeleteVariable = async () => {
    if (!deletingVariable) return;

    // Safety check: prevent deletion of default variables
    if (deletingVariable.category && deletingVariable.typeId) {
      const docType = documentTypes[deletingVariable.category]?.find(type => type.id === deletingVariable.typeId);
      const variable = docType?.variables.find(v => v.id === deletingVariable.id);
      if (variable?.isDefault) {
        console.warn("Cannot delete default variables");
        setDeletingVariable(null);
        return;
      }
    }

    if (deletingVariable.isGlobal) {
      const updatedVariables = globalVariables.filter(v => v.id !== deletingVariable.id);
      setGlobalVariables(updatedVariables);
      await saveGlobalVariablesToDb(updatedVariables);
    } else if (deletingVariable.category && deletingVariable.typeId) {
      const docType = documentTypes[deletingVariable.category]?.find(type => type.id === deletingVariable.typeId);
      if (!docType) return;

      const updatedDocType: DocumentTypeDefinition = {
        ...docType,
        variables: docType.variables.filter(v => v.id !== deletingVariable.id),
      };

      setDocumentTypes(prev => {
        const next = { ...prev };
        next[deletingVariable.category!] = next[deletingVariable.category!].map(type =>
          type.id === deletingVariable.typeId ? updatedDocType : type
        );
        return next;
      });
      await saveDocumentTypeToDb(deletingVariable.category, updatedDocType);
    }

    setDeletingVariable(null);
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
                    className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${variable.isDefault ? "bg-muted/30" : ""}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variable.name}</span>
                        <span className="text-muted-foreground">• {variable.type}</span>
                        {variable.isDefault && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                            Default
                          </span>
                        )}
                      </div>
                      {variable.type === "dropdown" && variable.dropdownOptions && variable.dropdownOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Options:{" "}
                          {variable.dropdownOptions.map(option => option.displayText).join(", ")}
                        </p>
                      )}
                    </div>
                    {!variable.isDefault && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingVariable({
                            id: variable.id,
                            name: variable.name,
                            type: variable.type,
                            dropdownOptions: variable.dropdownOptions || [],
                            category,
                            typeId: type.id,
                            isGlobal: false
                          })}
                          aria-label={`Edit variable ${variable.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingVariable({
                            id: variable.id,
                            name: variable.name,
                            isGlobal: false,
                            category,
                            typeId: type.id
                          })}
                          aria-label={`Delete variable ${variable.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form
              className="space-y-3"
              onSubmit={event => {
                event.preventDefault();
                handleAddVariable(category, type.id);
              }}
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
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
              </div>

              {(variableDrafts[getDraftKey(category, type.id)]?.type ?? "text") === "dropdown" && (
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">Dropdown Options</p>

                  {(variableDrafts[getDraftKey(category, type.id)]?.dropdownOptions ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(variableDrafts[getDraftKey(category, type.id)]?.dropdownOptions ?? []).map((opt, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs"
                        >
                          {opt.displayText}
                          <button
                            type="button"
                            onClick={() => handleVariableDropdownOptionRemove(category, type.id, idx)}
                            className="hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add option..."
                      value={dropdownOptionInputs[getDraftKey(category, type.id)] ?? ""}
                      onChange={event =>
                        setDropdownOptionInputs(prev => ({
                          ...prev,
                          [getDraftKey(category, type.id)]: event.target.value,
                        }))
                      }
                      onKeyDown={event => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const value = (dropdownOptionInputs[getDraftKey(category, type.id)] ?? "").trim();
                          if (value) {
                            handleVariableDropdownOptionAdd(category, type.id, { displayText: value, value });
                            setDropdownOptionInputs(prev => ({
                              ...prev,
                              [getDraftKey(category, type.id)]: "",
                            }));
                          }
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const value = (dropdownOptionInputs[getDraftKey(category, type.id)] ?? "").trim();
                        if (value) {
                          handleVariableDropdownOptionAdd(category, type.id, { displayText: value, value });
                          setDropdownOptionInputs(prev => ({
                            ...prev,
                            [getDraftKey(category, type.id)]: "",
                          }));
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingVariable({
                          id: variable.id,
                          name: variable.name,
                          type: variable.type,
                          dropdownOptions: variable.dropdownOptions || [],
                          isGlobal: true
                        })}
                        aria-label={`Edit ${variable.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingVariable({
                          id: variable.id,
                          name: variable.name,
                          isGlobal: true
                        })}
                        aria-label={`Delete ${variable.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="space-y-3"
              onSubmit={event => {
                event.preventDefault();
                handleAddGlobalVariable();
              }}
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
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
                    setGlobalDraft(prev => ({
                      ...prev,
                      type: value as BaseVariable["type"],
                      dropdownOptions: value !== "dropdown" ? [] : prev.dropdownOptions,
                    }))
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
              </div>

              {globalDraft.type === "dropdown" && (
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">Dropdown Options</p>

                  {globalDraft.dropdownOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {globalDraft.dropdownOptions.map((opt, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs"
                        >
                          {opt.displayText}
                          <button
                            type="button"
                            onClick={() => handleGlobalDropdownOptionRemove(idx)}
                            className="hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add option..."
                      value={globalDropdownOptionInput}
                      onChange={event => setGlobalDropdownOptionInput(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const value = globalDropdownOptionInput.trim();
                          if (value) {
                            handleGlobalDropdownOptionAdd({ displayText: value, value });
                            setGlobalDropdownOptionInput("");
                          }
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const value = globalDropdownOptionInput.trim();
                        if (value) {
                          handleGlobalDropdownOptionAdd({ displayText: value, value });
                          setGlobalDropdownOptionInput("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}
      </section>
    );
  };

  const renderCategoryDefaultsSection = (category: DocumentCategory) => {
    const defaults = categoryDefaults[category] ?? [];
    const sectionId = `category-defaults-${category}`;
    const isCollapsed = collapsedSections[sectionId] ?? false;

    if (defaults.length === 0) return null;

    return (
      <div className="rounded-md border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-6 w-6"
            onClick={() => toggleSection(sectionId)}
            aria-label={isCollapsed ? "Expand category defaults" : "Collapse category defaults"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
            />
          </Button>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-muted-foreground">Category Default Variables</p>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border">
              {defaults.length} variable{defaults.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        
        {!isCollapsed && (
          <>
            <p className="text-xs text-muted-foreground">
              These default variables are shared across all document types in this category and cannot be edited.
            </p>
            <ul className="space-y-2">
              {defaults.map(variable => (
                <li
                  key={variable.id}
                  className="flex items-center justify-between rounded border bg-background px-3 py-2 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{variable.name}</span>
                      <span className="text-muted-foreground">• {variable.type}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                        Default
                      </span>
                    </div>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground">{variable.description}</p>
                    )}
                    {variable.type === "dropdown" && variable.dropdownOptions && variable.dropdownOptions.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Options: {variable.dropdownOptions.map(option => option.displayText).join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  const renderCategoryPanel = (category: DocumentCategory) => {
    const categoryTypes = documentTypes[category] ?? [];
    const displayName = getCategoryDisplayName(category);
    const defaults = categoryDefaults[category] ?? [];

    return (
      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground/80">
              {defaults.length} category default{defaults.length === 1 ? "" : "s"} • {categoryTypes.length} document type{categoryTypes.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogState({ mode: "create", category })}>
            <Plus className="mr-2 h-4 w-4" />
            Add document type
          </Button>
        </div>

        {/* Category Defaults Section */}
        {renderCategoryDefaultsSection(category)}

        {/* Document Types Section */}
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

      <Dialog open={Boolean(editingVariable)} onOpenChange={open => !open && setEditingVariable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Variable</DialogTitle>
            <DialogDescription>
              Update the variable name, type, and options.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              handleUpdateVariable();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-variable-name">
                Name
              </label>
              <Input
                id="edit-variable-name"
                placeholder="Variable name"
                value={editingVariable?.name ?? ""}
                onChange={event => setEditingVariable(prev => prev ? { ...prev, name: event.target.value } : null)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-variable-type">
                Type
              </label>
              <Select
                value={editingVariable?.type ?? "text"}
                onValueChange={value =>
                  setEditingVariable(prev => prev ? {
                    ...prev,
                    type: value as BaseVariable["type"],
                    dropdownOptions: value !== "dropdown" ? [] : prev.dropdownOptions
                  } : null)
                }
              >
                <SelectTrigger id="edit-variable-type">
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
            </div>

            {editingVariable?.type === "dropdown" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Dropdown Options</label>
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingVariable.dropdownOptions.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs"
                      >
                        {opt.displayText}
                        <button
                          type="button"
                          onClick={() => setEditingVariable(prev => prev ? {
                            ...prev,
                            dropdownOptions: prev.dropdownOptions.filter((_, i) => i !== idx)
                          } : null)}
                          className="hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add option..."
                      value={editDropdownOptionInput}
                      onChange={event => setEditDropdownOptionInput(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const value = editDropdownOptionInput.trim();
                          if (value) {
                            setEditingVariable(prev => prev ? {
                              ...prev,
                              dropdownOptions: [...prev.dropdownOptions, { displayText: value, value }]
                            } : null);
                            setEditDropdownOptionInput("");
                          }
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const value = editDropdownOptionInput.trim();
                        if (value) {
                          setEditingVariable(prev => prev ? {
                            ...prev,
                            dropdownOptions: [...prev.dropdownOptions, { displayText: value, value }]
                          } : null);
                          setEditDropdownOptionInput("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingVariable(null)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingVariable)} onOpenChange={open => !open && setDeletingVariable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the variable "{deletingVariable?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingVariable(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteVariable}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
