/**
 * 🏢 Semantic Engine Page - Enterprise Architecture Implementation
 * 
 * PURPOSE: Thin page orchestrator for semantic search engine
 * - Uses custom hook for business logic (useSemanticEngine)
 * - Composed of focused UI components
 * - Clean separation of concerns
 * - Professional enterprise architecture
 * 
 * ENTERPRISE BENEFITS:
 * - Testable and maintainable architecture
 * - Reusable business logic
 * - Focused UI components
 * - Clear separation of concerns
 * - Scalable codebase
 */

// TODO: Semantic engine is in process of development, this is not the final nor working version even though there are some parts that work.

"use client";

import { SemanticEngineContent } from "@/components/semantic/semantic-engine-content";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

export default function SemanticEngine() {
  return (
    <ProtectedPageWrapper loadingMessage="Loading AI assistant...">
      <SemanticEngineContent />
    </ProtectedPageWrapper>
  );
}
