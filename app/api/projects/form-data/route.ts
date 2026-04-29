import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
/**
 * Projects Form Data API Route
 * 
 * PURPOSE: Fetch all data needed for the project creation form
 * - Company users for assignment
 * - Project templates for selection
 * - Single request to avoid multiple API calls
 */

async function getProjectFormDataHandler(request: AuthenticatedRequest) {
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

    // Fetch users, templates, and phase catalog in parallel
    const [usersResponse, templatesResponse, phaseDefsResponse] = await Promise.all([
      // Get company users (exclude ADMIN users)
      supabase
        .from('users')
        .select('id, name, email, role, discipline')
        .eq('company_id', currentUser.company_id)
        .neq('role', 'ADMIN')
        .order('name'),
      
      // Get project templates
      supabase
        .from('project_templates')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('name'),

      supabase
        .from('phase_definitions')
        .select('id, name, short_label, display_order, description, is_enabled')
        .eq('company_id', currentUser.company_id)
        .eq('is_enabled', true)
        .order('display_order'),
    ]);

    // Handle users response
    if (usersResponse.error) {
      console.error('Error fetching company users:', usersResponse.error);
      return NextResponse.json({ 
        message: "Failed to fetch users",
        error: usersResponse.error.message 
      }, { status: 500 });
    }

    // Handle templates response
    if (templatesResponse.error) {
      console.error('Error fetching project templates:', templatesResponse.error);
      return NextResponse.json({ 
        message: "Failed to fetch templates",
        error: templatesResponse.error.message 
      }, { status: 500 });
    }

    if (phaseDefsResponse.error) {
      console.error('Error fetching phase_definitions:', phaseDefsResponse.error);
      return NextResponse.json({
        message: "Failed to fetch phase definitions",
        error: phaseDefsResponse.error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      users: usersResponse.data || [],
      templates: templatesResponse.data || [],
      phaseDefinitions: phaseDefsResponse.data || [],
    });

  } catch (error: any) {
    console.error("Error in get project form data:", error);
    return NextResponse.json({ 
      message: "Failed to fetch form data", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const GET = withAuth(getProjectFormDataHandler);
