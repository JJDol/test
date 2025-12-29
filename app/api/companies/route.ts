/**
 * Companies API (Admin)
 * 
 * PURPOSE: Admin tool for company management
 * - GET: List all companies in the system
 * 
 * ACCESS: Admin only
 * ROUTE: /api/companies
 * 
 * NOTE: For user's own company, use /api/company instead
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getCompaniesHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // Auth middleware already verified user is ADMIN
    // RLS policies will handle the access control automatically
    
    // Fetch all companies for ADMIN
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .order('name');

    if (companiesError) throw companiesError;

    return NextResponse.json({ companies: companies || [] });

  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ 
      message: "Failed to fetch companies", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply admin-only authentication wrapper
export const GET = withAdmin(getCompaniesHandler); 