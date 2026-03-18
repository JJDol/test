/**
 * Protected Page Wrapper
 * 
 * PURPOSE: Wrapper for protected pages that require authentication
 * - Shows loading state while auth is being verified
 * - Prevents flash of protected content
 * - Handles authentication errors gracefully
 * - Redirects via soft navigation (router.replace) to preserve React state elsewhere
 * - Can be used across all protected pages
 */

"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoading && !currentUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/sign-in?reason=no_auth');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser) {
    return <AuthLoading message={loadingMessage} />;
  }

  if (error) {
    return <AuthLoading message="Authentication error, redirecting..." />;
  }

  return <>{children}</>;
}
