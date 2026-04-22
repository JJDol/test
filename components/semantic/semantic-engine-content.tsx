/**
 * 🏢 Semantic Engine Content - Enterprise UI Orchestrator
 * 
 * PURPOSE: Clean, focused semantic engine UI orchestrator
 * - Composed of smaller, reusable components
 * - Professional error handling and loading states
 * - Chat interface and file management
 * - Responsive enterprise layout
 * 
 * ENTERPRISE BENEFITS:
 * - Composed of focused, reusable components
 * - Testable UI component
 * - Clear separation of concerns
 * - Professional user experience
 * - Maintainable component architecture
 */

"use client";

import { ChatSection } from "./chat-section";
import { SourcesSection } from "./sources-section"
import { IngestionOverlay } from "./ingestion-overlay";
import { useSemanticEngine } from "@/hooks/use-semantic-engine";

export function SemanticEngineContent() {
  const {
    state,
    loading,
    error,
    messagesEndRef,
    actions,
    progressPercentage,
    canSendMessage,
  } = useSemanticEngine();

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]">
      {/* TODO: This ingestion has to run even when you go to different pages, it has to run in the background*/}
      {/* Ingestion overlay */}
      {loading.ingestion && (
        <IngestionOverlay 
          ingestionStatus={state.ingestionStatus}
          progressPercentage={progressPercentage}
        />
      )}
      
      <div className="grid grid-cols-3 gap-4 h-full max-h-full relative">
        {/* Chat section - Left side */}
        <div className="col-span-2 flex flex-col space-y-4 h-full max-h-full overflow-hidden">
          <ChatSection
            messages={state.messages}
            inputValue={state.inputValue}
            isLoading={loading.chat}
            isIngesting={loading.ingestion}
            error={error.chat}
            messagesEndRef={messagesEndRef}
            canSendMessage={canSendMessage}
            onSubmit={actions.handleSubmit}
            onKeyDown={actions.handleKeyDown}
            onInputChange={actions.setInputValue}
            onUploadComplete={actions.handleUploadComplete}
            onNewChat={actions.handleNewChat}
          />
        </div>

        {/* Sources section - Right side */}
        <SourcesSection
          messages={state.messages}
          userRole={state.userRole}
        />
      </div>
    </div>
  );
}
