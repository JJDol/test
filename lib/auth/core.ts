/**
 * Core Authentication Functions
 * 
 * PURPOSE: Centralized authentication logic for server components and API routes
 * - Eliminates duplication between server-auth.ts and auth-middleware.ts
 * - Provides consistent authentication validation across the application
 * - Supports both database-first and JWT-optimized approaches
 * 
 * USAGE: Import these functions for authentication operations
 * ARCHITECTURE: Single source of truth for core auth logic
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { 
  AuthenticatedUser, 
  AuthValidationResult, 
  AuthResult, 
  AuthConfig,
  DEFAULT_AUTH_CONFIG,
  isCompanyAdmin,
  isAdmin
} from './types';
import { extractUserFromJWT, isJWTMetadataComplete, updateCurrentUserMetadata } from './jwt-utils';

// ============================================================================
// CORE AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Comprehensive server-side authentication validation
 * Same logic as useAuth hook but for server components
 * 
 * @param config Authentication configuration options
 * @returns AuthValidationResult or redirects to sign-in
 */
export async function validateServerAuth(
  config: AuthConfig = DEFAULT_AUTH_CONFIG
): Promise<AuthValidationResult | null> {
  try {
    const supabase = await createClient();
    
    // Step 1: Check if user exists
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      if (config.redirectOnFailure) {
        redirect("/sign-in?reason=auth_required");
      }
      return null;
    }

    // Step 2: Validate session is not expired (if enabled)
    if (config.validateSession) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at < now) {
          console.log("Session expired in server auth validation");
          if (config.redirectOnFailure) {
            redirect("/sign-in?reason=session_expired");
          }
          return null;
        }
      }
    }

    // Step 3: Get user profile data
    let role: string;
    let company_id: string | undefined;

    if (config.useJWTMetadata && isJWTMetadataComplete(user)) {
      // Use JWT metadata for zero database calls
      role = user.user_metadata.role;
      company_id = user.user_metadata.company_id;
    } else {
      // Fallback to database query
      // TODO: Use API route for this
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("company_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.log("Profile validation failed in server auth");
        if (config.redirectOnFailure) {
          redirect("/sign-in?reason=reauth");
        }
        return null;
      }

      role = profile.role;
      company_id = profile.company_id;
      if (!company_id) {
        console.log("User has no company association in server auth");
        if (config.redirectOnFailure) {
          redirect("/sign-in?reason=reauth");
        }
        return null;
      }
      // Update JWT metadata for future requests (if enabled)
      if (config.useJWTMetadata) {
        await updateCurrentUserMetadata(role, company_id);
      }
    }

    const isAdminRole = isAdmin(role);
    const hasCompany = !!company_id;
    
    // Validate company requirement (if enabled)
    if (config.requireCompany && !hasCompany && !isAdminRole) {
      console.log("User has no company association and is not admin");
      if (config.redirectOnFailure) {
        redirect("/sign-in?reason=reauth");
      }
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        role,
        company_id
      },
      profile: {
        role,
        company_id: company_id || null
      },
      isAdmin: isAdminRole,
      hasCompany
    };

  } catch (error) {
    console.error("Unexpected error in server auth validation:", error);
    if (config.redirectOnFailure) {
      redirect("/sign-in?reason=error");
    }
    return null;
  }
}

/**
 * Simple server-side user check (no redirects)
 * Use this when you just need to know if user is authenticated
 * 
 * @param config Authentication configuration options
 * @returns User object or null
 */
export async function getServerUser(config: AuthConfig = DEFAULT_AUTH_CONFIG) {
  try {
    const supabase = await createClient();
    
    // First check if we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting server session:", sessionError);
      return null;
    }
    
    // If no session, definitely no user
    if (!session) {
      console.log("Server auth check - no session found");
      return null;
    }
    
    // Check if session is expired (if validation is enabled)
    if (config.validateSession && session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        console.log("Server auth check - session expired");
        return null;
      }
    }
    
    // Validate that the session has a valid user
    if (!session.user) {
      console.log("Server auth check - session has no user");
      return null;
    }
    
    // Additional validation: check if user has required metadata
    const user = session.user;
    if (!user.id || !user.email) {
      console.log("Server auth check - user missing required fields");
      return null;
    }
    
    console.log("Server auth check - user found:", !!user, user?.email);
    return user;
  } catch (error) {
    console.error("Error getting server user:", error);
    return null;
  }
}

