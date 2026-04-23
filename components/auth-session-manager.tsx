"use client";

import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

export function AuthSessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const isSigningOut = useRef(false);
  const isValidating = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const isAuthPage = useCallback((path: string | null) => {
    return path === '/sign-in' || path === '/sign-up' || path === '/forgot-password';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthPage(pathname)) return;

    const supabase = supabaseRef.current;

    const performSignOut = async () => {
      if (isSigningOut.current) return;
      isSigningOut.current = true;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error('Error in performSignOut:', error);
      } finally {
        router.replace('/sign-in?reason=inactivity');
      }
    };

    const resetTimeout = () => {
      lastActivity.current = Date.now();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        performSignOut();
      }, 60 * 60 * 1000);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT' && !isSigningOut.current) {
        router.replace('/sign-in?reason=signout');
      }
      // TOKEN_REFRESHED is handled internally by Supabase.
      // Do NOT redirect here — a transiently null session during
      // auto-refresh was the main cause of spurious page reloads.
    });

    const validateSession = async () => {
      if (isValidating.current || isSigningOut.current) return;
      isValidating.current = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // getSession() reads from storage and can miss the session
          // during an auto-refresh race. Fall back to the authoritative
          // server check before deciding to redirect.
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError || !user) {
            router.replace('/sign-in?reason=session_expired');
          }
          return;
        }

        // Proactively refresh if expiring within 5 minutes
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;

          if (timeUntilExpiry < 300) {
            await supabase.auth.refreshSession();
            // Don't redirect on refresh failure — the session may still
            // be valid until it actually expires. Next interval will retry.
          }
        }
      } catch (error) {
        console.error('Error validating session:', error);
        // Network errors are transient — don't redirect, retry next interval
      } finally {
        isValidating.current = false;
      }
    };

    const sessionCheckInterval = setInterval(validateSession, 2 * 60 * 1000);

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimeout();
        // Gently validate when user returns to the tab
        validateSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimeout();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearInterval(sessionCheckInterval);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription?.unsubscribe();
    };
  }, [router, pathname, isAuthPage]);

  return null;
} 