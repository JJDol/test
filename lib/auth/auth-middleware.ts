import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  company_id?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

// Type for dynamic route context
export interface RouteContext<T = any> {
  params: Promise<T>;
}

// Handler type for regular routes (no params)
type SimpleHandler = (request: AuthenticatedRequest) => Promise<NextResponse>;

// Handler type for dynamic routes (with params)
type DynamicHandler<T = any> = (
  request: AuthenticatedRequest, 
  context: RouteContext<T>
) => Promise<NextResponse>;

// ============================================================================
// JWT METADATA UTILITIES
// ============================================================================

/**
 * Force refresh user JWT token with updated metadata
 * Call this when user role/company changes to ensure JWT is up-to-date
 */
export async function forceRefreshUserToken(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get fresh user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Failed to fetch user data for token refresh:', userError);
      return false;
    }

    // Update user metadata in JWT
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: userData.role,
        company_id: userData.company_id,
        last_updated: new Date().toISOString()
      }
    });

    if (updateError) {
      console.error('Failed to update user metadata:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error refreshing user token:', error);
    return false;
  }
}

/**
 * Update JWT metadata for current user (used during sign-in or profile updates)
 */
export async function updateCurrentUserMetadata(role: string, company_id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.updateUser({
      data: {
        role,
        company_id,
        last_updated: new Date().toISOString()
      }
    });

    if (error) {
      console.error('Failed to update current user metadata:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating current user metadata:', error);
    return false;
  }
}

/**
 * Batch refresh tokens for multiple users (useful for admin operations)
 */
export async function batchRefreshTokens(userIds: string[]): Promise<{ success: string[], failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };
  
  for (const userId of userIds) {
    const success = await forceRefreshUserToken(userId);
    if (success) {
      results.success.push(userId);
    } else {
      results.failed.push(userId);
    }
  }

  return results;
}

// Export utilities for use in other routes
export const jwtUtils = {
  forceRefreshUserToken,
  updateCurrentUserMetadata,
  batchRefreshTokens
};

// ============================================================================
// SIMPLE JWT-BASED AUTHENTICATION
// ============================================================================

async function authenticateRequest(request: NextRequest): Promise<{ user: AuthenticatedUser } | { error: NextResponse }> {
  try {
    // Check for Bearer token in Authorization header (for Word add-in and external clients)
    const authHeader = request.headers.get('authorization');
    let user = null;
    let error = null;
    let supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createSupabaseClient>;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Create a Supabase client and set the session from the token
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      );

      const result = await supabase.auth.getUser(token);
      user = result.data.user;
      error = result.error;
    } else {
      // Fall back to cookie-based authentication
      supabase = await createClient();
      const result = await supabase.auth.getUser();
      user = result.data.user;
      error = result.error;
    }

    if (error || !user) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    // Always validate role/company from the database to prevent stale JWT issues
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role');
    const serviceClient = createServiceRoleClient();

    const { data: userData, error: dbError } = await serviceClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      console.error('Failed to fetch user data:', dbError);
      return {
        error: NextResponse.json(
          {
            error: 'User profile not found. Please log in to the main Aticon app first to complete your account setup.',
            code: 'USER_PROFILE_NOT_FOUND'
          },
          { status: 403 }
        )
      };
    }

    // Ensure user has a company association (required for multi-tenant)
    if (!userData.company_id) {
      console.error('User has no company association:', user.id);
      return {
        error: NextResponse.json(
          { error: 'User must be associated with a company' },
          { status: 403 }
        )
      };
    }

    // Sync JWT metadata if it drifted from the database
    const jwtRole = user.user_metadata?.role;
    const jwtCompanyId = user.user_metadata?.company_id;
    if (jwtRole !== userData.role || jwtCompanyId !== userData.company_id) {
      try {
        await updateCurrentUserMetadata(userData.role, userData.company_id);
      } catch {
        // Expected for Bearer token auth where updateUser is not permitted.
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        role: userData.role,
        company_id: userData.company_id
      }
    };
  } catch (error) {
    console.error('[AUTH] Authentication middleware error:', error);
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
// MIDDLEWARE FUNCTIONS
// ============================================================================

// Higher-order function to wrap API routes with authentication (regular routes)
export function withAuth(handler: SimpleHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return authResult.error;
    }

    // Add user to request object
    const authenticatedRequest = Object.assign(request, {
      user: authResult.user
    }) as AuthenticatedRequest;

    return handler(authenticatedRequest);
  };
}

// Higher-order function to wrap dynamic API routes with authentication
export function withAuthDynamic<T = any>(handler: DynamicHandler<T>) {
  return async (
    request: NextRequest,
    context: RouteContext<T>
  ): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    // Add user to request object
    const authenticatedRequest = Object.assign(request, {
      user: authResult.user
    }) as AuthenticatedRequest;

    return handler(authenticatedRequest, context);
  };
}

// Role-based authentication wrapper for regular routes
export function withRole(requiredRole: string, handler: SimpleHandler) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (!request.user.role || request.user.role !== requiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return handler(request);
  });
}

// Role-based authentication wrapper for dynamic routes
export function withRoleDynamic<T = any>(requiredRole: string, handler: DynamicHandler<T>) {
  return withAuthDynamic<T>(async (request: AuthenticatedRequest, context: RouteContext<T>) => {
    if (!request.user.role || request.user.role !== requiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  });
}

// Admin-only wrapper for regular routes
export function withAdmin(handler: SimpleHandler) {
  return withRole('ADMIN', handler);
}

// Admin-only wrapper for dynamic routes
export function withAdminDynamic<T = any>(handler: DynamicHandler<T>) {
  return withRoleDynamic<T>('ADMIN', handler);
}

// Company-specific admin wrapper for regular routes
export function withCompanyAdmin(handler: SimpleHandler) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (!request.user.role || !['ADMIN', 'COMPANY_ADMIN'].includes(request.user.role)) {
      return NextResponse.json(
        { error: 'Company admin access required' },
        { status: 403 }
      );
    }
    
    return handler(request);
  });
}

// Company-specific admin wrapper for dynamic routes
export function withCompanyAdminDynamic<T = any>(handler: DynamicHandler<T>) {
  return withAuthDynamic<T>(async (request: AuthenticatedRequest, context: RouteContext<T>) => {
    if (!request.user.role || !['ADMIN', 'COMPANY_ADMIN'].includes(request.user.role)) {
      return NextResponse.json(
        { error: 'Company admin access required' },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  });
} 