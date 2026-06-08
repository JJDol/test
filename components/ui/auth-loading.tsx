/**
 * Authentication Loading Component
 * 
 * PURPOSE: Show loading state while authentication is being verified
 * - Prevents flash of protected content
 * - Professional loading indicator (spinning wheel)
 * - Covers entire screen during auth check
 */

"use client";

import { useTranslations } from "next-intl";

interface AuthLoadingProps {
  message?: string;
}

export default function AuthLoading({ message }: AuthLoadingProps) {
  const t = useTranslations("auth");
  const displayMessage = message ?? t("verifyingAuth");
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Professional spinning wheel */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        <p className="text-sm text-muted-foreground">{displayMessage}</p>
      </div>
    </div>
  );
}
