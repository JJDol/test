/**
 * 🏢 Enterprise Documents Page
 * 
 * PURPOSE: Main document management page following enterprise architecture principles
 * - Thin page component that orchestrates business logic and UI
 * - Clean separation of concerns via custom hooks and components
 * - Professional error handling and loading states
 * - Real-time document processing status updates
 * - Scalable and maintainable architecture
 * 
 * ARCHITECTURE:
 * - useDocuments: Business logic, state management, and smart polling
 * - DocumentsContent: Pure UI component
 * - page.tsx: Orchestration and composition
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Testable components and logic
 * - Easy to extend and modify
 * - Clear error boundaries
 * - Professional user experience
 * - Maintainable codebase
 * - Optimized polling and state management
 */

"use client";

import { useTranslations } from "next-intl";
import { useDocuments } from "@/hooks/use-documents";
import { DocumentsContent } from "@/components/documents/documents-content";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const {
    // State
    documents,
    user,
    searchTerm,
    filterType,
    processingDocuments,
    loading,
    error,
    
    // Computed values
    filteredDocuments,
    documentStats,
    
    // Delete dialog state
    deleteDialog,
    
    // Actions
    actions
  } = useDocuments();

  return (
    <ProtectedPageWrapper loadingMessage={t("loadingDocuments")}>
      <DocumentsContent
        // State
        documents={documents}
        searchTerm={searchTerm}
        filterType={filterType}
        filteredDocuments={filteredDocuments}
        processingDocuments={processingDocuments}
        loading={loading}
        error={error}
        
        // Computed values
        documentStats={documentStats}
        
        // Delete dialog state
        deleteDialog={deleteDialog}
        
        // Actions
        onRefreshDocuments={actions.refreshDocuments}
        onUploadComplete={actions.handleUploadComplete}
        onDeleteDocument={actions.deleteDocument}
        onConfirmDelete={actions.confirmDelete}
        onCancelDelete={actions.cancelDelete}
        onSetSearchTerm={actions.setSearchTerm}
        onSetFilterType={actions.setFilterType}
        onRetryError={actions.retryOnError}
      />
    </ProtectedPageWrapper>
  );
}