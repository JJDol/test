/**
 * JWT Metadata Utilities
 * 
 * PURPOSE: Centralized JWT token management and metadata operations
 * - Eliminates duplication between auth-middleware.ts and auth-helpers.ts
 * - Provides consistent JWT metadata handling across the application
 * - Supports both current database-first and future JWT-optimized approaches
 * 
 * USAGE: Import these utilities for JWT token operations
 * ARCHITECTURE: Single source of truth for JWT operations
 */

import { createClient } from '@/lib/supabase/server';
import { 
  JWTMetadata, 
  UserMetadataUpdate, 
  JWTRefreshResult, 
  BatchOperationResult,
  AuthenticatedUser 
} from './types';

// ============================================================================
// JWT METADATA OPERATIONS
// ============================================================================

/**
 * Force refresh user JWT token with updated metadata
 * Call this when user role/company changes to ensure JWT is up-to-date
 * 
 * @param userId User ID to refresh
 * @returns Promise<boolean> Success status
 */
export async function forceRefreshUserToken(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get fresh user data from database
    // TODO: Use API route for this
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

    console.log(`🔄 JWT token refreshed for user ${userId} with role: ${userData.role}, company: ${userData.company_id}`);
    return true;
  } catch (error) {
    console.error('Error refreshing user token:', error);
    return false;
  }
}

/**
 * Update JWT metadata for current user (used during sign-in or profile updates)
 * 
 * @param role User role
 * @param company_id User company ID
 * @returns Promise<boolean> Success status
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

    console.log(`✅ Current user JWT metadata updated: role=${role}, company_id=${company_id}`);
    return true;
  } catch (error) {
    console.error('Error updating current user metadata:', error);
    return false;
  }
}

/**
 * Update user role/company and refresh their JWT token
 * Use this when admin changes user permissions
 * 
 * @param userId User ID to update
 * @param updates Role and/or company_id changes
 * @returns Promise<JWTRefreshResult> Success status and updated user data
 */
