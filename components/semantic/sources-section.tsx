/**
 * 🏢 Sources Section - Reusable Sources Display Component
 * 
 * PURPOSE: Display sources and admin panel
 * - Source attribution with confidence scores
 * - Admin panel for authorized users
 * - Professional sources layout
 * - Role-based access control
 */

"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BR18IngestionPanel } from "@/components/admin/BR18IngestionPanel";
import { SourceAttribution } from "@/lib/types/types";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttribution[];
}

interface SourcesSectionProps {
  messages: Message[];
  userRole: string | null;
}

export function SourcesSection({ messages, userRole }: SourcesSectionProps) {
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const sources = lastMessage?.sources || [];
  const hasAdminAccess = userRole === 'ADMIN' || userRole === 'COMPANY_ADMIN';

  return (
    <Card className="col-span-1 overflow-hidden">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4">
          {/* Admin Panel - Show only for ADMIN or COMPANY_ADMIN in development */}
          {hasAdminAccess && process.env.NODE_ENV === 'development' && (
            <div className="pb-4 border-b">
              <BR18IngestionPanel />
            </div>
          )}

          {/* Public Knowledge Table - Show in production */}
          {/* TODO: This is a placeholder for the public knowledge base */}
          {process.env.NODE_ENV === 'production' && (
            <div className="pb-4 border-b">
              <h4 className="font-medium mb-3">Public Knowledge Base</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>Construction Standards</span>
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>Safety Regulations</span>
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>Industry Guidelines</span>
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
              </div>
            </div>
          )}
          
          <h3 className="font-semibold">Sources</h3>
          
          {/* Sources list - Limited to top 5 */}
          {sources.length > 0 ? (
            sources.slice(0, 5).map((source, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium text-xs text-muted-foreground mb-1">
                  {source.document_name}
                  {source.page_number && ` - Page ${source.page_number}`}
                  <span className="ml-2 opacity-75">
                    ({Math.round(source.confidence_score * 100)}% match)
                  </span>
                </p>
                <p className="leading-relaxed">{source.text_snippet}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No sources available for the current response.
            </p>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
