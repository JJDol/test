/**
 * 🏢 ErrorState - Enterprise Error Display Component
 * 
 * PURPOSE: Reusable error state display with retry functionality
 * - Consistent error messaging across the application
 * - Professional error styling with destructive theme
 * - Built-in retry functionality
 * - Accessible error communication
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Consistent error UX across components
 * - Professional error handling
 * - Reusable and maintainable
 */

"use client";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryText = "Retry",
  className = ""
}: ErrorStateProps) {
  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-destructive">{title}</h3>
          <p className="text-sm text-destructive/80 mt-1">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryText}
          </Button>
        )}
      </div>
    </div>
  );
}
