"use client";

/**
 * Contract Upload Dialog - AI-powered contract information extraction
 * 
 * Features:
 * - Upload PDF/DOCX/TXT contract files
 * - AI extracts key information (project name, address, client, etc.)
 * - Review and edit extracted information before project creation
 * - Automatic project creation with pre-filled variables
 * - Template selection for the new project
 * 
 * Workflow:
 * 1. Upload contract file
 * 2. AI extracts information (loading state)
 * 3. Review extracted data (editable)
 * 4. Select templates for project
 * 5. Create project with pre-filled data
 */

import { useState, useEffect } from "react";
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
import { Upload, FileText, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContractData, contractExtractor } from "@/lib/services/ai/contract-extractor";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import { ProjectTemplateDropdown } from "@/components/ui/project-template-dropdown";
import { CategoryTabsList } from "@/components/ui/category-tabs-list";
import { Tabs, TabsContent } from "@/components/ui/tabs";

interface ContractUploadDialogProps {
  onProjectCreated: () => void;
}

interface ProjectTemplate {
  name: string;
  category: DocumentCategory;
  description: string | null;
  variables: string[];
}

type ExtractionStep = 'upload' | 'extracting' | 'review' | 'creating';

interface ExtractionData {
  contractData: ContractData;
  variableMapping: Record<string, any>;
  confidence: 'high' | 'medium' | 'low';
  stats: {
    tokensUsed: number;
    estimatedCost: number;
    wordCount?: number;
  };
}

