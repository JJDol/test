"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { DocumentCategory } from "@/lib/types/types";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocumentVariable } from "@/lib/types/variable-types";
import { getVariableTypeStyle, getVariableTypeDisplayName } from "@/utils/variable-type-styles";

interface TemplateUploadFormProps {
  onUploadComplete: () => void;
}

const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB threshold for blob upload

export function TemplateUploadForm({ onUploadComplete }: TemplateUploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variables, setVariables] = useState<DocumentVariable[]>([]);
  const [extractingVariables, setExtractingVariables] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null); // Store blob URL for large files
  const [duplicateNameError, setDuplicateNameError] = useState<string | null>(null);
  const [duplicateFileError, setDuplicateFileError] = useState<string | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const checkForDuplicateFile = async (fileName: string) => {
    setCheckingDuplicates(true);
    setDuplicateFileError(null);
    
    try {
      // The API requires both name and fileName parameters, use dummy name for file-only check
      const response = await fetch(`/api/document-templates/check-duplicates?name=dummy&fileName=${encodeURIComponent(fileName)}&isPublic=${isPublic}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Duplicate check response:', data); // Debug log
        if (data.hasFileConflict) {
          setDuplicateFileError("detected same name of document file");
          return true;
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText);
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking for duplicate files:', error);
      return false;
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name); // Debug log
    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(0);

    // Check for duplicate file first
    console.log('Checking for duplicate file...'); // Debug log
    const isDuplicate = await checkForDuplicateFile(file.name);
    console.log('Is duplicate?', isDuplicate); // Debug log
    
    if (isDuplicate) {
      console.log('Duplicate detected, stopping process'); // Debug log
      // Don't proceed with variable extraction if file is duplicate
      return;
    }

    console.log('No duplicate, proceeding with variable extraction'); // Debug log
    // Check file size and process accordingly
    const isLargeFile = file.size > FILE_SIZE_THRESHOLD;
    
    if (isLargeFile) {
      // Handle large files with Vercel Blob client upload
      await processLargeFile(file);
    } else {
      // Handle small files with direct upload
      await processSmallFile(file);
    }
  };

  const processSmallFile = async (file: File) => {
    setExtractingVariables(true);
    setVariables([]);
    setUploadProgress(0);

    try {
      setUploadProgress(10); // Start processing
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to show progress
      
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(30); // Before API call
      await new Promise(resolve => setTimeout(resolve, 300)); // Delay to show progress
      
      const response = await fetch('/api/document-templates/extract-variables', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(60); // After API call, before processing response
      await new Promise(resolve => setTimeout(resolve, 200)); // Delay to show progress
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to extract variables');
      }

      const data = await response.json();
      setUploadProgress(80); // Processing response
      await new Promise(resolve => setTimeout(resolve, 300)); // Delay to show progress
      
      // Filter out variables with empty names
      const validVariables = data.variables.filter((variable: any) => variable.name && variable.name.trim() !== '');
      setVariables(validVariables);
      
      setUploadProgress(100); // Complete
      await new Promise(resolve => setTimeout(resolve, 500)); // Show completion for a moment
      
      toast({
        title: "Variables Extracted",
        description: `Found ${validVariables.length} variables in the template`,
      });
    } catch (error) {
      console.error('Error extracting variables:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to extract variables from the template');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to extract variables from the template',
        variant: "destructive",
      });
    } finally {
      setExtractingVariables(false);
    }
  };

  const processLargeFile = async (file: File) => {
    setExtractingVariables(true);
    setVariables([]);
    setUploadProgress(0);

    try {
      // Use Vercel Blob client upload to bypass 4.5MB limit
      console.log('Using Vercel Blob client upload for large file:', file.name);
      setUploadProgress(10);
      
      // Import the upload function dynamically
      const { upload } = await import('@vercel/blob/client');
      
      setUploadProgress(20);
      
      // Upload directly to Vercel Blob from client with custom path
      // Create unique path: temp-uploads/companyId/userId/timestamp-filename
      const timestamp = Date.now();
      const customPath = `temp-uploads/${timestamp}-${file.name}`;
      
      const blob = await upload(customPath, file, {
        access: 'public',
        handleUploadUrl: '/api/document-templates/extract-variables-blob',
      });
      
      console.log('File uploaded to Vercel Blob:', {
        blobUrl: blob.url,
        size: file.size
      });
      
      setUploadProgress(60);
      setBlobUrl(blob.url);
      
      // Now extract variables from the uploaded blob
      console.log('Extracting variables from blob...');
      setUploadProgress(70);
      
      const processResponse = await fetch('/api/document-templates/process-blob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blob.url,
          filename: file.name,
          size: file.size
        }),
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.message || 'Failed to extract variables');
      }
      
      const processData = await processResponse.json();
      
      // Filter out variables with empty names
      const validVariables = processData.variables.filter((variable: any) => variable.name && variable.name.trim() !== '');
      setVariables(validVariables);
      
      setUploadProgress(100);
      
      console.log('Blob upload and variable extraction completed:', {
        blobUrl: blob.url,
        fileName: file.name,
        variablesFound: validVariables.length
      });

      toast({
        title: "Variables Extracted",
        description: `Found ${validVariables.length} variables in the large file (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });

    } catch (error) {
      console.error('Error processing large file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process large file');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to process large file',
        variant: "destructive",
      });
    } finally {
      setExtractingVariables(false);
    }
  };

  const resetForm = () => {
    setVariables([]);
    setTemplateName('');
    setSelectedCategory('');
    setDescription('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setDuplicateNameError(null);
    setDuplicateFileError(null);
    setBlobUrl(null);
    setExtractingVariables(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearFormFields = () => {
    setTemplateName('');
    setSelectedCategory('');
    setDescription('');
    setDuplicateNameError(null);
    setDuplicateFileError(null);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const checkExistingTemplates = async (templateName: string, fileName: string) => {
    try {
      const response = await fetch(`/api/document-templates/check-duplicates?name=${encodeURIComponent(templateName)}&fileName=${encodeURIComponent(fileName)}&isPublic=${isPublic}`);
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      return { hasNameConflict: false, hasFileConflict: false };
    } catch (error) {
      console.warn('Error checking existing templates:', error);
      return { hasNameConflict: false, hasFileConflict: false };
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if we have variables extracted
    if (variables.length === 0) {
      toast({
        title: "Error",
        description: "Please upload a file and extract variables first",
        variant: "destructive",
      });
      return;
    }

    // Check if we have required fields
    if (!templateName.trim()) {
      toast({
        title: "Missing Template Name",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: "Missing Category",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for existing templates before proceeding
      const fileName = selectedFile?.name || 'template.docx';
      const conflicts = await checkExistingTemplates(templateName, fileName);
      
      if (conflicts.hasNameConflict) {
        toast({
          title: "Template Name Already Exists",
          description: "A template with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        setDuplicateNameError("A template with this name already exists");
        clearFormFields();
        setIsSubmitting(false);
        return;
      }
      
      if (conflicts.hasFileConflict) {
        toast({
          title: "Filename Already Exists",
          description: "A template with this filename already exists. Please rename the file or choose a different template name.",
          variant: "destructive",
        });
        // Clear the entire form to allow user to start fresh
        resetForm();
        setIsSubmitting(false);
        return;
      }

      // Create FormData manually to avoid including large files automatically
      const formData = new FormData();
      
      // Add form fields - use state values for all form data
      formData.append('name', templateName || '');
      formData.append('category', selectedCategory || '');
      formData.append('description', description || '');
      
      // Add the file - either from direct upload or blob URL
      if (selectedFile && selectedFile.size <= FILE_SIZE_THRESHOLD) {
        // Small file: send directly
        formData.append('file', selectedFile);
        console.log('Sending small file directly:', selectedFile.name);
      } else if (blobUrl) {
        // Large file: send blob URL for server to download
        formData.append('blobUrl', blobUrl);
        formData.append('fileName', selectedFile?.name || 'template.docx');
        console.log('Sending blob URL for large file:', {
          blobUrl,
          fileName: selectedFile?.name
        });
      }
      
      // Send the enhanced variables format with types
      formData.append('variablesWithTypes', JSON.stringify(variables));
      formData.append('isPublic', isPublic.toString());



      const response = await fetch('/api/document-templates', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle unexpected errors (should be rare now with frontend validation)
        toast({
          title: "Upload Failed",
          description: errorData.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        // Clear the form on any error
        resetForm();
        return;
      }

      toast({
        title: "Success",
        description: "Template uploaded successfully",
      });

      onUploadComplete();
      resetForm();
    } catch (error) {
      console.error('Error uploading template:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to upload template. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          errorMessage = 'A template with this name already exists. Please choose a different name.';
        } else if (error.message.includes('file size')) {
          errorMessage = 'File is too large. Please try a smaller file.';
        } else if (error.message.includes('invalid file')) {
          errorMessage = 'Invalid file format. Please upload a valid Word document (.docx).';
        } else if (error.message.includes('storage')) {
          errorMessage = 'Failed to upload file to storage. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Clear the form on any error
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-4 max-w-full">
      <div className="grid w-full items-center gap-2">
        <Label htmlFor="file">Template File (Word Document)</Label>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="relative font-medium shrink-0 w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={extractingVariables}
          >
            <Upload className="h-4 w-4 mr-2" /> Choose File
          </Button>
          
        </div>
        <Input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          required
          disabled={extractingVariables}
          className="hidden"
        />

        {selectedFile && (
          <div className="text-sm">
            <p className="break-all text-blue-600">
              Selected: {selectedFile.name}
            </p>
            <p className="text-blue-600">
              ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              {selectedFile.size > FILE_SIZE_THRESHOLD && " • Using optimized upload"}
            </p>
            {checkingDuplicates && (
              <p className="text-gray-600 text-xs mt-1">
                🔍 Checking for duplicate files...
              </p>
            )}
            {duplicateFileError ? (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                ⚠️ {duplicateFileError}
              </p>
            ) : !checkingDuplicates && (
              <p className="text-amber-600 text-xs mt-1">
                ⚠️ If a file with this name already exists, you'll need to rename it or choose a different template name.
              </p>
            )}
          </div>
        )}
      </div>

      {extractingVariables && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600 w-full">
              {selectedFile && selectedFile.size > FILE_SIZE_THRESHOLD 
                ? `Processing large file... ${Math.round(uploadProgress)}%`
                : 'Extracting variables...'
              }
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500 text-center">
                {uploadProgress < 10 ? 'Initializing upload...' :
                 uploadProgress < 80 ? 'Extracting variables...' :
                 uploadProgress < 95 ? 'Processing file...' : 'Finalizing...'}
              </p>
            </span>
          </div>
        </div>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid w-full items-center gap-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter template name"
          value={templateName}
          onChange={(e) => {
            setTemplateName(e.target.value);
            // Clear duplicate name error when user starts typing
            if (duplicateNameError) {
              setDuplicateNameError(null);
            }
          }}
          className={duplicateNameError ? "border-red-500 focus:border-red-500" : ""}
          required
        />
        {duplicateNameError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {duplicateNameError}
          </p>
        )}
      </div>

      <div className="grid w-full items-center gap-2">
        <Label htmlFor="category">Category</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(DocumentCategory).map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid w-full items-center gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Enter template description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isPublic"
          checked={isPublic}
          onCheckedChange={async (checked) => {
            setIsPublic(checked);
            // Re-check for duplicates when public/private setting changes
            if (selectedFile) {
              await checkForDuplicateFile(selectedFile.name);
            }
          }}
        />
        <Label htmlFor="isPublic">
          Make template public (visible to all users in your company)
        </Label>
      </div>

      {variables.length > 0 && (
        <div className="space-y-2 max-w-full">
          <Label>Detected Variables ({variables.length})</Label>
          <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto bg-muted/50 w-full">
            <div className="grid gap-2 min-w-0 w-full">
              {variables.map((variable: DocumentVariable, index: number) => (
                <div key={index} className="flex flex-col gap-2 p-2 bg-muted rounded-md sm:flex-row sm:items-center sm:justify-between min-w-0 w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Badge variant="outline" className="font-mono text-xs bg-background text-foreground border-border shrink-0 max-w-[120px] truncate" title={variable.name}>
                      {truncateText(variable.name, 15)}
                    </Badge>
                    <Badge 
                      className="text-xs shrink-0 max-w-[80px] truncate" 
                      style={{
                        backgroundColor: getVariableTypeStyle(variable.type).backgroundColor,
                        color: getVariableTypeStyle(variable.type).color,
                        border: 'none'
                      }}
                      title={getVariableTypeDisplayName(variable.type)}
                    >
                      {truncateText(getVariableTypeDisplayName(variable.type), 10)}
                    </Badge>
                  </div>
                  {/* <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-[150px]" title={variable.originalTag}>
                    {truncateText(variable.originalTag, 25)}
                  </span> */}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting || extractingVariables || variables.length === 0 || !!duplicateFileError || checkingDuplicates}>
          {isSubmitting
            ? "Uploading..."
            : extractingVariables
            ? "Processing..."
            : checkingDuplicates
            ? "Checking..."
            : duplicateFileError
            ? "Upload Disabled"
            : "Upload Template"}
        </Button>
      </div>
    </form>
  );
} 