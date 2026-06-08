/**
 * Project Template Reupload Dialog
 *
 * PURPOSE: Dialog for uploading a customized template for a specific project
 * - Handles file upload and variable extraction
 * - Shows diff between original and new variables
 * - Creates project-specific template (doesn't affect global template)
 */

"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
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
  Info,
} from "lucide-react";

interface ProjectTemplateReuploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate;
  projectId: string;
  onReuploadComplete: () => void;
}

const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB

export function ProjectTemplateReuploadDialog({
  open,
  onOpenChange,
  template,
  projectId,
  onReuploadComplete,
}: ProjectTemplateReuploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractingVariables, setExtractingVariables] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newVariables, setNewVariables] = useState<DocumentVariable[]>([]);
  const [changesSummary, setChangesSummary] = useState<VersionChangesSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "review">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const tc = useTranslations("common");

  const resetDialog = () => {
    setSelectedFile(null);
    setExtractingVariables(false);
    setUploadProgress(0);
    setUploadError(null);
    setNewVariables([]);
    setChangesSummary(null);
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

      // Compare with original template variables
      const changes = compareVariables(template.variables || [], extractedVariables);
      setChangesSummary(changes);

      setStep("review");

      toast({
        title: "Variables Extracted",
        description: `Found ${extractedVariables.length} variables in the uploaded file`,
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
      formData.append("templateName", template.name);

      if (selectedFile && selectedFile.size <= FILE_SIZE_THRESHOLD) {
        formData.append("file", selectedFile);
      } else if (blobUrl) {
        formData.append("blobUrl", blobUrl);
        formData.append("fileName", selectedFile?.name || "template.docx");
      }

      const response = await fetch(
        `/api/projects/${projectId}/reupload-template`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to customize template");
      }

      toast({
        title: "Success",
        description: "Template customized for this project",
      });

      handleClose();
      onReuploadComplete();
    } catch (error) {
      console.error("Error customizing template:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to customize template",
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
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Customize Template: {template.name}</DialogTitle>
          <DialogDescription>
            Upload a customized version of this template for this project only.
            The original template will not be affected.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This creates a project-specific version of the template. Other projects
                using this template will not be affected.
              </AlertDescription>
            </Alert>

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
                    Select Customized File
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Upload a .docx file with your changes
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
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This will create a custom template for this project only.
                The original global template (v{template.current_version || 1}) will remain unchanged.
              </AlertDescription>
            </Alert>

            {!hasChanges && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  No variable changes detected. The template content will be customized.
                </AlertDescription>
              </Alert>
            )}

            {/* Added Variables */}
            {changesSummary.added.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <Plus className="h-4 w-4" />
                  New Variables ({changesSummary.added.length})
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

            {/* Removed Variables */}
            {changesSummary.removed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <Minus className="h-4 w-4" />
                  Removed Variables ({changesSummary.removed.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  These variables from the original template are not in your customized version
                </p>
                <div className="border rounded-md p-3 bg-red-50 dark:bg-red-950/20">
                  <div className="flex flex-wrap gap-2">
                    {changesSummary.removed.map((v, i) => (
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
                      <div key={i} className="flex flex-col gap-1 text-sm">
                        <span className="font-mono font-medium">{v.name}</span>
                        <div className="flex flex-wrap items-center gap-2 ml-2">
                          {/* Type change */}
                          {v.oldType && v.newType && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Type:</span>
                              <Badge variant="outline" className="bg-background text-xs">
                                {v.oldType}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <Badge variant="outline" className="bg-background text-xs">
                                {v.newType}
                              </Badge>
                            </div>
                          )}
                          {/* Scope change */}
                          {v.oldScope && v.newScope && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Scope:</span>
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{
                                  backgroundColor: v.oldScope === 'global' ? '#8b5cf620' : v.oldScope === 'category' ? '#f9731620' : '#6b728020',
                                  borderColor: v.oldScope === 'global' ? '#8b5cf6' : v.oldScope === 'category' ? '#f97316' : '#6b7280'
                                }}
                              >
                                {v.oldScope}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{
                                  backgroundColor: v.newScope === 'global' ? '#8b5cf620' : v.newScope === 'category' ? '#f9731620' : '#6b728020',
                                  borderColor: v.newScope === 'global' ? '#8b5cf6' : v.newScope === 'category' ? '#f97316' : '#6b7280'
                                }}
                              >
                                {v.newScope}
                              </Badge>
                            </div>
                          )}
                        </div>
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
                  Uploaded file: {selectedFile?.name} (
                  {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(1)}MB)
                </p>
                <p>Total variables: {newVariables.length}</p>
                <p className="text-blue-600">
                  This customization only affects this project.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {tc("cancel")}
          </Button>
          {step === "review" && (
            <Button onClick={handleConfirmUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tc("loading")}...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {tc("save")}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
