"use client";

/**
 * ProjectForm - Modal dialog for creating new projects with template selection
 *
 * Features:
 * - Basic project information (name, location, deadline, assigned user)
 * - Project template selection by document category (ARCHITECTURE, STRUCTURAL, etc.)
 * - Subscription limit validation with user-friendly error handling
 * - Background data loading with non-blocking UI
 * - Form state management with automatic reset on close/success
 * - AI-powered contract upload: drag-and-drop or click to upload a contract,
 *   AI extracts fields, user reviews a diff and applies selected values into the form
 *
 * @param onProjectCreated - Callback fired when project is successfully created
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
import { Switch } from "@/components/ui/switch";
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
  ArrowRight,
  ArrowLeft,
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
  | "name"
  | "location"
  | "deadline"
  | "clientName"
  | "documentReceiver"
  | "caseNumber"
  | "constructionAddress"
  | "cadastralNumber"
  | "cadastralDistrict"
  | "subject"
  | "regarding";

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

  const [step, setStep] = useState<"details" | "phases">("details");
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward");
  const [useTemplates, setUseTemplates] = useState(false);
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
  const [showExtractionDetails, setShowExtractionDetails] = useState(false);
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

  const totalSelectedTemplates = phaseDefinitions.reduce((acc, def) => {
    const cfg = phaseConfig[def.id];
    if (!cfg?.included) return acc;
    return acc + countTemplates(cfg);
  }, 0);

  const detailsStepValid =
    projectName.trim().length > 0 &&
    location.trim().length > 0 &&
    deadline.trim().length > 0 &&
    selectedUserId.trim().length > 0;

  const goToPhasesStep = () => {
    if (!detailsStepValid) return;
    setSlideDirection("forward");
    setStep("phases");
  };

  const goToDetailsStep = () => {
    setSlideDirection("backward");
    setStep("details");
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
      if (response.ok) {
        const data = await response.json();
        setSubscriptionUsage(data);
      }
    } catch (err) {
      console.error("Error fetching subscription usage:", err);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const resetContractUpload = () => {
    setContractFile(null);
    setIsDragging(false);
    setExtractionStep("idle");
    setExtractionResult(null);
    setExtractionError(null);
    setAppliedSummary(null);
    setDiffSelection({ ...INITIAL_DIFF_SELECTION });
    setShowExtractionDetails(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setError(null);
    setSelectedUserId("");
    setUseTemplates(false);
    setPhaseDefinitions([]);
    setPhaseConfig({});
    setActivePhaseId("");
    setStep("details");
    setSlideDirection("forward");
    setIsLoading(false);
    setIsSubmitting(false);
    setProjectName("");
    setLocation("");
    setDeadline("");
    setExtendedValues({ ...EMPTY_EXTENDED_VALUES });
    setAiFilledFields(new Set());
    resetContractUpload();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  // --- Controlled field helpers ---

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
      setAiFilledFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  // --- Contract file validation ---

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

  // --- Extraction ---

  const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB — Vercel body limit is 4.5MB

  const handleExtract = async () => {
    if (!contractFile) return;
    setExtractionStep("extracting");
    setExtractionError(null);
    try {
      let response: Response;

      if (contractFile.size > FILE_SIZE_THRESHOLD) {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(
          `contract-uploads/${Date.now()}-${contractFile.name}`,
          contractFile,
          { access: "public", handleUploadUrl: "/api/ai/extract-contract-blob" }
        );
        response = await fetch(
          `/api/ai/extract-contract?blobUrl=${encodeURIComponent(blob.url)}`,
          { method: "POST" }
        );
      } else {
        const formData = new FormData();
        formData.append("file", contractFile);
        response = await fetch("/api/ai/extract-contract", { method: "POST", body: formData });
      }

      let result: Record<string, any>;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          text.includes("Request Entity")
            ? "File too large for server. Please try a smaller file."
            : `Server error: ${text.slice(0, 100)}`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || "Failed to extract contract information");
      }
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

  // --- Submit ---

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    if (step !== "phases") return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    const phasesPayload = useTemplates
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
      const msg = err instanceof Error && err.message ? err.message : "Failed to create project";
      alert(`Failed to create project:\n\n${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render helpers ---

  const renderFieldLabel = (htmlFor: string, label: string, field?: MappableField) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor}>{label}</Label>
      {field && aiFilledFields.has(field) && (
        <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
          <Sparkles className="h-3 w-3" />
          AI-filled
        </span>
      )}
    </div>
  );

  const renderDiffRow = (field: MappableField, label: string, currentValue: string, proposedValue: string | undefined) => {
    if (!proposedValue) return null;
    const id = `diff-${field}`;
    return (
      <div key={field} className="flex items-start gap-3 py-2">
        <Checkbox
          id={id}
          checked={diffSelection[field]}
          onCheckedChange={(checked) => setDiffSelection((prev) => ({ ...prev, [field]: !!checked }))}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground line-through decoration-muted-foreground/40 truncate max-w-[40%]">{currentValue || "(empty)"}</span>
            <span className="text-muted-foreground shrink-0">→</span>
            <span className="font-medium text-foreground truncate">{proposedValue}</span>
          </div>
        </div>
      </div>
    );
  };

  const extractedExtraInfo = (() => {
    if (!extractionResult) return [];
    const cd = extractionResult.contractData;
    const items: Array<{ label: string; value: string }> = [];
    if (cd.clientCVR) items.push({ label: "CVR", value: cd.clientCVR });
    if (cd.totalArea) items.push({ label: "Total area", value: cd.totalArea });
    if (cd.contractValue) items.push({ label: "Contract value", value: cd.contractValue });
    if (cd.startDate) items.push({ label: "Start date", value: cd.startDate });
    if (cd.architectFirm) items.push({ label: "Architect", value: cd.architectFirm });
    if (cd.contractorName) items.push({ label: "Contractor", value: cd.contractorName });
    if (cd.municipalityName) items.push({ label: "Municipality", value: cd.municipalityName });
    return items;
  })();

  const hasAnyProposed = !!extractionResult && ALL_FIELD_DEFS.some((def) => !!extractionResult.contractData[def.extractKey]);

  const selectedCount = extractionResult
    ? ALL_FIELD_DEFS.filter((def) => {
        const proposed = extractionResult.contractData[def.extractKey] as string | undefined;
        return !!proposed && !!diffSelection[def.field];
      }).length
    : 0;

  // --- AI Upload Section ---

  const renderAiUploadSection = () => (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3 shadow-sm ring-1 ring-primary/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold leading-tight">Auto-fill from contract</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a contract and AI will extract project details for you.</p>
          </div>
        </div>
        {extractionStep === "applied" && (
          <Button type="button" variant="ghost" size="sm" onClick={resetContractUpload} className="text-xs h-7">Upload another</Button>
        )}
      </div>

      {extractionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{extractionError}</AlertDescription>
        </Alert>
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
                <Button type="button" size="sm" onClick={handleExtract} className="gap-1.5 h-8">
                  <Sparkles className="h-3.5 w-3.5" />Extract with AI
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={handleClearFile} className="h-8 w-8" aria-label="Remove file"><X className="h-4 w-4" /></Button>
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
            <p className="text-xs text-muted-foreground truncate">Reading {contractFile?.name} — this usually takes a few seconds.</p>
          </div>
        </div>
      )}

      {extractionStep === "review" && extractionResult && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Extraction complete</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                extractionResult.confidence === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : extractionResult.confidence === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              }`}>{extractionResult.confidence.toUpperCase()} confidence</span>
            </div>
          </div>
          {hasAnyProposed ? (
            <>
              <p className="text-xs text-muted-foreground">Review what AI extracted and pick which values to apply. You&apos;ll be able to edit them afterwards.</p>
              <div className="divide-y">{ALL_FIELD_DEFS.map((def) => renderDiffRow(def.field, def.label, getFieldValue(def.field), extractionResult.contractData[def.extractKey] as string | undefined))}</div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">AI couldn&apos;t find project name, location, or deadline in this contract. You can still fill the form manually below.</p>
          )}
          {extractedExtraInfo.length > 0 && (
            <div className="rounded-md bg-muted/50 p-2.5 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Also extracted</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {extractedExtraInfo.map((item) => (<span key={item.label} className="text-xs"><span className="text-muted-foreground">{item.label}:</span>{" "}<span className="font-medium">{item.value}</span></span>))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleSkipDiff}>Skip</Button>
            <Button type="button" size="sm" onClick={handleApplyDiff} disabled={selectedCount === 0} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />{selectedCount > 0 ? `Apply ${selectedCount} field${selectedCount > 1 ? "s" : ""}` : "Apply"}
            </Button>
          </div>
        </div>
      )}

      {extractionStep === "applied" && appliedSummary && extractionResult && (
        <div className="rounded-md border border-primary/30 bg-primary/5">
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="flex items-start gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-sm min-w-0">
                {appliedSummary.count > 0 ? (<>Applied <span className="font-medium">{appliedSummary.count}</span> field{appliedSummary.count > 1 ? "s" : ""} from <span className="font-medium break-all">{appliedSummary.fileName}</span>.</>) : (<>Skipped auto-fill from <span className="font-medium break-all">{appliedSummary.fileName}</span>.</>)}
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowExtractionDetails((v) => !v)} className="h-7 text-xs shrink-0">
              {showExtractionDetails ? "Hide details" : "View details"}
            </Button>
          </div>
          {showExtractionDetails && (
            <div className="border-t border-primary/20 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">AI confidence:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                  extractionResult.confidence === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : extractionResult.confidence === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                }`}>{extractionResult.confidence.toUpperCase()}</span>
              </div>
              <div className="space-y-1.5">
                {ALL_FIELD_DEFS.map((def) => {
                  const value = extractionResult.contractData[def.extractKey] as string | undefined;
                  if (!value) return null;
                  const applied = diffSelection[def.field];
                  return (
                    <div key={def.field} className="flex items-start gap-2 text-sm">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 mt-0.5 ${applied ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{applied ? "Applied" : "Skipped"}</span>
                      <div className="min-w-0"><div className="text-xs text-muted-foreground">{def.label}</div><div className="font-medium truncate">{value}</div></div>
                    </div>
                  );
                })}
              </div>
              {extractedExtraInfo.length > 0 && (
                <div className="rounded-md bg-background/60 p-2.5 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Also extracted</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {extractedExtraInfo.map((item) => (<span key={item.label} className="text-xs"><span className="text-muted-foreground">{item.label}:</span>{" "}<span className="font-medium">{item.value}</span></span>))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="default" size="lg">+ New Project</Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
          lang="en"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Please fill out the form below to create a new project.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span>
              <Button onClick={fetchData} variant="outline" size="sm" className="mt-2">Try Again</Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => e.preventDefault()}
              onKeyDown={(e) => { const target = e.target as HTMLElement; if (e.key === "Enter" && target.tagName !== "TEXTAREA") e.preventDefault(); }}
              className="space-y-5"
            >
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={() => step === "phases" && goToDetailsStep()} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${step === "details" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"}`}>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/30 text-[10px] font-bold">1</span>
                  <span className="font-medium">Project details</span>
                </button>
                <div className="h-px flex-1 bg-border" />
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${step === "phases" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/30 text-[10px] font-bold">2</span>
                  <span className="font-medium">Phase planning</span>
                </div>
              </div>

              {/* Sliding step container */}
              <div className="overflow-hidden">
                <div key={step} className={`space-y-6 animate-in fade-in-0 duration-200 ${slideDirection === "forward" ? "slide-in-from-right-8" : "slide-in-from-left-8"}`}>
                  {step === "details" && (
                    <>
                      {renderAiUploadSection()}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid w-full items-center gap-2">
                          {renderFieldLabel("name", "Project Name", "name")}
                          <Input id="name" name="name" placeholder="Enter project name" value={projectName} onChange={(e) => handleFieldChange("name", e.target.value)} required />
                        </div>
                        <div className="grid w-full items-center gap-2">
                          {renderFieldLabel("location", "Location", "location")}
                          <Input id="location" name="location" placeholder="Enter project location" value={location} onChange={(e) => handleFieldChange("location", e.target.value)} required />
                        </div>
                        <div className="grid w-full items-center gap-2">
                          {renderFieldLabel("deadline", "Deadline", "deadline")}
                          <Input id="deadline" name="deadline" type="date" value={deadline} onChange={(e) => handleFieldChange("deadline", e.target.value)} required lang="en" />
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
                                    <span className="text-xs text-muted-foreground ml-2">{user.role.replace("_", " ")}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional details</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {EXTENDED_FIELD_DEFS.map((def) => (
                            <div key={def.field} className="grid w-full items-center gap-2">
                              {renderFieldLabel(def.field, def.label, def.field)}
                              <Input id={def.field} name={def.field} type={def.inputType ?? "text"} placeholder={def.placeholder} value={getFieldValue(def.field)} onChange={(e) => handleFieldChange(def.field, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {step === "phases" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="use-templates" className="text-lg font-semibold">Project Templates</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Configure templates per phase. Each enabled phase will be created automatically with its chosen documents.</p>
                        </div>
                        <Switch id="use-templates" checked={useTemplates} onCheckedChange={setUseTemplates} />
                      </div>

                      {useTemplates && phaseDefinitions.length === 0 && (
                        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">No phases are configured for your company yet. Ask your admin to set up phase definitions before assigning templates.</AlertDescription></Alert>
                      )}

                      {!useTemplates && (
                        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">Templates are disabled — the project will be created with the first phase empty. You can add templates later from the project&apos;s phase control panel.</AlertDescription></Alert>
                      )}

                      {useTemplates && phaseDefinitions.length > 0 && (
                        <div className="mt-4 space-y-4">
                          <Tabs value={activePhaseId} onValueChange={setActivePhaseId} className="w-full">
                            <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
                              {phaseDefinitions.map((def) => {
                                const cfg = phaseConfig[def.id];
                                const isFirst = def.id === firstPhaseDefId;
                                const included = !!cfg?.included;
                                const count = countTemplates(cfg);
                                return (
                                  <TabsTrigger key={def.id} value={def.id} className="group relative gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <span
                                      role="checkbox"
                                      aria-checked={included}
                                      aria-disabled={isFirst}
                                      aria-label={`Include phase ${def.short_label}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isFirst) return;
                                        updatePhaseConfig(def.id, (prev) => ({ ...prev, included: !prev.included }));
                                      }}
                                      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ring-offset-background ${included ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"} ${isFirst ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                    >
                                      {included && (
                                        <svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.5553 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </span>
                                    <span className="text-xs font-medium">{def.short_label}</span>
                                    {count > 0 && (<span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">{count}</span>)}
                                    {isFirst && (<span className="text-[10px] uppercase tracking-wide text-muted-foreground">required</span>)}
                                  </TabsTrigger>
                                );
                              })}
                            </TabsList>

                            {phaseDefinitions.map((def) => {
                              const cfg = phaseConfig[def.id];
                              if (!cfg) return null;
                              const isFirst = def.id === firstPhaseDefId;
                              const isActive = def.id === activePhaseId;
                              if (!isActive) return null;

                              return (
                                <TabsContent key={def.id} value={def.id} className="mt-4 space-y-4">
                                  <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold leading-tight">{def.name}</p>
                                        <p className="text-xs text-muted-foreground">{isFirst ? "First phase — always created with the project." : cfg.included ? "This phase will be created with the templates below." : "Toggle the checkbox to include this phase in the new project."}</p>
                                      </div>
                                      {!isFirst && (
                                        <div className="flex items-center gap-2">
                                          <Label htmlFor={`include-${def.id}`} className="text-xs text-muted-foreground">Include</Label>
                                          <Switch id={`include-${def.id}`} checked={cfg.included} onCheckedChange={(checked) => updatePhaseConfig(def.id, (prev) => ({ ...prev, included: checked }))} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="grid gap-1">
                                        <Label htmlFor={`deadline-${def.id}`} className="text-xs text-muted-foreground">Phase deadline (optional)</Label>
                                        <Input id={`deadline-${def.id}`} type="date" value={cfg.deadline} onChange={(e) => updatePhaseConfig(def.id, (prev) => ({ ...prev, deadline: e.target.value }))} disabled={!cfg.included} className="h-9" lang="en" />
                                      </div>
                                      <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">Templates selected</Label>
                                        <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm">
                                          <span className={countTemplates(cfg) > 0 ? "font-semibold" : "text-muted-foreground"}>{countTemplates(cfg)}</span>
                                          <span className="ml-1 text-muted-foreground">/ {projectTemplates.length} available</span>
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
                                          <div className="grid gap-2">
                                            <ProjectTemplateDropdown
                                              category={category}
                                              selectedTemplate={cfg.selectedTemplates[category]}
                                              projectTemplates={projectTemplates}
                                              onTemplateSelect={(templateName) => updatePhaseConfig(def.id, (prev) => ({ ...prev, selectedTemplates: { ...prev.selectedTemplates, [category]: templateName } }))}
                                              onTemplateClear={() => updatePhaseConfig(def.id, (prev) => { const next = { ...prev.selectedTemplates }; delete next[category]; return { ...prev, selectedTemplates: next }; })}
                                            />
                                            {cfg.selectedTemplates[category] && (<p className="text-xs text-muted-foreground">Selected: <span className="font-medium">{cfg.selectedTemplates[category]}</span></p>)}
                                          </div>
                                        </TabsContent>
                                      ))}
                                    </Tabs>
                                  </div>
                                </TabsContent>
                              );
                            })}
                          </Tabs>

                          {/* Cross-phase summary */}
                          <div className="rounded-md border bg-background p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              <h3 className="text-sm font-medium">Creation plan summary</h3>
                              <span className="text-xs text-muted-foreground">
                                ({totalSelectedTemplates} template{totalSelectedTemplates === 1 ? "" : "s"} across {phaseDefinitions.filter((def) => phaseConfig[def.id]?.included).length} phase{phaseDefinitions.filter((def) => phaseConfig[def.id]?.included).length === 1 ? "" : "s"})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {phaseDefinitions.filter((def) => phaseConfig[def.id]?.included).map((def) => {
                                const cfg = phaseConfig[def.id]!;
                                const entries = Object.entries(cfg.selectedTemplates).filter(([, v]) => typeof v === "string" && v.length > 0 && v !== "none");
                                return (
                                  <div key={def.id} className="rounded-md bg-muted/40 p-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium">{def.short_label} · {def.name}</p>
                                      <span className="text-xs text-muted-foreground">{entries.length} template{entries.length === 1 ? "" : "s"}</span>
                                    </div>
                                    {entries.length === 0 ? (
                                      <p className="text-xs text-muted-foreground mt-1">No templates yet — phase will be created empty.</p>
                                    ) : (
                                      <ul className="mt-1 grid grid-cols-2 gap-1">
                                        {entries.map(([category, name]) => (<li key={category} className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{category.replace(/_/g, " ")}</span>: {name}</li>))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                              {phaseDefinitions.every((def) => !phaseConfig[def.id]?.included) && (<p className="text-xs text-muted-foreground">No phases enabled yet.</p>)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t">
                {step === "details" ? (
                  <>
                    <div className="text-xs text-muted-foreground">{detailsStepValid ? "All required fields look good." : "Fill name, location, deadline, and project leader to continue."}</div>
                    <Button type="button" onClick={goToPhasesStep} disabled={!detailsStepValid} className="gap-1.5">Continue to phase planning<ArrowRight className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" onClick={goToDetailsStep} className="gap-1.5"><ArrowLeft className="h-4 w-4" />Back to details</Button>
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Project"}</Button>
                  </>
                )}
              </div>
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
