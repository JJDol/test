/**
 * 🏢 Enterprise Templates Page
 * 
 * PURPOSE: Main templates page following enterprise architecture principles
 * - Thin page component that orchestrates business logic and UI
 * - Clean separation of concerns via custom hooks and components
 * - Professional error handling and loading states
 * - Document and project template management
 * - Scalable and maintainable architecture
 * 
 * ARCHITECTURE:
 * - useTemplates: Document template business logic
 * - useProjectTemplates: Project template business logic
 * - TemplatesContent: Pure UI component orchestrator
 * - page.tsx: Orchestration and composition
 * 
 * ENTERPRISE BENEFITS: 
 * - Single responsibility principle
 * - Testable components and logic
 * - Easy to extend and modify
 * - Clear error boundaries
 * - Professional user experience
 * - Maintainable codebase
 */

"use client";

import { TemplatesContent } from "@/components/templates/templates-content";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

export default function TemplatesPage() {
  return (
    <ProtectedPageWrapper loadingMessage="Loading templates...">
      <TemplatesContent />
    </ProtectedPageWrapper>
  );
}