export function ContractUploadDialog({ onProjectCreated }: ContractUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ExtractionStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [extractionData, setExtractionData] = useState<ExtractionData | null>(null);
  const [editedData, setEditedData] = useState<Partial<ContractData>>({});
  const [error, setError] = useState<string | null>(null);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key in DocumentCategory]?: string }>({});

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('upload');
      setFile(null);
      setExtractionData(null);
      setEditedData({});
      setError(null);
      setSelectedTemplates({});
    }
  }, [open]);

  // Fetch project templates when moving to review step
  useEffect(() => {
    if (step === 'review' && projectTemplates.length === 0) {
      fetchProjectTemplates();
    }
  }, [step]);

  const fetchProjectTemplates = async () => {
    try {
      const response = await fetch('/api/project-templates');
      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data) ? data : [];
        setProjectTemplates(
          rows.map((row: Record<string, unknown>) => ({
            name: String(row.name ?? ''),
            category: row.category as DocumentCategory,
            description: (row.description as string | null) ?? null,
            variables: Array.isArray(row.templates)
              ? (row.templates as string[])
              : Array.isArray(row.variables)
                ? (row.variables as string[])
                : [],
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching project templates:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB

  const handleExtractContract = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setStep('extracting');
    setError(null);

    try {
      let response: Response;

      if (file.size > FILE_SIZE_THRESHOLD) {
        const { upload } = await import('@vercel/blob/client');
        const customPath = `contract-uploads/${Date.now()}-${file.name}`;
        const blob = await upload(customPath, file, {
          access: 'public',
          handleUploadUrl: '/api/ai/extract-contract-blob',
        });
        response = await fetch(
          `/api/ai/extract-contract?blobUrl=${encodeURIComponent(blob.url)}`,
          { method: 'POST' }
        );
      } else {
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch('/api/ai/extract-contract', {
          method: 'POST',
          body: formData,
        });
      }

      let result: Record<string, any>;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          text.includes('Request Entity')
            ? 'File too large for server. Please try a smaller file.'
            : `Server error: ${text.slice(0, 100)}`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Failed to extract contract information');
      }

      setExtractionData(result.extraction);
      setEditedData(result.extraction.contractData);
      setStep('review');

    } catch (err) {
      console.error('Error extracting contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract contract information');
      setStep('upload');
    }
  };

  const handleCreateProject = async () => {
    if (!extractionData) return;

    setStep('creating');
    setError(null);

    try {
      // Merge original data with edited values
      const finalContractData = {
        ...extractionData.contractData,
        ...editedData,
      };

      const response = await fetch('/api/ai/create-project-from-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractData: finalContractData,
          variableMapping: extractionData.variableMapping,
          selectedTemplates,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Failed to create project');
      }

      // Success!
      setOpen(false);
      onProjectCreated();

    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setStep('review');
    }
  };

  const getStepProgress = () => {
    switch (step) {
      case 'upload': return 25;
      case 'extracting': return 50;
      case 'review': return 75;
      case 'creating': return 90;
      default: return 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Create from Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Contract Import
          </DialogTitle>
          <DialogDescription>
            Upload a contract file and let AI extract project information automatically
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <Label htmlFor="contract-file" className="cursor-pointer">
                <div className="text-sm font-medium mb-2">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-gray-500">
                  PDF, DOCX, or TXT (max 10MB)
                </div>
              </Label>
              <Input
                id="contract-file"
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {file && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExtractContract} disabled={!file}>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Information
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Extracting */}
        {step === 'extracting' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="text-lg font-medium">Analyzing contract...</div>
            <div className="text-sm text-gray-500">
              AI is extracting project information from your contract
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && extractionData && (
          <div className="space-y-4">
            {/* Confidence Badge */}
            <Alert variant={extractionData.confidence === 'high' ? 'default' : 'default'}>
              <AlertDescription className="flex items-center gap-2">
                <span className={`font-medium ${
                  extractionData.confidence === 'high' ? 'text-green-600' : 
                  extractionData.confidence === 'medium' ? 'text-yellow-600' : 
                  'text-orange-600'
                }`}>
                  Extraction Confidence: {extractionData.confidence.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  ({extractionData.stats.wordCount} words, 
                  ${extractionData.stats.estimatedCost.toFixed(4)} cost)
                </span>
              </AlertDescription>
            </Alert>

            {/* Extracted Data - Editable */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={editedData.projectName || extractionData.contractData.projectName}
                  onChange={(e) => setEditedData({ ...editedData, projectName: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <Label htmlFor="projectAddress">Project Address *</Label>
                <Input
                  id="projectAddress"
                  value={editedData.projectAddress || extractionData.contractData.projectAddress}
                  onChange={(e) => setEditedData({ ...editedData, projectAddress: e.target.value })}
                  placeholder="Enter project address"
                />
              </div>

              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={editedData.clientName || extractionData.contractData.clientName}
                  onChange={(e) => setEditedData({ ...editedData, clientName: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <Label htmlFor="endDate">Deadline</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editedData.endDate || extractionData.contractData.endDate || ''}
                  onChange={(e) => setEditedData({ ...editedData, endDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="clientCVR">Client CVR</Label>
                <Input
                  id="clientCVR"
                  value={editedData.clientCVR || extractionData.contractData.clientCVR || ''}
                  onChange={(e) => setEditedData({ ...editedData, clientCVR: e.target.value })}
                  placeholder="CVR number"
                />
              </div>

              <div>
                <Label htmlFor="totalArea">Total Area</Label>
                <Input
                  id="totalArea"
                  value={editedData.totalArea || extractionData.contractData.totalArea || ''}
                  onChange={(e) => setEditedData({ ...editedData, totalArea: e.target.value })}
                  placeholder="e.g., 500 m²"
                />
              </div>

              <div>
                <Label htmlFor="subject">Emne (Subject)</Label>
                <Input
                  id="subject"
                  value={editedData.subject ?? extractionData.contractData.subject ?? ''}
                  onChange={(e) => setEditedData({ ...editedData, subject: e.target.value })}
                  placeholder="Document subject line"
                />
              </div>

              <div>
                <Label htmlFor="revisionDate">Revision dato</Label>
                <Input
                  id="revisionDate"
                  type="date"
                  value={editedData.revisionDate ?? extractionData.contractData.revisionDate ?? ''}
                  onChange={(e) => setEditedData({ ...editedData, revisionDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="revisionNumber">Revision nr.</Label>
                <Input
                  id="revisionNumber"
                  value={editedData.revisionNumber ?? extractionData.contractData.revisionNumber ?? ''}
                  onChange={(e) => setEditedData({ ...editedData, revisionNumber: e.target.value })}
                  placeholder="e.g. A, B, 02"
                />
              </div>
            </div>

            {/* Template Selection */}
            <div className="mt-6">
              <Label className="text-base mb-3 block">Select Project Templates (Optional)</Label>
              <Tabs defaultValue={DocumentCategory.ARCHITECTURE} className="w-full">
                <div className="flex flex-col space-y-4">
                  <CategoryTabsList
                    categories={Object.values(DocumentCategory).slice(0, 4)}
                    selectedTemplates={selectedTemplates}
                    gridCols={4}
                  />
                  <CategoryTabsList
                    categories={Object.values(DocumentCategory).slice(4)}
                    selectedTemplates={selectedTemplates}
                    gridCols={3}
                  />
                </div>
                {Object.values(DocumentCategory).map((category) => (
                  <TabsContent key={category} value={category} className="mt-4">
                    <ProjectTemplateDropdown
                      category={category}
                      selectedTemplate={selectedTemplates[category]}
                      projectTemplates={projectTemplates}
                      onTemplateSelect={(templateName) =>
                        setSelectedTemplates((prev) => ({
                          ...prev,
                          [category]: templateName,
                        }))
                      }
                      onTemplateClear={() =>
                        setSelectedTemplates((prev) => {
                          const next = { ...prev };
                          delete next[category];
                          return next;
                        })
                      }
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleCreateProject}>
                Create Project
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Creating */}
        {step === 'creating' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="text-lg font-medium">Creating project...</div>
            <div className="text-sm text-gray-500">
              Setting up your project with pre-filled data
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
