"use client";

/**
 * ProjectForm - Modal dialog for creating new projects with template selection
 *
 * Single scrollable form with:
 * - AI contract upload for auto-filling fields
 * - Basic project information
 * - Additional detail fields
 * - Phase-based template planning
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  Sparkles,
  FileText,
  Loader2,
  X,
  AlertCircle,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { CategoryTabsList } from "./category-tabs-list";
import { ProjectTemplateDropdown } from "./project-template-dropdown";
import SubscriptionLimitDialog from "./subscription-limit-dialog";
import type { ContractData } from "@/lib/services/ai/contract-extractor";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ProjectFormProps {
  onProjectCreated: () => void;
}

interface ProjectTemplate {
  name: string;
  category: DocumentCategory;
  description: string | null;
  variables: string[];
}

interface PhaseDefinition {
  id: string;
  name: string;
  short_label: string;
  display_order: number;
  is_enabled: boolean;
}

interface PhaseConfig {
  included: boolean;
  deadline: string;
  selectedTemplates: { [key in DocumentCategory]?: string };
}

interface SubscriptionUsage {
  usage: { current_projects: number };
  limits: { max_projects: number };
  company: { name: string };
}

type ExtractionStep = "idle" | "extracting" | "review" | "applied" | "error";

interface ExtractionResult {
  contractData: ContractData;
  variableMapping: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
  stats?: { tokensUsed?: number; estimatedCost?: number; wordCount?: number };
}

type MappableField =
  | "name" | "location" | "deadline"
  | "clientName" | "documentReceiver" | "caseNumber"
  | "constructionAddress" | "cadastralNumber" | "cadastralDistrict"
  | "subject" | "regarding";

type ExtendedField = Exclude<MappableField, "name" | "location" | "deadline">;

interface FieldDef {
  field: MappableField;
  label: string;
  placeholder?: string;
  inputType?: "text" | "date";
  required?: boolean;
  extractKey: keyof ContractData;
}

const CORE_FIELD_DEFS: FieldDef[] = [
  { field: "name", label: "Project Name", placeholder: "Enter project name", required: true, extractKey: "projectName" },
  { field: "location", label: "Location", placeholder: "Enter project location", required: true, extractKey: "projectAddress" },
  { field: "deadline", label: "Deadline", inputType: "date", required: true, extractKey: "endDate" },
];

const EXTENDED_FIELD_DEFS: FieldDef[] = [
  { field: "clientName", label: "Client Name", placeholder: "Name of the client", extractKey: "clientName" },
  { field: "documentReceiver", label: "Document Receiver", placeholder: "Often the same as the client", extractKey: "documentReceiver" },
  { field: "caseNumber", label: "Case Number", placeholder: "Contract / case number", extractKey: "caseNumber" },
  { field: "constructionAddress", label: "Construction Address", placeholder: "Construction site address", extractKey: "constructionAddress" },
  { field: "cadastralNumber", label: "Cadastral Number", placeholder: "Matrikel number", extractKey: "cadastralNumber" },
  { field: "cadastralDistrict", label: "Cadastral District", placeholder: "Ejerlav", extractKey: "cadastralDistrict" },
  { field: "subject", label: "Subject", placeholder: "Emne", extractKey: "subject" },
  { field: "regarding", label: "Regarding", placeholder: "Vedrørende", extractKey: "regarding" },
];

const ALL_FIELD_DEFS: FieldDef[] = [...CORE_FIELD_DEFS, ...EXTENDED_FIELD_DEFS];
const ALL_MAPPABLE_FIELDS: MappableField[] = ALL_FIELD_DEFS.map((d) => d.field);

const EMPTY_EXTENDED_VALUES: Record<ExtendedField, string> = {
  clientName: "", documentReceiver: "", caseNumber: "", constructionAddress: "",
  cadastralNumber: "", cadastralDistrict: "", subject: "", regarding: "",
};

const INITIAL_DIFF_SELECTION: Record<MappableField, boolean> =
  ALL_MAPPABLE_FIELDS.reduce((acc, f) => ({ ...acc, [f]: true }), {} as Record<MappableField, boolean>);

const MAX_CONTRACT_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTRACT_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function ProjectForm({ onProjectCreated }: ProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [phaseDefinitions, setPhaseDefinitions] = useState<PhaseDefinition[]>([]);
  const [phaseConfig, setPhaseConfig] = useState<Record<string, PhaseConfig>>({});
  const [activePhaseId, setActivePhaseId] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [extendedValues, setExtendedValues] = useState<Record<ExtendedField, string>>(EMPTY_EXTENDED_VALUES);
  const [aiFilledFields, setAiFilledFields] = useState<Set<MappableField>>(new Set());

  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionStep, setExtractionStep] = useState<ExtractionStep>("idle");
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [appliedSummary, setAppliedSummary] = useState<{ count: number; fileName: string } | null>(null);
  const [diffSelection, setDiffSelection] = useState<Record<MappableField, boolean>>({ ...INITIAL_DIFF_SELECTION });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [subscriptionUsage, setSubscriptionUsage] = useState<SubscriptionUsage | null>(null);

  const templateCountsByCategory = useMemo(() => {
    const counts = {} as Record<DocumentCategory, number>;
    for (const t of projectTemplates) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [projectTemplates]);

  const firstPhaseDefId = useMemo(
    () => phaseDefinitions.find((d) => d.display_order === 1)?.id ?? "",
    [phaseDefinitions]
  );

  const updatePhaseConfig = (phaseId: string, updater: (prev: PhaseConfig) => PhaseConfig) => {
    setPhaseConfig((prev) => {
      const current = prev[phaseId];
      if (!current) return prev;
      return { ...prev, [phaseId]: updater(current) };
    });
  };

  const countTemplates = (cfg: PhaseConfig | undefined) => {
    if (!cfg) return 0;
    return Object.values(cfg.selectedTemplates).filter(
      (v) => typeof v === "string" && v.length > 0 && v !== "none"
    ).length;
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects/form-data");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch form data");
      }
      const data = await response.json();
      setUsers(data.users || []);
      setProjectTemplates(data.templates || []);
      const defs: PhaseDefinition[] = data.phaseDefinitions || [];
      setPhaseDefinitions(defs);
      const firstId = defs.find((d) => d.display_order === 1 && d.is_enabled)?.id ?? defs[0]?.id ?? "";
      const config: Record<string, PhaseConfig> = {};
      for (const def of defs) {
        config[def.id] = { included: def.id === firstId, deadline: "", selectedTemplates: {} };
      }
      setPhaseConfig(config);
      if (firstId) setActivePhaseId(firstId);
    } catch (err) {
      console.error("Error in fetchData:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptionUsage = async () => {
    try {
      const response = await fetch("/api/subscription/usage");
      if (response.ok) setSubscriptionUsage(await response.json());
    } catch (err) {
      console.error("Error fetching subscription usage:", err);
    }
  };

  useEffect(() => { if (open) fetchData(); }, [open]);

  const resetContractUpload = () => {
    setContractFile(null);
    setIsDragging(false);
    setExtractionStep("idle");
    setExtractionResult(null);
    setExtractionError(null);
    setAppliedSummary(null);
    setDiffSelection({ ...INITIAL_DIFF_SELECTION });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setError(null);
    setSelectedUserId("");
    setPhaseDefinitions([]);
    setPhaseConfig({});
    setActivePhaseId("");
    setIsLoading(false);
    setIsSubmitting(false);
    setProjectName("");
    setLocation("");
    setDeadline("");
    setExtendedValues({ ...EMPTY_EXTENDED_VALUES });
    setAiFilledFields(new Set());
    resetContractUpload();
    setStep(1);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const getFieldValue = (field: MappableField): string => {
    if (field === "name") return projectName;
    if (field === "location") return location;
    if (field === "deadline") return deadline;
    return extendedValues[field];
  };

  const setFieldValue = (field: MappableField, value: string) => {
    if (field === "name") setProjectName(value);
    else if (field === "location") setLocation(value);
    else if (field === "deadline") setDeadline(value);
    else setExtendedValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldChange = (field: MappableField, value: string) => {
    setFieldValue(field, value);
    if (aiFilledFields.has(field)) {
      setAiFilledFields((prev) => { const next = new Set(prev); next.delete(field); return next; });
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_CONTRACT_EXTENSIONS.includes(ext)) {
      setExtractionError(`Unsupported file type. Allowed: ${ALLOWED_CONTRACT_EXTENSIONS.join(", ")}`);
      return;
    }
    if (file.size > MAX_CONTRACT_FILE_SIZE) {
      setExtractionError("File is too large (max 10 MB)");
      return;
    }
    setExtractionError(null);
    setContractFile(file);
    setExtractionStep("idle");
    setExtractionResult(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };
  const handleClearFile = () => {
    setContractFile(null); setExtractionError(null); setExtractionStep("idle"); setExtractionResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtract = async () => {
    if (!contractFile) return;
    setExtractionStep("extracting");
    setExtractionError(null);
    try {
      const formData = new FormData();
      formData.append("file", contractFile);
      const response = await fetch("/api/ai/extract-contract", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.details || result.error || "Failed to extract contract information");
      setExtractionResult(result.extraction);
      setDiffSelection({ ...INITIAL_DIFF_SELECTION });
      setExtractionStep("review");
    } catch (err) {
      console.error("Error extracting contract:", err);
      setExtractionError(err instanceof Error ? err.message : "Failed to extract contract");
      setExtractionStep("error");
    }
  };

  const handleApplyDiff = () => {
    if (!extractionResult || !contractFile) return;
    const cd = extractionResult.contractData;
    const newFilled = new Set(aiFilledFields);
    let count = 0;
    const nextExtended: Record<ExtendedField, string> = { ...extendedValues };
    for (const def of ALL_FIELD_DEFS) {
      const proposed = cd[def.extractKey] as string | undefined;
      if (!proposed || !diffSelection[def.field]) continue;
      if (def.field === "name") setProjectName(proposed);
      else if (def.field === "location") setLocation(proposed);
      else if (def.field === "deadline") setDeadline(proposed);
      else nextExtended[def.field as ExtendedField] = proposed;
      newFilled.add(def.field);
      count++;
    }
    setExtendedValues(nextExtended);
    setAiFilledFields(newFilled);
    setAppliedSummary({ count, fileName: contractFile.name });
    setExtractionStep("applied");
  };

  const handleSkipDiff = () => {
    if (!contractFile) return;
    setAppliedSummary({ count: 0, fileName: contractFile.name });
    setExtractionStep("applied");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const phasesPayload = phaseDefinitions.length > 0
      ? phaseDefinitions
          .filter((def) => {
            const cfg = phaseConfig[def.id];
            if (!cfg) return false;
            if (def.id === firstPhaseDefId) return true;
            return cfg.included;
          })
          .map((def) => {
            const cfg = phaseConfig[def.id]!;
            const selected = Object.entries(cfg.selectedTemplates)
              .filter(([, v]) => typeof v === "string" && v.length > 0 && v !== "none")
              .map(([category, template_name]) => ({ category, template_name: template_name as string }));
            return { phase_definition_id: def.id, deadline: cfg.deadline || null, templates: selected };
          })
      : undefined;

    const projectData = {
      name: projectName,
      location,
      deadline,
      assignedTo: selectedUserId,
      phases: phasesPayload,
      clientName: extendedValues.clientName || undefined,
      documentReceiver: extendedValues.documentReceiver || undefined,
      caseNumber: extendedValues.caseNumber || undefined,
      constructionAddress: extendedValues.constructionAddress || undefined,
      cadastralNumber: extendedValues.cadastralNumber || undefined,
      cadastralDistrict: extendedValues.cadastralDistrict || undefined,
      subject: extendedValues.subject || undefined,
      regarding: extendedValues.regarding || undefined,
    };

    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectData) });
      const responseData = await response.json();
      if (!response.ok) {
        if (response.status === 402 && responseData.type === "subscription_limit") {
          await fetchSubscriptionUsage();
          setShowLimitDialog(true);
          return;
        }
        throw new Error(responseData.error || responseData.message || "Failed to create project");
      }
      resetForm();
      setOpen(false);
      onProjectCreated();
    } catch (err) {
      console.error("Error creating project:", err);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldLabel = (htmlFor: string, label: string, field?: MappableField) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor}>{label}</Label>
      {field && aiFilledFields.has(field) && (
        <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
          <Sparkles className="h-3 w-3" />AI-filled
        </span>
      )}
    </div>
  );

  const renderDiffRow = (field: MappableField, label: string, currentValue: string, proposedValue: string | undefined) => {
    if (!proposedValue) return null;
    const id = `diff-${field}`;
    return (
      <div key={field} className="flex items-start gap-3 py-2">
        <Checkbox id={id} checked={diffSelection[field]} onCheckedChange={(checked) => setDiffSelection((prev) => ({ ...prev, [field]: !!checked }))} className="mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground line-through truncate max-w-[40%]">{currentValue || "(empty)"}</span>
            <span className="text-muted-foreground shrink-0">→</span>
            <span className="font-medium text-foreground truncate">{proposedValue}</span>
          </div>
        </div>
      </div>
    );
  };

  const hasAnyProposed = !!extractionResult && ALL_FIELD_DEFS.some((def) => !!extractionResult.contractData[def.extractKey]);
  const selectedCount = extractionResult
    ? ALL_FIELD_DEFS.filter((def) => { const proposed = extractionResult.contractData[def.extractKey] as string | undefined; return !!proposed && !!diffSelection[def.field]; }).length
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="default">+ New Project</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Please fill out the form below to create a new project.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              <Button onClick={fetchData} variant="outline" size="sm" className="mt-2">Try Again</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${step === 1 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</span>
                  <span className="text-sm">Project Info</span>
                </div>
                <div className="h-px flex-1 bg-border" />
                <div className={`flex items-center gap-2 ${step === 2 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
                  <span className="text-sm">Phases & Templates</span>
                </div>
              </div>

              {/* ===== STEP 1: Project Info ===== */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* AI Contract Upload Section */}
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold leading-tight">Auto-fill from contract</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Upload a contract and AI will extract project details for you.</p>
                      </div>
                    </div>

                    {extractionError && (
                      <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{extractionError}</AlertDescription></Alert>
                    )}

                    {(extractionStep === "idle" || extractionStep === "error") && (
                      <>
                        {!contractFile ? (
                          <div
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                            className={`relative rounded-md border-2 border-dashed bg-background p-6 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}`}
                          >
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">{isDragging ? "Drop the file here" : "Drag & drop a contract"}</p>
                            <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, DOCX, TXT · max 10 MB</p>
                            <Input ref={fileInputRef} type="file" accept={ALLOWED_CONTRACT_EXTENSIONS.join(",")} onChange={handleFileInputChange} className="hidden" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{contractFile.name}</p>
                                <p className="text-xs text-muted-foreground">{formatBytes(contractFile.size)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button type="button" size="sm" onClick={handleExtract} className="gap-1.5 h-8"><Sparkles className="h-3.5 w-3.5" />Extract with AI</Button>
                              <Button type="button" variant="ghost" size="icon" onClick={handleClearFile} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {extractionStep === "extracting" && (
                      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Analyzing contract...</p>
                          <p className="text-xs text-muted-foreground truncate">Reading {contractFile?.name}</p>
                        </div>
                      </div>
                    )}

                    {extractionStep === "review" && extractionResult && (
                      <div className="space-y-3 rounded-md border bg-background p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Extraction complete</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            extractionResult.confidence === "high" ? "bg-green-100 text-green-700"
                            : extractionResult.confidence === "medium" ? "bg-yellow-100 text-yellow-700"
                            : "bg-orange-100 text-orange-700"
                          }`}>{extractionResult.confidence.toUpperCase()}</span>
                        </div>
                        {hasAnyProposed ? (
                          <>
                            <p className="text-xs text-muted-foreground">Review extracted values and pick which to apply.</p>
                            <div className="divide-y">{ALL_FIELD_DEFS.map((def) => renderDiffRow(def.field, def.label, getFieldValue(def.field), extractionResult.contractData[def.extractKey] as string | undefined))}</div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">AI couldn&apos;t find relevant fields. Fill the form manually below.</p>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="ghost" size="sm" onClick={handleSkipDiff}>Skip</Button>
                          <Button type="button" size="sm" onClick={handleApplyDiff} disabled={selectedCount === 0} className="gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />Apply {selectedCount} field{selectedCount !== 1 ? "s" : ""}
                          </Button>
                        </div>
                      </div>
                    )}

                    {extractionStep === "applied" && appliedSummary && (
                      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        <p className="text-sm text-green-700">
                          {appliedSummary.count > 0
                            ? `Applied ${appliedSummary.count} field${appliedSummary.count > 1 ? "s" : ""} from ${appliedSummary.fileName}`
                            : `Skipped extraction from ${appliedSummary.fileName}`}
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={resetContractUpload} className="ml-auto text-xs h-7">Upload another</Button>
                      </div>
                    )}
                  </div>

                  {/* Basic Project Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid w-full items-center gap-2">
                      {renderFieldLabel("name", "Project Name", "name")}
                      <Input id="name" value={projectName} onChange={(e) => handleFieldChange("name", e.target.value)} placeholder="Enter project name" required />
                    </div>
                    <div className="grid w-full items-center gap-2">
                      {renderFieldLabel("location", "Location", "location")}
                      <Input id="location" value={location} onChange={(e) => handleFieldChange("location", e.target.value)} placeholder="Enter project location" required />
                    </div>
                    <div className="grid w-full items-center gap-2">
                      {renderFieldLabel("deadline", "Deadline", "deadline")}
                      <Input id="deadline" type="date" value={deadline} onChange={(e) => handleFieldChange("deadline", e.target.value)} required />
                    </div>
                    <div className="grid w-full items-center gap-2">
                      <Label htmlFor="assignedTo">Project Leader</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                        <SelectTrigger className="flex items-center justify-between">
                          <SelectValue placeholder="Select a user" />
                          <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{user.name || user.email}</span>
                                <span className="text-xs text-muted-foreground ml-2">{user.role.replace('_', ' ')}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Additional Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      {EXTENDED_FIELD_DEFS.map((def) => (
                        <div key={def.field} className="grid w-full items-center gap-2">
                          {renderFieldLabel(def.field, def.label, def.field)}
                          <Input
                            id={def.field}
                            value={extendedValues[def.field as ExtendedField]}
                            onChange={(e) => handleFieldChange(def.field, e.target.value)}
                            placeholder={def.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1 navigation */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button type="button" onClick={() => setStep(2)}>
                      Next: Phases & Templates
                    </Button>
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Phases & Templates ===== */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {phaseDefinitions.length === 0 ? (
                      <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>No phase definitions found. Ask an admin to set up phases for your company.</AlertDescription></Alert>
                    ) : (
                      <Tabs value={activePhaseId} onValueChange={setActivePhaseId} className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto">
                          {phaseDefinitions.map((def) => {
                            const cfg = phaseConfig[def.id];
                            const isFirst = def.id === firstPhaseDefId;
                            return (
                              <TabsTrigger key={def.id} value={def.id} className="relative gap-1.5 text-xs" onClick={(e) => {
                                if ((e.target as HTMLElement).closest('[data-phase-check]')) {
                                  e.preventDefault();
                                  if (!isFirst) updatePhaseConfig(def.id, (prev) => ({ ...prev, included: !(prev?.included ?? false) }));
                                }
                              }}>
                                <span
                                  data-phase-check
                                  className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
                                    cfg?.included ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                  } ${isFirst ? "opacity-50" : "cursor-pointer"}`}
                                  aria-hidden
                                >
                                  {(cfg?.included ?? false) && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                  )}
                                </span>
                                <span>{def.short_label}</span>
                                {countTemplates(cfg) > 0 && (
                                  <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 py-0 text-[9px] font-medium text-primary-foreground">{countTemplates(cfg)}</span>
                                )}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        {phaseDefinitions.map((def) => {
                          const cfg = phaseConfig[def.id];
                          if (!cfg) return null;
                          const isFirst = def.id === firstPhaseDefId;
                          return (
                            <TabsContent key={def.id} value={def.id} className="mt-4 space-y-4">
                              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold">{def.name}</p>
                                    <p className="text-xs text-muted-foreground">{isFirst ? "First phase — always created." : cfg.included ? "Phase will be created with templates below." : "Enable this phase to configure templates."}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="grid gap-1">
                                    <Label htmlFor={`deadline-${def.id}`} className="text-xs text-muted-foreground">Phase deadline (optional)</Label>
                                    <Input id={`deadline-${def.id}`} type="date" value={cfg.deadline} onChange={(e) => updatePhaseConfig(def.id, (prev) => ({ ...prev, deadline: e.target.value }))} disabled={!cfg.included} className="h-9" />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label className="text-xs text-muted-foreground">Templates selected</Label>
                                    <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm">
                                      <span className={countTemplates(cfg) > 0 ? "font-semibold" : "text-muted-foreground"}>{countTemplates(cfg)}</span>
                                      <span className="ml-1 text-muted-foreground">/ {projectTemplates.length}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className={cfg.included ? "" : "opacity-50 pointer-events-none"}>
                                <Tabs defaultValue={Object.values(DocumentCategory)[0] as string} className="w-full">
                                  <div className="flex flex-col space-y-2">
                                    <CategoryTabsList categories={Object.values(DocumentCategory).slice(0, 4)} selectedTemplates={cfg.selectedTemplates} templateCounts={templateCountsByCategory} gridCols={4} />
                                    <CategoryTabsList categories={Object.values(DocumentCategory).slice(4)} selectedTemplates={cfg.selectedTemplates} templateCounts={templateCountsByCategory} gridCols={3} />
                                  </div>
                                  {Object.values(DocumentCategory).map((category) => (
                                    <TabsContent key={category} value={category} className="mt-4">
                                      <ProjectTemplateDropdown
                                        category={category}
                                        selectedTemplate={cfg.selectedTemplates[category]}
                                        projectTemplates={projectTemplates}
                                        onTemplateSelect={(templateName) => updatePhaseConfig(def.id, (prev) => ({ ...prev, selectedTemplates: { ...prev.selectedTemplates, [category]: templateName } }))}
                                        onTemplateClear={() => updatePhaseConfig(def.id, (prev) => { const next = { ...prev.selectedTemplates }; delete next[category]; return { ...prev, selectedTemplates: next }; })}
                                      />
                                    </TabsContent>
                                  ))}
                                </Tabs>
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    )}
                  </div>

                  {/* Step 2 navigation */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>

      {subscriptionUsage && (
        <SubscriptionLimitDialog open={showLimitDialog} onClose={() => setShowLimitDialog(false)} limitType="projects" currentCount={subscriptionUsage.usage.current_projects} maxCount={subscriptionUsage.limits.max_projects} companyName={subscriptionUsage.company.name} />
      )}
    </>
  );
}
