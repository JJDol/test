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
  const lastValidation = useRef<number>(Date.now());
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  if (
    !supabaseRef.current &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    supabaseRef.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  const isAuthPage = useCallback((path: string | null) => {
    if (!path) return false;
    return path === '/sign-in' || path === '/sign-up' || path === '/forgot-password'
      || path.startsWith('/invite') || path.startsWith('/reset-password');
  }, []);

  const isPublicMarketing = useCallback((path: string | null) => {
    return path === '/';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthPage(pathname) || isPublicMarketing(pathname)) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;

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

    const validateSession = async (force = false) => {
      if (isValidating.current || isSigningOut.current) return;

      // Skip if validated recently (within 5 min) unless forced
      const MIN_VALIDATION_INTERVAL = 5 * 60 * 1000;
      if (!force && Date.now() - lastValidation.current < MIN_VALIDATION_INTERVAL) return;

      isValidating.current = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
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
          }
        }
      } catch (error) {
        console.error('Error validating session:', error);
      } finally {
        lastValidation.current = Date.now();
        isValidating.current = false;
      }
    };

    const sessionCheckInterval = setInterval(() => validateSession(true), 2 * 60 * 1000);

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
  }, [router, pathname, isAuthPage, isPublicMarketing]);

  return null;
} 