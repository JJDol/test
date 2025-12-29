/**
 * 🏢 LoadingStateInline - Enterprise Inline Loading Component
 * 
 * PURPOSE: Reusable inline loading state for content areas
 * - Professional loading spinner with message
 * - Consistent loading UX across the application
 * - Configurable loading message
 * - Centered layout with proper spacing
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Consistent loading UX across components
 * - Professional loading indicators
 * - Reusable and maintainable
 */

"use client";

interface LoadingStateInlineProps {
  message: string;
  className?: string;
}

export function LoadingStateInline({
  message,
  className = ""
}: LoadingStateInlineProps) {
  return (
    <div className={`flex items-center justify-center h-64 ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
