import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  role: string;
  name?: string;
  assigned_projects?: string[];
  company_id?: string;
}

interface UseAuthReturn {
  currentUser: UserProfile | null;
  user: User | null; // Raw Supabase user for compatibility
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  isAuthenticated: boolean; // For compatibility with useAuthCheck
  isLoading: boolean;
  error: string | null;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<boolean>; // For compatibility with useAuthCheck
}

export function useAuth(): UseAuthReturn {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null); // Raw Supabase user
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCheckingAuth = useRef(false);

  // Check if we're on an auth page where we shouldn't run auth checks
  const isAuthPage = pathname?.startsWith('/sign-in') || 
                    pathname?.startsWith('/sign-up') || 
                    pathname?.startsWith('/forgot-password') || 
                    pathname?.startsWith('/reset-password') ||
                    pathname?.startsWith('/auth/');

  const checkAuth = useCallback(async (): Promise<boolean> => {
    // Don't run auth checks on auth pages
    if (isAuthPage) {
      console.log('Skipping auth check on auth page:', pathname);
      setIsLoading(false);
      return false;
    }

    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth.current) {
      console.log('Auth check already in progress, skipping...');
      return false;
    }
    
    isCheckingAuth.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('useAuth: Starting auth check...');
      
      const supabase = createClient();
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting user:", userError);
        
        // Handle specific auth session missing error
        if (userError.message?.includes('Auth session missing')) {
          console.log("Auth session missing - user not authenticated");
          setUser(null);
          setCurrentUser(null);
          setIsAdmin(false);
          setIsCompanyAdmin(false);
          setError(null);
          return false;
        }
        
        setUser(null);
        setCurrentUser(null);
        setIsAdmin(false);
        setIsCompanyAdmin(false);
        setError("Authentication error");
        return false;
      }
      
      if (!authUser) {
        console.log("No user found in useAuth");
        setUser(null);
        setCurrentUser(null);
        setIsAdmin(false);
        setIsCompanyAdmin(false);
        return false;
      }

      console.log("Auth check successful, user found:", authUser.email);
      setUser(authUser);
      return true;
      
    } catch (error) {
      console.error('Error checking authentication:', error);
      setError("Failed to check authentication");
      return false;
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  }, [isAuthPage, pathname]);

  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Check auth immediately on mount, but only if not on auth page
    if (!isAuthPage) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, [isAuthPage, checkAuth]);

  // Fetch profile when user changes (from auth state changes)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || isCheckingAuth.current || isAuthPage) {
        return;
      }

      try {
        setIsProfileLoading(true);
        const supabase = createClient();
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, role, name, assigned_projects, company_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          setError("Failed to fetch user profile");
          return;
        }

        console.log("Profile fetched for user:", profile);
        setCurrentUser(profile);
        setIsAdmin(profile?.role === 'ADMIN');
        setIsCompanyAdmin(profile?.role === 'COMPANY_ADMIN');
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError("Failed to fetch user profile");
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user, isAuthPage]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change in useAuth:', event);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in, updating state...');
          setUser(session?.user ?? null);
          // Don't call checkAuth here to avoid loops - just update the user state
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state...');
          setUser(null);
          setCurrentUser(null);
          setIsAdmin(false);
          setIsCompanyAdmin(false);
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
          // Don't re-set user here — the user object hasn't changed,
          // only the tokens. Re-setting would trigger unnecessary re-renders
          // and profile re-fetches.
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Combined loading state: true until both auth check AND profile fetch complete
  const combinedLoading = isLoading || isProfileLoading || (!!user && !currentUser);

  return {
    currentUser,
    user, // Raw Supabase user for compatibility
    isAdmin,
    isCompanyAdmin,
    isAuthenticated: !!user, // For compatibility with useAuthCheck
    isLoading: combinedLoading,
    error,
    refreshAuth,
    checkAuth // For compatibility with useAuthCheck
  };
}
