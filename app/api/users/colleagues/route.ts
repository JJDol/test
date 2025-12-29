import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getColleaguesHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Get current user profile (middleware already verified user is COMPANY_ADMIN)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', request.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!currentUser.company_id) {
      return NextResponse.json({ message: "Company admin must be assigned to a company" }, { status: 403 });
    }

    // Fetch colleagues from the same company (excluding current user and ADMIN users)
    const { data: colleagues, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('company_id', currentUser.company_id)
      .neq('id', currentUser.id) // Exclude current user
      .neq('role', 'ADMIN') // Exclude ADMIN users (developers only)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching colleagues:', error);
      return NextResponse.json({ 
        message: "Failed to fetch colleagues",
        error: error.message 
      }, { status: 500 });
    }

    // Double-check: filter out any ADMIN users that might have slipped through
    const filteredColleagues = (colleagues || []).filter(colleague => colleague.role !== 'ADMIN');
    
    console.log('Colleagues API - Final filtered data:', filteredColleagues);

    return NextResponse.json({
      colleagues: filteredColleagues
    });

  } catch (error: any) {
    console.error("Error in get colleagues:", error);
    return NextResponse.json({ 
      message: "Failed to fetch colleagues", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply company admin authentication wrapper
export const GET = withCompanyAdmin(getColleaguesHandler);
