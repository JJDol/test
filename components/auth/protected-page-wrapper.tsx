/**
 * Protected Page Wrapper
 * 
 * PURPOSE: Wrapper for protected pages that require authentication
 * - Shows loading state while auth is being verified
 * - Prevents flash of protected content
 * - Handles authentication errors gracefully
 * - Can be used across all protected pages
 */

"use client";

import { useAuth } from '@/hooks/use-auth';
import AuthLoading from '@/components/ui/auth-loading';

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
}

export default function ProtectedPageWrapper({ 
  children, 
  loadingMessage = "Verifying authentication..." 
}: ProtectedPageWrapperProps) {
  const { currentUser, isLoading, error } = useAuth();

  // Show loading state while authentication is being checked
  // This prevents any flash of protected content
  if (isLoading || !currentUser) {
    return <AuthLoading message={loadingMessage} />;
  }

  // If there's an auth error, show loading (redirect will happen)
  if (error) {
    return <AuthLoading message="Authentication error, redirecting..." />;
  }

  // User is authenticated, show protected content
  return <>{children}</>;
}
