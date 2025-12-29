/**
 * Company API (User)
 * 
 * PURPOSE: User's company information and settings
 * - GET: Get user's company details
 * - PATCH: Update company information (Company Admin only)
 * 
 * ACCESS: Authenticated users (GET), Company Admin (PATCH)
 * ROUTE: /api/company
 * 
 * NOTE: For admin company management, use /api/companies instead
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getCompanyHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Get user's company information - start with minimal columns
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select(`
        company_id,
        role,
        companies (
          id,
          name
        )
      `)
      .eq('id', request.user.id)
      .single();

    if (userError) throw userError;

    if (!userProfile?.company_id || !userProfile.companies) {
      return NextResponse.json({ message: "User not assigned to a company" }, { status: 404 });
    }

    return NextResponse.json({
      company: userProfile.companies,
      userRole: userProfile.role
    });

  } catch (error: any) {
    console.error("Error fetching company info:", error);
    return NextResponse.json({ 
      message: "Failed to fetch company information", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

async function updateCompanyHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Check if user is COMPANY_ADMIN (middleware already verified this)
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (userError) throw userError;

    if (!userProfile.company_id) {
      return NextResponse.json({ message: "User not assigned to a company" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ message: "Company name is required" }, { status: 400 });
    }

    // Update company information - only update name for now
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.company_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      message: "Company information updated successfully",
      company: updatedCompany
    });

  } catch (error: any) {
    console.error("Error updating company info:", error);
    return NextResponse.json({ 
      message: "Failed to update company information", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply authentication wrappers
export const GET = withAuth(getCompanyHandler);
export const PATCH = withCompanyAdmin(updateCompanyHandler); 