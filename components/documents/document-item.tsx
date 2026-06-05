/**
 * 🏢 Document Item - Reusable Document Display Component
 * 
 * PURPOSE: Individual document display with all status indicators
 * - Status icons and badges
 * - Progress indicators for processing documents
 * - Error display for failed documents
 * - Action buttons (delete, etc.)
 * - Reusable across different document lists
 */

"use client";

import { useTranslations } from "next-intl";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Trash2, User, Building, Loader2, AlertCircle, Clock, CheckCircle } from 'lucide-react';

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

interface DocumentItemProps {
  document: DocumentMetadata;
  onDelete?: (document: DocumentMetadata) => void;
  isDeleting?: boolean;
  className?: string;
}

export function DocumentItem({ document, onDelete, isDeleting = false, className = "" }: DocumentItemProps) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  // Utility functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 ${className}`}>
      <div className="flex items-center space-x-4 flex-1">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          {/* Document Header */}
          <div className="flex items-center space-x-2">
            <h3 className="font-medium truncate">{document.name}</h3>
            
            {/* Status Badge */}
            <div className="flex items-center space-x-1">
              {getStatusIcon(document.ingestion_status)}
              <Badge className={getStatusColor(document.ingestion_status)}>
                {document.ingestion_status}
              </Badge>
            </div>
            
            {/* Document Type Badge */}
            {document.company_id === 'public' ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Building className="h-3 w-3 mr-1" />
                BR18 Public
              </Badge>
            ) : document.is_company_wide ? (
              <Badge variant="outline">
                <Building className="h-3 w-3 mr-1" />
                Company
              </Badge>
            ) : (
              <Badge variant="outline">
                <User className="h-3 w-3 mr-1" />
                Personal
              </Badge>
            )}
          </div>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground truncate">
            {document.description || tc("noResults")}
          </p>
          
          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
            <span>{formatFileSize(document.size)}</span>
            <span>Uploaded by {document.uploaded_by_name}</span>
            <span>{new Date(document.created_at).toLocaleDateString()}</span>
            {document.chunks_count && (
              <span>{document.chunks_count} chunks</span>
            )}
          </div>
          
          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Processing Progress */}
          {document.ingestion_status === 'processing' && (
            <div className="mt-2">
              <Progress value={document.ingestion_progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {t("processingDocuments")}... {document.ingestion_progress}%
              </p>
            </div>
          )}
          
          {/* Error Display */}
          {document.ingestion_status === 'failed' && document.ingestion_error && (
            <p className="text-xs text-red-600 mt-1">
              {tc("error")}: {document.ingestion_error}
            </p>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center space-x-2">
        {document.company_id !== 'public' && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(document)}
            disabled={document.ingestion_status === 'processing' || isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