export async function updateUserRoleAndRefreshToken(
  userId: string, 
  updates: UserMetadataUpdate
): Promise<JWTRefreshResult & { user?: any; message?: string }> {
  const supabase = await createClient();
  
  try {
    // Step 1: Update database
    // TODO: Use API route for this
    const { data: updatedUser, error: dbError } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('role, company_id')
      .single();

    if (dbError || !updatedUser) {
      console.error('Failed to update user in database:', dbError);
      return { success: false, error: dbError };
    }

    // Step 2: Force refresh JWT token with new metadata
    const { error: jwtError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: updatedUser.role,
        company_id: updatedUser.company_id,
        last_updated: new Date().toISOString()
      }
    });

    if (jwtError) {
      console.error('Failed to update JWT metadata:', jwtError);
      return { success: false, error: jwtError };
    }

    console.log(`🔄 User ${userId} role/company updated and JWT refreshed: role=${updatedUser.role}, company=${updatedUser.company_id}`);
    
    return { 
      success: true, 
      user: updatedUser,
      message: 'User updated and JWT token refreshed. User should see changes immediately.' 
    };
  } catch (error) {
    console.error('Error updating user role and refreshing token:', error);
    return { success: false, error };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch refresh tokens for multiple users (useful for admin operations)
 * 
 * @param userIds Array of user IDs to refresh
 * @returns Promise<BatchOperationResult> Success and failed user IDs
 */
export async function batchRefreshTokens(userIds: string[]): Promise<BatchOperationResult> {
  const results = { success: [] as string[], failed: [] as string[] };
  
  for (const userId of userIds) {
    const success = await forceRefreshUserToken(userId);
    if (success) {
      results.success.push(userId);
    } else {
      results.failed.push(userId);
    }
  }
  
  console.log(`🔄 Batch token refresh completed: ${results.success.length} successful, ${results.failed.length} failed`);
  return results;
}

// ============================================================================
// JWT METADATA EXTRACTION
// ============================================================================

/**
 * Extract user data from JWT metadata
 * Used for zero-database-call authentication
 * 
 * @param user Supabase user object with metadata
 * @returns AuthenticatedUser or null if metadata is incomplete
 */
export function extractUserFromJWT(user: any): AuthenticatedUser | null {
  if (!user || !user.id || !user.email) {
    return null;
  }

  const role = user.user_metadata?.role;
  const company_id = user.user_metadata?.company_id;

  if (!role || !company_id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role,
    company_id,
    name: user.user_metadata?.name
  };
}

/**
 * Check if JWT metadata is complete and valid
 * 
 * @param user Supabase user object
 * @returns boolean True if metadata is complete
 */
export function isJWTMetadataComplete(user: any): boolean {
  if (!user?.user_metadata) {
    return false;
  }

  const { role, company_id } = user.user_metadata;
  return !!(role && company_id);
}

// ============================================================================
// ENHANCED AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Enhanced sign-in function that stores user metadata in JWT
 * This ensures zero database calls for future authentication checks
 * 
 * @param email User email
 * @param password User password
 * @returns Authentication result with JWT metadata embedded
 */
export async function signInWithMetadata(email: string, password: string) {
  const supabase = await createClient();
  
  try {
    // Step 1: Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return { data: null, error: authError };
    }

    // Step 2: Fetch user data from database
    // TODO: Use API route for this
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Failed to fetch user data during sign-in:', userError);
      return { data: authData, error: userError };
    }

    // Step 3: Update JWT with user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role: userData.role,
        company_id: userData.company_id,
        last_updated: new Date().toISOString()
      }
    });

    if (updateError) {
      console.error('Failed to update JWT metadata:', updateError);
      // Don't fail the sign-in, just log the issue
    }

    console.log(`✅ User ${authData.user.id} signed in with JWT metadata: role=${userData.role}, company=${userData.company_id}`);

    return { 
      data: {
        ...authData,
        user: {
          ...authData.user,
          user_metadata: {
            ...authData.user.user_metadata,
            role: userData.role,
            company_id: userData.company_id,
            last_updated: new Date().toISOString()
          }
        }
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error during enhanced sign-in:', error);
    return { data: null, error };
  }
}

/**
 * Enhanced sign-up function that creates user profile and sets JWT metadata
 * 
 * @param email User email
 * @param password User password  
 * @param metadata Additional user metadata (role, company_id, name)
 * @returns Sign-up result with JWT metadata embedded
 */
export async function signUpWithMetadata(
  email: string, 
  password: string, 
  metadata: UserMetadataUpdate = {}
) {
  const supabase = await createClient();
  
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata.name || '',
          email: email
        }
      }
    });

    if (authError || !authData.user) {
      return { data: null, error: authError };
    }

    // Step 2: Create user profile in database (if needed)
    if (metadata.role || metadata.company_id) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: metadata.name || '',
          role: metadata.role || 'USER',
          company_id: metadata.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        // Continue with sign-up, profile can be created later
      }

      // Step 3: Update JWT with metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: metadata.role || 'USER',
          company_id: metadata.company_id,
          last_updated: new Date().toISOString()
        }
      });

      if (updateError) {
        console.error('Failed to update JWT metadata during sign-up:', updateError);
      }

      console.log(`✅ User ${authData.user.id} signed up with JWT metadata: role=${metadata.role}, company=${metadata.company_id}`);
    }

    return { data: authData, error: null };
  } catch (error) {
    console.error('Error during enhanced sign-up:', error);
    return { data: null, error };
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export const jwtUtils = {
  forceRefreshUserToken,
  updateCurrentUserMetadata,
  updateUserRoleAndRefreshToken,
  batchRefreshTokens,
  extractUserFromJWT,
  isJWTMetadataComplete,
  signInWithMetadata,
  signUpWithMetadata
};
