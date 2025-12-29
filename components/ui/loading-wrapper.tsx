/**
 * 🏢 LoadingWrapper - Loading State Management Component
 * 
 * PURPOSE: Wraps components with loading states and error handling
 * - Provides consistent loading UI across components
 * - Handles different loading scenarios
 * - Integrates with error boundaries
 * - Supports skeleton loading for better UX
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Consistent loading UX
 * - Better user experience
 * - Reusable across components
 */

"use client";

import { ReactNode } from "react";
import { LoadingState } from "./loading-state";
import { ErrorState } from "./error-state";
import { Skeleton } from "./skeleton";

interface LoadingWrapperProps {
  children: ReactNode;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  variant?: "page" | "inline" | "card" | "skeleton";
  loadingMessage?: string;
  errorTitle?: string;
  skeletonCount?: number;
  className?: string;
}

export function LoadingWrapper({
  children,
  loading,
  error,
  onRetry,
  variant = "page",
  loadingMessage = "Loading...",
  errorTitle = "Error",
  skeletonCount = 3,
  className = "",
}: LoadingWrapperProps) {
  // Show error state
  if (error) {
    if (variant === "inline") {
      return (
        <ErrorState
          title={errorTitle}
          message={error}
          onRetry={onRetry}
          className={className}
        />
      );
    }
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${className}`}>
        <div className="w-full max-w-md text-center">
          <ErrorState
            title={errorTitle}
            message={error}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    if (variant === "skeleton") {
      return (
        <div className={`space-y-4 ${className}`}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={className}>
        <LoadingState
          message={loadingMessage}
          variant={variant}
        />
      </div>
    );
  }

  // Show children when not loading and no error
  return <>{children}</>;
}
