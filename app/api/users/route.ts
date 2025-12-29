import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

/**
 * Users Management API Route
 * 
 * PURPOSE: Retrieve and manage user profiles across the system with role-based access control
 * - Fetches user lists filtered by company and role permissions
 * - Enforces multi-tenant isolation through RLS policies
 * - Supports ADMIN, COMPANY_ADMIN, and regular user access patterns
 * 
 * TODO:
 * - Add PATCH method for bulk user updates (role changes, company transfers)
 * - Implement user deactivation/reactivation functionality
 * - Add user activity tracking and last login timestamps
 * - Consider pagination for large user lists (>100 users)
 * - Add user export functionality for compliance reporting
 * - Implement user search and filtering capabilities
 * - Add audit logging for user management operations
 * 
 * ROUTE: /api/users
 */

async function getUsersHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Build query based on user role - RLS policies will handle the filtering
    let query = supabase
      .from('users')
      .select('id, name, email, role, company_id, created_at, updated_at')
      .order('name');

    // RLS policies will automatically filter based on user role and company_id
    // No manual filtering needed since your RLS policies handle this:
    // - ADMIN sees all users
    // - COMPANY_ADMIN sees company users
    // - Others see only themselves
    // TODO: Check if this is correct
    const { data: users, error } = await query;

    if (error) throw error;

    return NextResponse.json(users);

  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      message: "Failed to fetch users", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

//TODO: Consider also patch users

// Apply authentication wrappers
export const GET = withAuth(getUsersHandler); 