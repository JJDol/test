"use client";
// TODO: Maybe refactor this to use the API route for this
import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

export function AuthSessionManager() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();
  const pathname = usePathname();
  const isSigningOut = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    // Only run this effect in the browser
    if (typeof window === 'undefined') return;

    // Don't run on auth pages (sign-in, sign-up, etc.)
    if (pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/forgot-password') {
      console.log('AuthSessionManager: Skipping on auth page:', pathname);
      return;
    }

    const performSignOut = async () => {
      if (isSigningOut.current) return;
      
      try {
        console.log('Checking user before sign out...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('User found, signing out...', user.email);
          isSigningOut.current = true;
          
          // Sign out from Supabase
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error('Sign out error:', error);
            return;
          }
          
          console.log('Sign out successful, redirecting...');
          
          // Force a page reload to clear any cached state
          window.location.href = '/sign-in?reason=inactivity';
        } else {
          console.log('No user found, redirecting directly...');
          window.location.href = '/sign-in?reason=inactivity';
        }
      } catch (error) {
        console.error('Error in performSignOut:', error);
        // Fallback redirect
        window.location.href = '/sign-in?reason=inactivity';
      }
    };

    // Reset the timeout when user is active
    const resetTimeout = () => {
      lastActivity.current = Date.now();
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout (1 hour of inactivity)
      timeoutRef.current = setTimeout(() => {
        console.log('Timeout triggered - user inactive for 1 hour');
        performSignOut();
      }, 60 * 60 * 1000); // 1 hour
    };

    // Monitor session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to sign-in...');
        window.location.href = '/sign-in?reason=signout';
      } else if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed - session expired, redirecting to sign-in...');
        window.location.href = '/sign-in?reason=session_expired';
      }
    });

    // Periodic session validation
    const validateSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session validation error:', error);
          window.location.href = '/sign-in?reason=session_error';
          return;
        }
        
        if (!session) {
          console.log('No active session found, redirecting to sign-in...');
          window.location.href = '/sign-in?reason=inactivity';
          return;
        }
        
        // Check if session is about to expire (within 5 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          
          if (timeUntilExpiry < 300) { // 5 minutes
            console.log('Session expiring soon, attempting refresh...');
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('Session refresh failed:', refreshError);
              window.location.href = '/sign-in?reason=session_expired';
            }
          }
        }
      } catch (error) {
        console.error('Error validating session:', error);
        window.location.href = '/sign-in?reason=session_error';
      }
    };

    // Check session every 2 minutes
    const sessionCheckInterval = setInterval(validateSession, 2 * 60 * 1000);

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Also reset timeout when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimeout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timeout
    console.log('AuthSessionManager initialized - 1 hour timeout set');
    resetTimeout();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup auth subscription
      subscription?.unsubscribe();
    };
  }, [supabase.auth, router, pathname]);

  // This component doesn't render anything
  return null;
} 