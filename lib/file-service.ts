/**
 * Frontend service for managing AI-related documents and their ingestion process.
 * Connects to the backend API routes under /api/semantic/documents/.
 */

export interface FileInfo {
  id: string;
  name: string;
  uploadedAt: string;
  size: string;
  isTemporary: boolean;
  ingestionStatus?: string;
  ingestionProgress?: number;
  type?: string;
}

export interface FileListResponse {
  files: FileInfo[];
}

export interface IngestionStatus {
  is_ingesting: boolean;
  total_documents: number;
  completed_documents: number;
  current_document: string | null;
  error: string | null;
  success: boolean;
  stage: string;
  progress: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function uploadFile(file: File, isTemporary: boolean): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_company_wide', (!isTemporary).toString());

  const response = await fetch('/api/semantic/documents/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error || `Upload failed (HTTP ${response.status})`);
  }
}

export async function listFiles(): Promise<FileListResponse> {
  const response = await fetch('/api/semantic/documents', {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to load documents' }));
    throw new Error(errorData.error || `Failed to load documents (HTTP ${response.status})`);
  }

  const data = await response.json();
  const documents = data.documents || [];

  const files: FileInfo[] = documents.map((doc: any) => ({
    id: doc.id,
    name: doc.name,
    uploadedAt: formatDate(doc.created_at),
    size: formatFileSize(doc.size),
    isTemporary: !doc.is_company_wide,
    ingestionStatus: doc.ingestion_status,
    ingestionProgress: doc.ingestion_progress,
    type: doc.type,
  }));

  return { files };
}

export async function deleteFile(documentId: string): Promise<void> {
  const response = await fetch(`/api/semantic/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(errorData.error || `Delete failed (HTTP ${response.status})`);
  }
}

export async function removeTemporaryFiles(): Promise<void> {
  const { files } = await listFiles();
  const temporaryFiles = files.filter(f => f.isTemporary);

  await Promise.allSettled(
    temporaryFiles.map(f => deleteFile(f.id))
  );
}

export async function reingestDocuments(): Promise<void> {
  // Re-ingestion requires deleting and re-uploading; not yet supported as a single operation.
  throw new Error('Document re-ingestion is not yet available. Please delete and re-upload the document.');
}

export async function getIngestionStatus(): Promise<IngestionStatus> {
  const { files } = await listFiles();

  const processingFiles = files.filter(f => f.ingestionStatus === 'processing');
  const completedFiles = files.filter(f => f.ingestionStatus === 'completed');
  const failedFiles = files.filter(f => f.ingestionStatus === 'failed');

  if (processingFiles.length === 0) {
    return {
      is_ingesting: false,
      total_documents: files.length,
      completed_documents: completedFiles.length,
      current_document: null,
      error: failedFiles.length > 0 ? `${failedFiles.length} document(s) failed processing` : null,
      success: failedFiles.length === 0,
      stage: 'Ready',
      progress: files.length > 0 ? Math.round((completedFiles.length / files.length) * 100) : 0,
    };
  }

  return {
    is_ingesting: true,
    total_documents: files.length,
    completed_documents: completedFiles.length,
    current_document: processingFiles[0]?.name || null,
    error: null,
    success: false,
    stage: 'Processing',
    progress: Math.round((completedFiles.length / files.length) * 100),
  };
}