/**
 * Authenticate request for API routes
 * Used by middleware functions for API route authentication
 * 
 * @param request NextRequest object
 * @param config Authentication configuration options
 * @returns AuthResult with user data or error response
 */
export async function authenticateRequest(
  request: NextRequest, 
  config: AuthConfig = DEFAULT_AUTH_CONFIG
): Promise<AuthResult> {
  try {
    console.log('[AUTH] Starting authentication for:', request.nextUrl.pathname);
    const supabase = await createClient();
    console.log('[AUTH] Supabase client created, getting user...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('[AUTH] Authentication failed:', { error: error?.message, hasUser: !!user });
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }
    
    console.log('[AUTH] User authenticated:', { userId: user.id, email: user.email });

    let authenticatedUser: AuthenticatedUser;

    if (config.useJWTMetadata && isJWTMetadataComplete(user)) {
      // Use JWT metadata for zero database calls
      const jwtUser = extractUserFromJWT(user);
      if (!jwtUser) {
        return {
          error: NextResponse.json(
            { error: 'Invalid user metadata' },
            { status: 403 }
          )
        };
      }
      authenticatedUser = jwtUser;
    } else {
      // Fallback: fetch from database
      // TODO: Use API route for this
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      if (dbError || !userData) {
        console.error('Failed to fetch user data:', dbError);
        return {
          error: NextResponse.json(
            { error: 'User data not found' },
            { status: 403 }
          )
        };
      }

      // Update JWT metadata for future requests (if enabled)
      if (config.useJWTMetadata) {
        await updateCurrentUserMetadata(userData.role, userData.company_id);
      }

      authenticatedUser = {
        id: user.id,
        email: user.email!,
        role: userData.role,
        company_id: userData.company_id
      };
    }

    // Validate company requirement (if enabled)
    if (config.requireCompany && !authenticatedUser.company_id && !isAdmin(authenticatedUser.role)) {
      console.error('User has no company association:', user.id);
      return {
        error: NextResponse.json(
          { error: 'User must be associated with a company' },
          { status: 403 }
        )
      };
    }

    // Return user data - ZERO database calls with JWT metadata! 🚀
    console.log(`⚡ Auth for user ${user.id} - role: ${authenticatedUser.role}, company: ${authenticatedUser.company_id}`);
    
    return {
      user: authenticatedUser
    };
  } catch (error) {
    console.error('[AUTH] Authentication middleware error:', error);
    console.error('[AUTH] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      error: NextResponse.json(
        { 
          error: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Unknown authentication error'
        },
        { status: 500 }
      )
    };
  }
}

// ============================================================================
// ROLE-BASED VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if user has required role
 * 
 * @param userRole User's role
 * @param requiredRole Required role
 * @param allowHigherRoles Whether to allow higher roles (default: true)
 * @returns boolean True if user has required access
 */
export function hasRequiredRole(
  userRole?: string, 
  requiredRole: string = 'USER', 
  allowHigherRoles: boolean = true
): boolean {
  if (!userRole) return false;
  
  if (userRole === requiredRole) return true;
  
  if (!allowHigherRoles) return false;
  
  // Role hierarchy: ADMIN > COMPANY_ADMIN > PROJECT_MANAGER > USER
  const roleHierarchy = ['USER', 'PROJECT_MANAGER', 'COMPANY_ADMIN', 'ADMIN'];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  
  return userLevel > requiredLevel;
}

/**
 * Check if user has company admin access
 * 
 * @param userRole User's role
 * @returns boolean True if user has company admin access
 */
export function hasCompanyAdminAccess(userRole?: string): boolean {
  return isCompanyAdmin(userRole);
}

/**
 * Check if user has admin access
 * 
 * @param userRole User's role
 * @returns boolean True if user has admin access
 */
export function hasAdminAccess(userRole?: string): boolean {
  return isAdmin(userRole);
}

// ============================================================================
// EXPORT CORE FUNCTIONS
// ============================================================================

export const authCore = {
  validateServerAuth,
  getServerUser,
  authenticateRequest,
  hasRequiredRole,
  hasCompanyAdminAccess,
  hasAdminAccess
};
