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

import { Card } from "@/components/ui/card";
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

  // Backend offline state
  if (error.backend) {
    return (
      <div className="container mx-auto p-4 h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-center h-full">
          <Card className="p-8 max-w-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Not available right now</h2>
            <p className="text-muted-foreground">
              The semantic search engine is currently offline. Please check back later.
            </p>
          </Card>
        </div>
      </div>
    );
  }

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
