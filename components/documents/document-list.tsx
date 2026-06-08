/**
 * 🏢 Document List - Reusable Document List Component
 * 
 * PURPOSE: Displays a list of documents with loading and empty states
 * - Loading skeletons for better UX
 * - Empty state with call-to-action
 * - Scrollable list with consistent spacing
 * - Reusable across different document views
 */

"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { DocumentItem } from './document-item';

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

interface DocumentListProps {
  documents: DocumentMetadata[];
  loading?: boolean;
  onDeleteDocument?: (document: DocumentMetadata) => void;
  isDeleting?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  emptySubMessage?: string;
  className?: string;
}

export function DocumentList({
  documents,
  loading = false,
  onDeleteDocument,
  isDeleting = false,
  title,
  description,
  emptyMessage,
  emptySubMessage,
  className = ""
}: DocumentListProps) {
  const t = useTranslations("documents");
  const resolvedTitle = title ?? t("title");
  const resolvedEmptyMessage = emptyMessage ?? t("noDocuments");
  const resolvedEmptySubMessage = emptySubMessage ?? t("uploadDescription");
  const defaultDescription = t("documentsFound", { count: documents.length });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        <CardDescription>
          {description || defaultDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {/* Loading skeleton for documents */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/3"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">{resolvedEmptyMessage}</h3>
            <p>{resolvedEmptySubMessage}</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {documents.map((document) => (
                <DocumentItem
                  key={document.id}
                  document={document}
                  onDelete={onDeleteDocument}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
