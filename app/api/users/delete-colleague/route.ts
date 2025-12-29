import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

/**
 * Colleague User Deletion API Route
 * 
 * PURPOSE: Remove user accounts from the system with proper cleanup and validation
 * - Deletes both Supabase auth users and profile records
 * - Enforces company isolation and prevents unauthorized deletions
 * - Implements safety checks to prevent self-deletion and admin removal
 * - Handles cascading deletions through database triggers
 * 
 * TODO:
 * - Implement soft delete option for compliance and audit requirements
 * - Add user deactivation as alternative to permanent deletion
 * - Create user transfer functionality between companies
 * - Add bulk user deletion for company closures
 * - Implement user deletion approval workflow for sensitive accounts
 * - Add data export before deletion for compliance purposes
 * - Consider user deletion recovery window (7-30 days)
 * - Add notification system for affected users and admins
 * - Implement user deletion analytics and reporting
 * - Add cleanup for user-generated content and files
 * 
 * ROUTE: /api/users/delete-colleague
 */

async function deleteColleagueHandler(request: AuthenticatedRequest) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!serviceRoleKey 
      });
      return NextResponse.json({ 
        message: "Server configuration error" 
      }, { status: 500 });
    }

    // Create admin client inside the function
    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey);
    const supabase = await createClient();

    // Check if the current user is a COMPANY_ADMIN (middleware already verified this)
    // TODO: Check if this works also for the admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, company_id')
      .eq('id', request.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!currentUser.company_id) {
      return NextResponse.json({ message: "Company admin must be assigned to a company" }, { status: 403 });
    }


    
    console.log('Current user:', currentUser);
    // Parse request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
    }

    // Check if the user to be deleted exists and is in the same company
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, name, role, company_id')
      .eq('id', userId)
      .single();


    if (targetError || !targetUser) {
      return NextResponse.json({ message: "User to delete not found" }, { status: 404 });
    }

    // Verify the target user is in the same company
    // TODO: Admin can delete from any company
    if (targetUser.company_id !== currentUser.company_id) {
      return NextResponse.json({ message: "You can only delete users from your own company" }, { status: 403 });
    }

    // Prevent deletion of other admins
    if (targetUser.role === 'ADMIN' || targetUser.role === 'COMPANY_ADMIN') {
      return NextResponse.json({ message: "Cannot delete admin users" }, { status: 403 });
    }

    console.log(`Deleting user: ${targetUser.email} (${targetUser.id})`);

    // First, delete from public.users (this should cascade to auth.users via trigger)
    const { error: dbDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbDeleteError) {
      console.error('Error deleting from public.users:', dbDeleteError);
      // Continue with auth deletion as fallback
    }

    // Delete from auth.users using admin client (manual fallback)
    // TODO: This should not be needed if the trigger is working correctly
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting from auth.users:', authDeleteError);
      return NextResponse.json({ 
        message: "Failed to delete user account", 
        error: authDeleteError.message 
      }, { status: 500 });
    }

    console.log(`Successfully deleted user: ${targetUser.email}`);

    return NextResponse.json({
      message: "User deleted successfully",
      deletedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name
      }
    });

  } catch (error: any) {
    console.error("Error in delete colleague:", error);
    return NextResponse.json({ 
      message: "Failed to delete colleague", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply company admin authentication wrapper
export const DELETE = withCompanyAdmin(deleteColleagueHandler); 