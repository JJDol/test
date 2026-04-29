import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getCompanyUsersHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Get current user profile
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', request.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUser.company_id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ message: "User not assigned to a company" }, { status: 403 });
    }

    // Build query - always exclude ADMIN users and apply company filter
    let query = supabase
      .from('users')
      .select('id, name, email, role, discipline')
      .eq('company_id', currentUser.company_id) // Always filter by company
      .neq('role', 'ADMIN') // Always exclude ADMIN users
      .order('name');

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching company users:', error);
      return NextResponse.json({ 
        message: "Failed to fetch users",
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      users: users || []
    });

  } catch (error: any) {
    console.error("Error in get company users:", error);
    return NextResponse.json({ 
      message: "Failed to fetch users", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const GET = withAuth(getCompanyUsersHandler);
