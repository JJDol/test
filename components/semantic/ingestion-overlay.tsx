/**
 * 🏢 Ingestion Overlay - Document Processing Status Component
 * 
 * PURPOSE: Full-screen overlay showing document ingestion progress
 * - Progress indicator with percentage
 * - Current document being processed
 * - Professional loading animation
 * - Non-blocking overlay (navigation still works)
 */

"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { IngestionStatus } from "@/lib/file-service";

interface IngestionOverlayProps {
  ingestionStatus: IngestionStatus | null;
  progressPercentage: number;
}

export function IngestionOverlay({ ingestionStatus, progressPercentage }: IngestionOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/50 z-40 rounded-lg"></div>
      
      {/* Progress card */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-50">
        <Card className="w-[500px] p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">Processing Documents</h2>
          
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Please wait while we process your documents...</p>
          </div>
          
          {ingestionStatus && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Progress: {ingestionStatus.completed_documents} of {ingestionStatus.total_documents} documents
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              
              <Progress value={progressPercentage} className="h-2" />
              
              {ingestionStatus.current_document && (
                <p className="text-sm text-muted-foreground">
                  Currently processing: {ingestionStatus.current_document}
                </p>
              )}
              
              {ingestionStatus.stage && (
                <p className="text-sm text-muted-foreground">
                  Stage: {ingestionStatus.stage}
                </p>
              )}
            </div>
          )}
          
          <p className="text-sm text-center text-muted-foreground">
            You can navigate to other tabs while processing continues
          </p>
        </Card>
      </div>
    </div>
  );
}
