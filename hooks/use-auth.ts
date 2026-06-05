import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  role: string;
  name?: string;
  assigned_projects?: string[];
  company_id?: string;
  preferred_locale?: string;
}

interface UseAuthReturn {
  currentUser: UserProfile | null;
  user: User | null;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

// ── Module-level shared auth state ──
// All useAuth() instances share the same cached state so that remounts
// (e.g. after tab-switch) don't flash a loading screen.

interface AuthState {
  user: User | null;
  currentUser: UserProfile | null;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  error: string | null;
}

let _state: AuthState = {
  user: null,
  currentUser: null,
  isAdmin: false,
  isCompanyAdmin: false,
  isLoading: true,
  isProfileLoading: false,
  error: null,
};
let _initialized = false;
let _checking = false;
const _listeners = new Set<() => void>();

function _getSnapshot(): AuthState {
  return _state;
}

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function _emit(patch: Partial<AuthState>) {
  _state = { ..._state, ...patch };
  _listeners.forEach((l) => l());
}

async function _checkAuth(): Promise<boolean> {
  if (_checking) return false;
  _checking = true;

  try {
    if (!_initialized) _emit({ isLoading: true });
    _emit({ error: null });

    const supabase = createClient();
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      const isMissingSession = userError.message?.includes('Auth session missing');
      _emit({
        user: null, currentUser: null, isAdmin: false, isCompanyAdmin: false,
        error: isMissingSession ? null : 'Authentication error',
      });
      if (!isMissingSession) console.error('Error getting user:', userError);
      return false;
    }

    if (!authUser) {
      _emit({ user: null, currentUser: null, isAdmin: false, isCompanyAdmin: false });
      return false;
    }

    // Only fetch profile if user changed
    if (_state.user?.id !== authUser.id || !_state.currentUser) {
      _emit({ user: authUser, isProfileLoading: true });
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, role, name, assigned_projects, company_id, preferred_locale')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          _emit({ error: 'Failed to fetch user profile', isProfileLoading: false });
        } else {
          _emit({
            currentUser: profile,
            isAdmin: profile?.role === 'ADMIN',
            isCompanyAdmin: profile?.role === 'COMPANY_ADMIN',
            isProfileLoading: false,
          });

          if (profile?.preferred_locale && typeof document !== 'undefined') {
            const currentCookie = document.cookie
              .split('; ')
              .find((row) => row.startsWith('NEXT_LOCALE='))
              ?.split('=')[1];
            if (currentCookie !== profile.preferred_locale) {
              document.cookie = `NEXT_LOCALE=${profile.preferred_locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
              window.location.reload();
            }
          }
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
        _emit({ error: 'Failed to fetch user profile', isProfileLoading: false });
      }
    } else {
      _emit({ user: authUser });
    }
    return true;
  } catch (e) {
    console.error('Error checking authentication:', e);
    _emit({ error: 'Failed to check authentication' });
    return false;
  } finally {
    _emit({ isLoading: false });
    _checking = false;
    _initialized = true;
  }
}

// Set up global auth state listener once
let _subscriptionSetUp = false;
function _setupSubscription() {
  if (_subscriptionSetUp || typeof window === 'undefined') return;
  _subscriptionSetUp = true;

  const supabase = createClient();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      if (_state.user?.id !== session.user.id) {
        _emit({ user: session.user });
        _checkAuth();
      }
    } else if (event === 'SIGNED_OUT') {
      _emit({
        user: null, currentUser: null, isAdmin: false, isCompanyAdmin: false,
        isLoading: false, error: null,
      });
      _initialized = false;
    }
  });
}

export function useAuth(): UseAuthReturn {
  const pathname = usePathname();
  const state = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

  const isAuthPage = pathname?.startsWith('/sign-in') ||
    pathname?.startsWith('/sign-up') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/auth/');

  useEffect(() => {
    _setupSubscription();
    if (!isAuthPage && !_initialized) {
      _checkAuth();
    } else if (isAuthPage) {
      _emit({ isLoading: false });
    }
  }, [isAuthPage]);

  const refreshAuth = useCallback(async () => { await _checkAuth(); }, []);
  const checkAuth = useCallback(async () => _checkAuth(), []);

  const combinedLoading = state.isLoading || state.isProfileLoading || (!!state.user && !state.currentUser);

  return {
    currentUser: state.currentUser,
    user: state.user,
    isAdmin: state.isAdmin,
    isCompanyAdmin: state.isCompanyAdmin,
    isAuthenticated: !!state.user,
    isLoading: isAuthPage ? false : combinedLoading,
    error: state.error,
    refreshAuth,
    checkAuth,
  };
}
