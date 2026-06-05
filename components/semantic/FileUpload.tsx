'use client';

import { useTranslations } from "next-intl";
import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { uploadFile } from '@/lib/file-service';
import { Paperclip, Loader2, X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export function FileUpload({ onUploadComplete, disabled = false }: FileUploadProps) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return extension === 'pdf' || extension === 'docx';
    });

    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only PDF and DOCX files are allowed.');
      setTimeout(() => setError(null), 3000);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        await uploadFile(file, isTemporary);
      }
      setSelectedFiles([]);
      setIsDialogOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        disabled={isUploading || disabled}
        onClick={() => !disabled && setIsDialogOpen(true)}
        title={disabled ? t("processingDocuments") : t("uploadDocument")}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        <span className="sr-only">{t("uploadDocument")}</span>
      </Button>

      <Dialog open={isDialogOpen && !disabled} onOpenChange={(open) => !disabled && setIsDialogOpen(open)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("uploadDocument")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag and drop area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">
                  {dragActive ? t("uploadDocument") : t("uploadDescription")}
                </p>
                <p className="mt-1">Supported formats: PDF, DOCX</p>
              </div>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected files:</p>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted p-2 rounded-md text-sm"
                    >
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temporary files option */}
            <div className="flex items-center space-x-2">
              <Switch
                id="temporary"
                checked={isTemporary}
                onCheckedChange={setIsTemporary}
                disabled={isUploading}
              />
              <Label htmlFor="temporary" className="text-sm">
                Temporary files (will be deleted when starting new chat)
              </Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload button */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tc("loading")}...
                  </>
                ) : (
                  tc("upload")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 