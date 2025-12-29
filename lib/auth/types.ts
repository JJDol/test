/**
 * Unified Authentication Types
 * 
 * PURPOSE: Centralized type definitions for all authentication-related functionality
 * - Eliminates duplication across auth modules
 * - Provides consistent interfaces for server/client components
 * - Supports both database-first and JWT-optimized approaches
 * 
 * USAGE: Import these types in all auth-related files
 * ARCHITECTURE: Single source of truth for auth types
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// CORE USER TYPES
// ============================================================================

/**
 * Base authenticated user interface
 * Used across all auth modules for consistency
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  company_id?: string;
  name?: string;
}

/**
 * Extended user profile with additional metadata
 * Used for detailed user information and profile management
 */
export interface UserProfile extends AuthenticatedUser {
  assigned_projects?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Server-side authentication validation result
 * Used by server components and API routes
 */
export interface AuthValidationResult {
  user: AuthenticatedUser;
  profile: {
    role: string;
    company_id: string | null;
  };
  isAdmin: boolean;
  hasCompany: boolean;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Authenticated request interface for API routes
 * Extends NextRequest with user information
 */
export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

/**
 * Route context for dynamic API routes
 */
export interface RouteContext<T = any> {
  params: Promise<T>;
}

// ============================================================================
// HANDLER TYPES
// ============================================================================

/**
 * Simple API route handler (no dynamic params)
 */
export type SimpleHandler = (request: AuthenticatedRequest) => Promise<NextResponse>;

/**
 * Dynamic API route handler (with params)
 */
export type DynamicHandler<T = any> = (
  request: AuthenticatedRequest, 
  context: RouteContext<T>
) => Promise<NextResponse>;

// ============================================================================
// JWT METADATA TYPES
// ============================================================================

/**
 * JWT metadata structure for user information
 * Stored in Supabase JWT tokens for performance optimization
 */
export interface JWTMetadata {
  role: string;
  company_id: string;
  last_updated: string;
}

/**
 * User metadata update payload
 * Used when updating JWT metadata
 */
export interface UserMetadataUpdate {
  role?: string;
  company_id?: string;
  name?: string;
}

// ============================================================================
// AUTHENTICATION RESULT TYPES
// ============================================================================

/**
 * Authentication result for API routes
 * Either contains user data or error response
 */
export type AuthResult = 
  | { user: AuthenticatedUser }
  | { error: NextResponse };

/**
 * JWT refresh result
 * Used for token refresh operations
 */
export interface JWTRefreshResult {
  success: boolean;
  error?: any;
}

/**
 * Batch operation result
 * Used for bulk operations like token refresh
 */
export interface BatchOperationResult {
  success: string[];
  failed: string[];
}

// ============================================================================
// ROLE-BASED ACCESS TYPES
// ============================================================================

/**
 * Available user roles in the system
 */
export type UserRole = 'ADMIN' | 'COMPANY_ADMIN' | 'PROJECT_MANAGER' | 'USER';

/**
 * Role-based access control configuration
 */
export interface RoleConfig {
  requiredRole: UserRole;
  allowHigherRoles?: boolean;
}

/**
 * Company admin roles (includes both ADMIN and COMPANY_ADMIN)
 */
export const COMPANY_ADMIN_ROLES: UserRole[] = ['ADMIN', 'COMPANY_ADMIN'];

/**
 * Check if a role has company admin privileges
 */
export function isCompanyAdmin(role?: string): boolean {
  return role ? COMPANY_ADMIN_ROLES.includes(role as UserRole) : false;
}

/**
 * Check if a role is admin
 */
export function isAdmin(role?: string): boolean {
  return role === 'ADMIN';
}

// ============================================================================
// AUTHENTICATION CONFIGURATION
// ============================================================================

/**
 * Authentication configuration options
 */
export interface AuthConfig {
  redirectOnFailure?: boolean;
  requireCompany?: boolean;
  validateSession?: boolean;
  useJWTMetadata?: boolean;
}

/**
 * Default authentication configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  redirectOnFailure: true,
  requireCompany: true,
  validateSession: true,
  useJWTMetadata: false, // Database-first approach for MVP
};
