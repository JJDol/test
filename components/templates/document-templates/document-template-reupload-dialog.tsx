/**
 * Document Template Reupload Dialog
 *
 * PURPOSE: Dialog for uploading a new version of an existing template
 * - Handles file upload and variable extraction
 * - Shows diff between old and new variables
 * - Allows mapping renamed variables
 * - Creates new version on confirmation
 */

"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { DocumentTemplate, VersionChangesSummary } from "@/lib/types/types";
import { DocumentVariable } from "@/lib/types/variable-types";
import { getVariableTypeStyle } from "@/utils/variable-type-styles";
import {
  Upload,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";

interface DocumentTemplateReuploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate;
  onReuploadComplete: () => void;
}

const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB

export function DocumentTemplateReuploadDialog({
  open,
  onOpenChange,
  template,
  onReuploadComplete,
}: DocumentTemplateReuploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractingVariables, setExtractingVariables] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newVariables, setNewVariables] = useState<DocumentVariable[]>([]);
  const [changesSummary, setChangesSummary] = useState<VersionChangesSummary | null>(null);
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "confirm">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetDialog = () => {
    setSelectedFile(null);
    setExtractingVariables(false);
    setUploadProgress(0);
    setUploadError(null);
    setNewVariables([]);
    setChangesSummary(null);
    setVariableMappings({});
    setIsUploading(false);
    setBlobUrl(null);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const compareVariables = (
    oldVars: DocumentVariable[],
    newVars: DocumentVariable[]
  ): VersionChangesSummary => {
    const oldMap: Record<string, DocumentVariable> = {};
    const newMap: Record<string, DocumentVariable> = {};

    oldVars.forEach((v) => { oldMap[v.name] = v; });
    newVars.forEach((v) => { newMap[v.name] = v; });

    const added: { name: string; type?: string }[] = [];
    const removed: { name: string; type?: string }[] = [];
    const modified: { name: string; oldType?: string; newType?: string }[] = [];

    for (const name of Object.keys(newMap)) {
      const newVar = newMap[name];
      const oldVar = oldMap[name];
      if (!oldVar) {
        added.push({ name, type: newVar.type });
      } else if (oldVar.type !== newVar.type) {
        modified.push({ name, oldType: oldVar.type, newType: newVar.type });
      }
    }

    for (const name of Object.keys(oldMap)) {
      if (!newMap[name]) {
        removed.push({ name, type: oldMap[name].type });
      }
    }

    return { added, removed, modified };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(0);

    // Extract variables from the new file
    setExtractingVariables(true);

    try {
      let extractedVariables: DocumentVariable[] = [];

      if (file.size > FILE_SIZE_THRESHOLD) {
        // Large file: use blob upload
        setUploadProgress(10);
        const { upload } = await import("@vercel/blob/client");

        const timestamp = Date.now();
        const customPath = `temp-uploads/${timestamp}-${file.name}`;

        const blob = await upload(customPath, file, {
          access: "public",
          handleUploadUrl: "/api/document-templates/extract-variables-blob",
        });

        setBlobUrl(blob.url);
        setUploadProgress(60);

        const processResponse = await fetch("/api/document-templates/process-blob", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blob.url,
            filename: file.name,
            size: file.size,
          }),
        });

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          throw new Error(errorData.message || "Failed to extract variables");
        }

        const processData = await processResponse.json();
        extractedVariables = processData.variables.filter(
          (v: DocumentVariable) => v.name && v.name.trim() !== ""
        );
      } else {
        // Small file: direct upload
        setUploadProgress(30);
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/document-templates/extract-variables", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to extract variables");
        }

        const data = await response.json();
        extractedVariables = data.variables.filter(
          (v: DocumentVariable) => v.name && v.name.trim() !== ""
        );
      }

      setUploadProgress(100);
      setNewVariables(extractedVariables);

      // Compare with existing variables
      const changes = compareVariables(template.variables || [], extractedVariables);
      setChangesSummary(changes);

      // Initialize mappings for removed variables
      const initialMappings: Record<string, string> = {};
      for (const removed of changes.removed) {
        initialMappings[removed.name] = ""; // Empty means no mapping
      }
      setVariableMappings(initialMappings);

      setStep("review");

      toast({
        title: "Variables Extracted",
        description: `Found ${extractedVariables.length} variables in the new file`,
      });
    } catch (error) {
      console.error("Error extracting variables:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to extract variables"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to extract variables",
        variant: "destructive",
      });
    } finally {
      setExtractingVariables(false);
    }
  };

  const handleMappingChange = (oldVarName: string, newVarName: string) => {
    setVariableMappings((prev) => ({
      ...prev,
      [oldVarName]: newVarName,
    }));
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile && !blobUrl) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      if (selectedFile && selectedFile.size <= FILE_SIZE_THRESHOLD) {
        formData.append("file", selectedFile);
      } else if (blobUrl) {
        formData.append("blobUrl", blobUrl);
        formData.append("fileName", selectedFile?.name || "template.docx");
      }

      // Add variable mappings
      const nonEmptyMappings = Object.fromEntries(
        Object.entries(variableMappings).filter(([_, value]) => value !== "")
      );
      if (Object.keys(nonEmptyMappings).length > 0) {
        formData.append("variableMappings", JSON.stringify(nonEmptyMappings));
      }

      const response = await fetch(
        `/api/document-templates/${encodeURIComponent(template.name)}/reupload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload new version");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Template updated to version ${result.version}`,
      });

      handleClose();
      onReuploadComplete();
    } catch (error) {
      console.error("Error uploading new version:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to upload new version",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const hasChanges =
    changesSummary &&
    (changesSummary.added.length > 0 ||
      changesSummary.removed.length > 0 ||
      changesSummary.modified.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Template: {template.name}</DialogTitle>
          <DialogDescription>
            Upload a new version of this template. Variables will be compared and you
            can map renamed variables to preserve project data.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={extractingVariables}
              >
                {extractingVariables ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Select New File
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Upload a .docx file to create a new version
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {extractingVariables && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Extracting variables...</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {selectedFile && !extractingVariables && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              </div>
            )}
          </div>
        )}

        {step === "review" && changesSummary && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Current version: {template.current_version || 1} → New version:{" "}
              {(template.current_version || 1) + 1}
            </div>

            {!hasChanges && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  No variable changes detected. The template file will be updated.
                </AlertDescription>
              </Alert>
            )}

            {/* Added Variables */}
            {changesSummary.added.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <Plus className="h-4 w-4" />
                  Added Variables ({changesSummary.added.length})
                </h4>
                <div className="border rounded-md p-3 bg-green-50 dark:bg-green-950/20">
                  <div className="flex flex-wrap gap-2">
                    {changesSummary.added.map((v, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-background"
                        style={getVariableTypeStyle(v.type || "text")}
                      >
                        {v.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Removed Variables with Mapping */}
            {changesSummary.removed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <Minus className="h-4 w-4" />
                  Removed Variables ({changesSummary.removed.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Map removed variables to new ones to preserve project data
                </p>
                <div className="border rounded-md p-3 bg-red-50 dark:bg-red-950/20 space-y-3">
                  {changesSummary.removed.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <Badge
                        variant="outline"
                        className="bg-background shrink-0"
                        style={getVariableTypeStyle(v.type || "text")}
                      >
                        {v.name}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={variableMappings[v.name] || ""}
                        onValueChange={(value) => handleMappingChange(v.name, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Map to new variable..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Don't map (discard data)</SelectItem>
                          {newVariables.map((nv) => (
                            <SelectItem key={nv.name} value={nv.name}>
                              {nv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modified Variables */}
            {changesSummary.modified.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                  <RefreshCw className="h-4 w-4" />
                  Modified Variables ({changesSummary.modified.length})
                </h4>
                <div className="border rounded-md p-3 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="space-y-2">
                    {changesSummary.modified.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-mono">{v.name}</span>
                        <span className="text-muted-foreground">:</span>
                        <Badge variant="outline" className="bg-background">
                          {v.oldType}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="bg-background">
                          {v.newType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border rounded-md p-3 bg-muted/50">
              <h4 className="text-sm font-medium mb-2">Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  New file: {selectedFile?.name} (
                  {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(1)}MB)
                </p>
                <p>Total variables in new version: {newVariables.length}</p>
                {hasChanges && (
                  <p className="text-yellow-600">
                    Warning: Projects using this template may need to update their
                    variable values.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          {step === "review" && (
            <Button onClick={handleConfirmUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Version {(template.current_version || 1) + 1}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
