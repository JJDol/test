/**
 * 🏢 Documents Content - Enterprise Document Management UI Component
 * 
 * PURPOSE: Clean, focused document management UI orchestrator
 * - Composed of smaller, reusable components
 * - Professional error handling and loading states
 * - Responsive enterprise layout
 * - Accessibility considerations
 * 
 * ENTERPRISE BENEFITS:
 * - Composed of focused, reusable components
 * - Testable UI component
 * - Clear separation of concerns
 * - Professional user experience
 * - Maintainable component architecture
 */

"use client";

import { LoadingState } from '@/components/ui/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DocumentHeader } from './document-header';
import { DocumentSearchFilter } from './document-search-filter';
import { DocumentList } from './document-list';
import { DocumentDeleteDialog } from './document-delete-dialog';

// Types
interface DocumentMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  company_id: string;
  user_id: string;
  is_company_wide: boolean;
  description?: string;
  tags?: string[];
  ingestion_status: 'pending' | 'processing' | 'completed' | 'failed';
  ingestion_progress: number;
  ingestion_error?: string;
  chunks_count?: number;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
  uploaded_by_name: string;
}

type FilterType = 'all' | 'personal' | 'company' | 'public';

interface DocumentsContentProps {
  // State
  documents: DocumentMetadata[];
  searchTerm: string;
  filterType: FilterType;
  filteredDocuments: DocumentMetadata[];
  processingDocuments: Set<string>;
  
  // Loading states
  loading: {
    documents: boolean;
    user: boolean;
    deleting: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    documents: string | null;
    user: string | null;
    delete: string | null;
    overall: string | null;
  };
  
  // Computed values
  documentStats: {
    total: number;
    personal: number;
    company: number;
    public: number;
    processing: number;
  };
  
  // Delete dialog state
  deleteDialog: {
    open: boolean;
    document: DocumentMetadata | null;
  };
  
  // Actions
  onRefreshDocuments: () => Promise<void>;
  onUploadComplete: (documentId: string) => Promise<void>;
  onDeleteDocument: (document: DocumentMetadata) => Promise<void>;
  onConfirmDelete: () => Promise<void>;
  onCancelDelete: () => void;
  onSetSearchTerm: (term: string) => void;
  onSetFilterType: (type: FilterType) => void;
  onRetryError: () => Promise<void>;
}

export function DocumentsContent({
  documents,
  searchTerm,
  filterType,
  filteredDocuments,
  processingDocuments,
  loading,
  error,
  documentStats,
  deleteDialog,
  onRefreshDocuments,
  onUploadComplete,
  onDeleteDocument,
  onConfirmDelete,
  onCancelDelete,
  onSetSearchTerm,
  onSetFilterType,
  onRetryError,
}: DocumentsContentProps) {

  // Show loading state for initial page load
  if (loading.overall && documents.length === 0) {
    return (
      <LoadingState 
        title="Loading Documents"
        message="Please wait while we load your documents..."
        variant="page"
      />
    );
  }

  // Show error state with retry options
  if (error.overall && documents.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  {error.documents && <div>Documents: {error.documents}</div>}
                  {error.user && <div>User Profile: {error.user}</div>}
                  {error.delete && <div>Delete: {error.delete}</div>}
                </div>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={onRetryError} 
              className="w-full"
              disabled={loading.overall}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading.overall ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Stats and Actions */}
      <DocumentHeader
        stats={documentStats}
        onRefresh={onRefreshDocuments}
        onUploadComplete={onUploadComplete}
        isRefreshing={loading.documents}
      />

      {/* Search and Filter */}
      <DocumentSearchFilter
        searchTerm={searchTerm}
        filterType={filterType}
        onSearchChange={onSetSearchTerm}
        onFilterChange={onSetFilterType}
      />

      {/* Documents List */}
      <DocumentList
        documents={filteredDocuments}
        loading={loading.documents}
        onDeleteDocument={onDeleteDocument}
        isDeleting={loading.deleting}
      />

      {/* Delete Confirmation Dialog */}
      <DocumentDeleteDialog
        open={deleteDialog.open}
        document={deleteDialog.document}
        isDeleting={loading.deleting}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </div>
  );
}
