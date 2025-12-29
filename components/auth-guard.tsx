/**
 * 🛡️ AuthGuard - Component-Level Authentication Protection
 * 
 * STATUS: Available but not currently used (by design)
 * 
 * PURPOSE: Wrapper component that protects individual components from being
 * rendered unless the user is authenticated. Provides component-level security
 * with professional loading states and fallback messaging.
 * 
 * CURRENT ARCHITECTURE: Our app uses page-level protection via:
 * - middleware.ts (route-level protection)
 * - app/protected/layout.tsx (server-side page protection)
 * This provides comprehensive security for entire pages.
 * 
 * FUTURE USE CASES:
 * - Mixed public/private content on the same page
 * - Premium feature gating within pages
 * - Component-level access control for specific roles
 * - Conditional rendering based on authentication status
 * 
 * EXAMPLE USAGE:
 * ```tsx
 * // Basic protection
 * <AuthGuard>
 *   <SensitiveComponent />
 * </AuthGuard>
 * 
 * // Custom fallback for unauthenticated users
 * <AuthGuard fallback={<UpgradePrompt />}>
 *   <PremiumFeatures />
 * </AuthGuard>
 * 
 * // Optional authentication (shows content regardless)
 * <AuthGuard requireAuth={false}>
 *   <PublicContent />
 * </AuthGuard>
 * ```
 * 
 * INTEGRATION: Uses the unified useAuth hook for consistent authentication state
 * SECURITY: Client-side only - should not be relied upon for security-critical features
 * UX: Includes professional loading states and clear messaging for users
 * 
 * @status Available for future implementation
 * @security Client-side component protection (not security-critical)
 * @ux Professional loading indicators and authentication messaging
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback,
  requireAuth = true 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // If we require auth and user is not authenticated after loading, show fallback
    if (!isLoading && requireAuth && !isAuthenticated) {
      setShowFallback(true);
    } else if (isLoading) {
      setShowFallback(false);
    } else {
      setShowFallback(false);
    }
  }, [isLoading, requireAuth, isAuthenticated]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Show fallback if authentication is required but user is not authenticated
  if (showFallback) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default fallback - redirect to sign-in
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Authentication required
          </p>
          <p className="text-xs text-muted-foreground">
            Redirecting to sign-in...
          </p>
        </div>
      </div>
    );
  }

  // Show children if authentication is not required or user is authenticated
  return <>{children}</>;
}
