/**
 * Authentication Middleware Functions
 * 
 * PURPOSE: Higher-order functions for API route authentication
 * - Consolidates middleware logic from auth-middleware.ts
 * - Provides consistent API route protection
 * - Supports both regular and dynamic routes
 * 
 * USAGE: Import these functions to wrap API route handlers
 * ARCHITECTURE: Single source of truth for API route authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  AuthenticatedRequest, 
  RouteContext, 
  SimpleHandler, 
  DynamicHandler,
  AuthConfig,
  DEFAULT_AUTH_CONFIG
} from './types';
import { authenticateRequest } from './core';
import { hasRequiredRole, hasCompanyAdminAccess, hasAdminAccess } from './core';

// ============================================================================
// BASIC AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Higher-order function to wrap API routes with authentication (regular routes)
 * 
 * @param handler API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with authentication
 */
export function withAuth(handler: SimpleHandler, config: AuthConfig = DEFAULT_AUTH_CONFIG) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request, config);
    
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

/**
 * Higher-order function to wrap dynamic API routes with authentication
 * 
 * @param handler Dynamic API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with authentication
 */
export function withAuthDynamic<T = any>(
  handler: DynamicHandler<T>, 
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return async (
    request: NextRequest, 
    context: RouteContext<T>
  ): Promise<NextResponse> => {
    console.log('[AUTH] withAuthDynamic called for:', request.nextUrl.pathname);
    
    const authResult = await authenticateRequest(request, config);
    
    if ('error' in authResult) {
      console.log('[AUTH] Authentication failed, returning error response');
      return authResult.error;
    }

    console.log('[AUTH] Authentication successful, calling handler with user:', authResult.user.id);

    // Add user to request object
    const authenticatedRequest = Object.assign(request, {
      user: authResult.user
    }) as AuthenticatedRequest;

    return handler(authenticatedRequest, context);
  };
}

// ============================================================================
// ROLE-BASED AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Role-based authentication wrapper for regular routes
 * 
 * @param requiredRole Required user role
 * @param handler API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with role-based authentication
 */
export function withRole(
  requiredRole: string, 
  handler: SimpleHandler, 
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (!hasRequiredRole(request.user.role, requiredRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return handler(request);
  }, config);
}

/**
 * Role-based authentication wrapper for dynamic routes
 * 
 * @param requiredRole Required user role
 * @param handler Dynamic API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with role-based authentication
 */
export function withRoleDynamic<T = any>(
  requiredRole: string, 
  handler: DynamicHandler<T>, 
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return withAuthDynamic<T>(async (request: AuthenticatedRequest, context: RouteContext<T>) => {
    if (!hasRequiredRole(request.user.role, requiredRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  }, config);
}

// ============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Admin-only wrapper for regular routes
 * 
 * @param handler API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with admin authentication
 */
export function withAdmin(handler: SimpleHandler, config: AuthConfig = DEFAULT_AUTH_CONFIG) {
  return withRole('ADMIN', handler, config);
}

/**
 * Admin-only wrapper for dynamic routes
 * 
 * @param handler Dynamic API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with admin authentication
 */
export function withAdminDynamic<T = any>(
  handler: DynamicHandler<T>, 
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return withRoleDynamic<T>('ADMIN', handler, config);
}

// ============================================================================
// COMPANY ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Company-specific admin wrapper for regular routes
 * Allows both ADMIN and COMPANY_ADMIN roles
 * 
 * @param handler API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with company admin authentication
 */
export function withCompanyAdmin(handler: SimpleHandler, config: AuthConfig = DEFAULT_AUTH_CONFIG) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (!hasCompanyAdminAccess(request.user.role)) {
      return NextResponse.json(
        { error: 'Company admin access required' },
        { status: 403 }
      );
    }
    
    return handler(request);
  }, config);
}

/**
 * Company-specific admin wrapper for dynamic routes
 * Allows both ADMIN and COMPANY_ADMIN roles
 * 
 * @param handler Dynamic API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with company admin authentication
 */
export function withCompanyAdminDynamic<T = any>(
  handler: DynamicHandler<T>, 
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return withAuthDynamic<T>(async (request: AuthenticatedRequest, context: RouteContext<T>) => {
    if (!hasCompanyAdminAccess(request.user.role)) {
      return NextResponse.json(
        { error: 'Company admin access required' },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  }, config);
}

// ============================================================================
// CUSTOM AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Custom authentication wrapper with custom validation function
 * 
 * @param validator Custom validation function
 * @param handler API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with custom authentication
 */
export function withCustomAuth(
  validator: (user: AuthenticatedRequest['user']) => boolean,
  handler: SimpleHandler,
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return withAuth(async (request: AuthenticatedRequest) => {
    if (!validator(request.user)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return handler(request);
  }, config);
}

/**
 * Custom authentication wrapper for dynamic routes with custom validation
 * 
 * @param validator Custom validation function
 * @param handler Dynamic API route handler function
 * @param config Authentication configuration options
 * @returns Wrapped handler with custom authentication
 */
export function withCustomAuthDynamic<T = any>(
  validator: (user: AuthenticatedRequest['user']) => boolean,
  handler: DynamicHandler<T>,
  config: AuthConfig = DEFAULT_AUTH_CONFIG
) {
  return withAuthDynamic<T>(async (request: AuthenticatedRequest, context: RouteContext<T>) => {
    if (!validator(request.user)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  }, config);
}

// ============================================================================
// EXPORT MIDDLEWARE FUNCTIONS
// ============================================================================

export const authMiddleware = {
  withAuth,
  withAuthDynamic,
  withRole,
  withRoleDynamic,
  withAdmin,
  withAdminDynamic,
  withCompanyAdmin,
  withCompanyAdminDynamic,
  withCustomAuth,
  withCustomAuthDynamic
};
