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

import { useTranslations } from "next-intl";
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
  const t = useTranslations("documents");
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const sources = lastMessage?.sources || [];
  const hasAdminAccess = userRole === 'ADMIN' || userRole === 'COMPANY_ADMIN';

  return (
    <Card className="col-span-1 overflow-hidden">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4">
          {/* Admin Panel - Show for ADMIN or COMPANY_ADMIN */}
          {hasAdminAccess && (
            <div className="pb-4 border-b">
              <BR18IngestionPanel />
            </div>
          )}
          
          <h3 className="font-semibold">{t("sources")}</h3>
          
          {/* Sources list - Limited to top 5 */}
          {sources.length > 0 ? (
            sources.slice(0, 5).map((source, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium text-xs text-muted-foreground mb-1">
                  {source.document_name}
                  {source.page_number && ` - ${t("page", { number: source.page_number })}`}
                  <span className="ml-2 opacity-75">
                    ({t("match", { percent: Math.round(source.confidence_score * 100) })})
                  </span>
                </p>
                <p className="leading-relaxed">{source.text_snippet}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("noDocuments")}
            </p>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
