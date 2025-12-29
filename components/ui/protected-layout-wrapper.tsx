"use client";

import { ErrorBoundary } from "@/components/ui/error-boundary";

interface ProtectedLayoutWrapperProps {
  children: React.ReactNode;
}

export function ProtectedLayoutWrapper({ children }: ProtectedLayoutWrapperProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to monitoring service
        console.error('Protected area error:', error, errorInfo);
        // TODO: Send to monitoring service in production
      }}
      onRetry={() => {
        // Refresh the page on retry
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
