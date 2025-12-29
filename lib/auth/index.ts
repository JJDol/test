/**
 * Consolidated Authentication Module
 * 
 * PURPOSE: Single entry point for all authentication functionality
 * - Eliminates duplication across auth files
 * - Provides consistent API for authentication operations
 * - Supports both database-first and JWT-optimized approaches
 * 
 * USAGE: Import from '@/lib/auth' instead of individual files
 * ARCHITECTURE: Consolidated auth module with clear separation of concerns
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================
export * from './types';

// ============================================================================
// CORE AUTHENTICATION FUNCTIONS
// ============================================================================
export { authCore } from './core';
export { 
  validateServerAuth, 
  getServerUser, 
  authenticateRequest,
  hasRequiredRole,
  hasCompanyAdminAccess,
  hasAdminAccess
} from './core';

// ============================================================================
// JWT UTILITIES
// ============================================================================
export { jwtUtils } from './jwt-utils';
export {
  forceRefreshUserToken,
  updateCurrentUserMetadata,
  updateUserRoleAndRefreshToken,
  batchRefreshTokens,
  extractUserFromJWT,
  isJWTMetadataComplete,
  signInWithMetadata,
  signUpWithMetadata
} from './jwt-utils';

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================
export { authMiddleware } from './middleware';
export {
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
} from './middleware';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Re-export commonly used types for convenience
export type {
  AuthenticatedUser,
  UserProfile,
  AuthValidationResult,
  AuthenticatedRequest,
  RouteContext,
  SimpleHandler,
  DynamicHandler,
  JWTMetadata,
  UserMetadataUpdate,
  AuthResult,
  JWTRefreshResult,
  BatchOperationResult,
  UserRole,
  RoleConfig,
  AuthConfig
} from './types';

// Re-export configuration constants
export { 
  COMPANY_ADMIN_ROLES,
  isCompanyAdmin,
  isAdmin,
  DEFAULT_AUTH_CONFIG
} from './types';
