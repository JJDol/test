/**
 * 🏢 Chat Section - Reusable Chat Interface Component
 * 
 * PURPOSE: Chat interface with message display and input
 * - Message list with auto-scrolling
 * - File management integration
 * - Input form with keyboard shortcuts
 * - Error handling and loading states
 * - Professional chat UI
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { FileList } from "./FileList";
import { SourceAttribution } from "@/lib/types/types";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttribution[];
}

interface ChatSectionProps {
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  isIngesting: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  canSendMessage: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onInputChange: (value: string) => void;
  onUploadComplete: () => void;
  onNewChat: () => void;
}

export function ChatSection({
  messages,
  inputValue,
  isLoading,
  isIngesting,
  error,
  messagesEndRef,
  canSendMessage,
  onSubmit,
  onKeyDown,
  onInputChange,
  onUploadComplete,
  onNewChat,
}: ChatSectionProps) {
  const t = useTranslations("documents");
  return (
    <Card className="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden">
      {/* Files list */}
      <div className="p-4 border-b">
        {/* TODO: This has to be connected with ai-documents table and you can select where you want to search from it */}
        <FileList 
          onUpdate={onUploadComplete}
          onNewChat={onNewChat}
        />
      </div>

      {/* Messages container */}
      <ScrollArea className="flex-1 p-4 min-h-0 overflow-hidden" style={{ scrollBehavior: 'smooth' }}>
        <div className="space-y-4 pb-6">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              isLoading={isLoading && index === messages.length - 1 && message.role === 'assistant'}
            />
          ))}
          {/* Scroll target */}
          <div ref={messagesEndRef} className="h-8" />
        </div>
      </ScrollArea>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mx-4 my-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input form */}
      <div className="p-4 border-t">
        <form onSubmit={onSubmit} className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isIngesting ? t("processingDocuments") : t("askQuestion")}
              disabled={isLoading || isIngesting}
              className="flex-1"
            />
            <FileUpload onUploadComplete={onUploadComplete} disabled={isIngesting} />
          </div>
          <Button 
            type="submit" 
            disabled={!canSendMessage}
            onClick={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
          >
            <SendHorizontal className="h-5 w-5" />
            <span className="sr-only">{t("sendMessage")}</span>
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {t("aiDisclaimer")}
        </p>
      </div>
    </Card>
  );
}
