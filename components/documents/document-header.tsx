/**
 * 🏢 Document Header - Reusable Document Page Header Component
 * 
 * PURPOSE: Standardized header for document pages
 * - Title and description
 * - Document statistics
 * - Action buttons (refresh, upload)
 * - Reusable across different document views
 */

import { Button } from '@/components/ui/button';
import { DocumentUploadDialog } from '@/components/ui/document-upload-dialog';
import { RefreshCw } from 'lucide-react';
import { DocumentStats } from './document-stats';

interface DocumentHeaderProps {
  title?: string;
  description?: string;
  stats: {
    total: number;
    personal: number;
    company: number;
    public: number;
    processing: number;
  };
  onRefresh: () => Promise<void>;
  onUploadComplete: (documentId: string) => Promise<void>;
  isRefreshing?: boolean;
  showUpload?: boolean;
  className?: string;
}

export function DocumentHeader({
  title = "Document Management",
  description = "Upload and manage documents for your AI knowledge base",
  stats,
  onRefresh,
  onUploadComplete,
  isRefreshing = false,
  showUpload = true,
  className = ""
}: DocumentHeaderProps) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <DocumentStats stats={stats} />
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={onRefresh} 
          variant="outline"
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        {showUpload && (
          <DocumentUploadDialog
            onUploadComplete={onUploadComplete}
            title="Upload Document"
            description="Upload a document to add it to your AI knowledge base"
            showCompanyWideToggle={true}
            allowedFileTypes={[".pdf", ".doc", ".docx", ".txt", ".md"]}
            maxFileSize={50 * 1024 * 1024} // 50MB
          />
        )}
      </div>
    </div>
  );
}
