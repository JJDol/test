"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";

interface DocumentUploadDialogProps {
  onUploadComplete?: (documentId: string) => void;
  disabled?: boolean;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  showCompanyWideToggle?: boolean;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in bytes
}

export function DocumentUploadDialog({
  onUploadComplete,
  disabled = false,
  trigger,
  title = "Upload Document",
  description = "Upload a document to add it to your AI knowledge base",
  showCompanyWideToggle = true,
  allowedFileTypes = [".pdf", ".doc", ".docx", ".txt", ".md"],
  maxFileSize = 50 * 1024 * 1024 // 50MB default
}: DocumentUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [isCompanyWide, setIsCompanyWide] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Validate file size
      if (file.size > maxFileSize) {
        setError(`File size exceeds ${(maxFileSize / (1024 * 1024)).toFixed(0)}MB limit`);
        setSelectedFile(null);
        return;
      }
      
      // Validate file type
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedFileTypes.includes(fileExtension)) {
        setError(`File type not supported. Allowed: ${allowedFileTypes.join(', ')}`);
        setSelectedFile(null);
        return;
      }
      
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', uploadDescription);
      formData.append('tags', uploadTags);
      formData.append('is_company_wide', isCompanyWide.toString());

      const response = await fetch('/api/semantic/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }

      const data = await response.json();
      const documentId = data.document?.id;

      // Reset form
      setSelectedFile(null);
      setUploadDescription("");
      setUploadTags("");
      setIsCompanyWide(false);
      setIsOpen(false);
      
      // Notify parent component with document ID
      if (documentId) {
        onUploadComplete?.(documentId);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !uploading) {
      // Reset form when closing (unless uploading)
      setSelectedFile(null);
      setUploadDescription("");
      setUploadTags("");
      setIsCompanyWide(false);
      setError(null);
    }
    setIsOpen(open);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled={disabled}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Document File</Label>
            <Input
              id="file"
              type="file"
              accept={allowedFileTypes.join(',')}
              onChange={handleFileChange}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Supported formats: {allowedFileTypes.join(', ').replace(/\./g, '').toUpperCase()}
            </p>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what this document contains..."
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="Enter tags separated by commas"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
            />
          </div>
          
          {showCompanyWideToggle && (
            <div className="flex items-center space-x-2">
              <Switch
                id="company-wide"
                checked={isCompanyWide}
                onCheckedChange={setIsCompanyWide}
              />
              <Label htmlFor="company-wide">Make available company-wide</Label>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
