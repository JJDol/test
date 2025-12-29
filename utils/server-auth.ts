/**
 * Server-Side Authentication Utilities
 * 
 * PURPOSE: Shared authentication logic for server components
 * - Consistent auth validation across server components
 * - Avoids code duplication between pages and layouts
 * - Handles session expiry and profile validation
 * 
 * USAGE: Import and use in server components (pages, layouts)
 * NOT FOR: Client components (use useAuth hook instead)
 * 
 * ARCHITECTURE:
 * - Server components: Use these utilities
 * - Client components: Use hooks/use-auth.ts
 * - API routes: Use utils/auth-middleware.ts
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface AuthValidationResult {
  user: any;
  profile: {
    role: string;
    company_id: string | null;
  };
  isAdmin: boolean;
  hasCompany: boolean;
}

/**
 * Comprehensive server-side authentication validation
 * Same logic as useAuth hook but for server components
 * 
 * @param redirectOnFailure - Whether to redirect on auth failure (default: true)
 * @returns AuthValidationResult or redirects to sign-in
 */
export async function validateServerAuth(
  redirectOnFailure: boolean = true
): Promise<AuthValidationResult | null> {
  try {
    const supabase = await createClient();
    
    // Step 1: Check if user exists
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      if (redirectOnFailure) {
        redirect("/sign-in?reason=auth_required");
      }
      return null;
    }

    // Step 2: Validate session is not expired
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        console.log("Session expired in server auth validation");
        if (redirectOnFailure) {
          redirect("/sign-in?reason=session_expired");
        }
        return null;
      }
    }

    // Step 3: Validate user profile (same logic as useAuth hook)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "ADMIN";
    const hasCompany = !!profile?.company_id;
    
    if (profileError || (!isAdmin && !hasCompany)) {
      console.log("Profile validation failed in server auth");
      if (redirectOnFailure) {
        redirect("/sign-in?reason=reauth");
      }
      return null;
    }

    return {
      user,
      profile: {
        role: profile.role,
        company_id: profile.company_id
      },
      isAdmin,
      hasCompany
    };

  } catch (error) {
    console.error("Unexpected error in server auth validation:", error);
    if (redirectOnFailure) {
      redirect("/sign-in?reason=error");
    }
    return null;
  }
}

/**
 * Simple server-side user check (no redirects)
 * Use this when you just need to know if user is authenticated
 * 
 * @returns User object or null
 */
export async function getServerUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Error getting server user:", error);
    return null;
  }
}
