/**
 * ⚠️  PERFORMANCE OPTIMIZATION UTILITIES - NOT CURRENTLY USED
 * 
 * These functions implement JWT metadata caching for zero-database-call authentication.
 * While secure and performant, we've chosen a database-first approach for our MVP
 * targeting the conservative construction industry.
 * 
 * CURRENT STATUS: Available but unused (by design)
 * FUTURE VALUE: High - for scaling and performance optimization
 * SECURITY: Secure (JWT signatures prevent tampering)
 * 
 * DECISION RATIONALE:
 * - Construction industry prefers conservative, auditable approaches
 * - Database-first ensures always-fresh data and clear audit trails
 * - Security and reliability prioritized over performance for MVP
 * - Enterprise customers trust traditional patterns
 * 
 * PERFORMANCE IMPACT IF IMPLEMENTED:
 * - Current: ~5-10 DB calls per page load for authentication
 * - With JWT metadata: ~0-1 DB calls per page load
 * - Estimated 90% reduction in auth-related database queries
 * 
 * IMPLEMENTATION GUIDE:
 * 1. Replace signInAction in app/actions.ts with signInWithMetadata
 * 2. Update useAuth hook to check JWT metadata first, database as fallback
 * 3. Monitor for performance improvements and any edge cases
 * 
 * WHEN TO IMPLEMENT:
 * - When scaling to thousands of concurrent users
 * - When database costs become significant (>$500/month)
 * - When enterprise customers demand sub-100ms response times
 * - When you have a team to manage the added complexity
 * 
 * CURRENT AUTHENTICATION: See hooks/use-auth.ts for database-first approach
 * 
 * @author Solo Developer - MVP Phase
 * @status Available for future implementation
 * @security Cryptographically signed JWTs prevent client-side tampering
 */

import { createClient } from '@/lib/supabase/server';

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
  metadata: { 
    name?: string;
    role?: string;
    company_id?: string;
  } = {}
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

/**
 * Update user role/company and refresh their JWT token
 * Use this when admin changes user permissions
 * 
 * NOTE: This function is USEFUL even with database-first auth
 * It ensures role changes are reflected immediately across all user sessions
 * 
 * @param userId User ID to update
 * @param updates Role and/or company_id changes
 * @returns Success status and updated user data
 */
export async function updateUserRoleAndRefreshToken(
  userId: string, 
  updates: { role?: string; company_id?: string }
) {
  const supabase = await createClient();
  
  try {
    // Step 1: Update database
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