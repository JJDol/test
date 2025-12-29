/**
 * @file Frontend service for managing AI-related documents and their ingestion process.
 * 
 * @purpose This file is intended to be the central client-side service for all interactions
 * with the semantic document APIs. It provides a clean, typed interface for frontend
 * components to upload, list, delete, and monitor the status of AI documents without
 * needing to know the specific API endpoint details.
 * 
 * @architectural_note (Handover Note)
 * Currently, the functions in this service are placeholders. The actual backend logic for
 * these operations has already been implemented in the API routes located under:
 * `/app/api/semantic/documents/`
 * 
 * The next developer should implement the functions in this file to make `fetch` calls
 * to the corresponding API routes. This will centralize all frontend file operations
 * and connect the UI components (like FileUpload, FileList, etc.) to the live backend.
 * 
 * @implementation_details
 * - `uploadFile` should call: `POST /api/semantic/documents/upload`
 * - `listFiles` should call: `GET /api/semantic/documents`
 * - `deleteFile` should call: `DELETE /api/semantic/documents/[id]`
 * - `getIngestionStatus` should call: `GET /api/semantic/documents/ingestion-status`
 * - `reingestDocuments` will need a new API route, likely `POST /api/semantic/documents/reingest`
 */

export interface FileInfo {
  name: string;
  uploadedAt: string;
  size: string;
  isTemporary: boolean;
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

// TODO: Implement new file upload API
export async function uploadFile(file: File, isTemporary: boolean): Promise<void> {
  // Temporarily disabled - will implement with new API
  console.log('File upload temporarily disabled:', file.name);
  throw new Error('File upload coming soon! Chat functionality is ready.');
}

// TODO: Implement new file list API  
export async function listFiles(): Promise<FileListResponse> {
  // Return empty list for now
  return { files: [] };
}

// TODO: Implement new file delete API
export async function deleteFile(fileName: string): Promise<void> {
  console.log('File delete temporarily disabled:', fileName);
  throw new Error('File management coming soon!');
}

// TODO: Implement new temporary files API
export async function removeTemporaryFiles(): Promise<void> {
  console.log('Remove temporary files temporarily disabled');
  // Do nothing for now
}

// TODO: Implement new reingest API
export async function reingestDocuments(): Promise<void> {
  console.log('Reingest temporarily disabled');
  throw new Error('Document reingestion coming soon!');
}

// TODO: Implement new ingestion status API
export async function getIngestionStatus(): Promise<IngestionStatus> {
  // Return ready status
  return {
    is_ingesting: false,
    total_documents: 0,
    completed_documents: 0,
    current_document: null,
    error: null,
    success: true,
    stage: "Ready",
    progress: 0
  };
} 