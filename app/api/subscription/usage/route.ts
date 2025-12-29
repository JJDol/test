/**
 * Subscription Usage Tracking Route
 * 
 * PURPOSE: Monitor and report company subscription usage and limits
 * - Tracks current usage of users, projects, and storage
 * - Compares usage against subscription tier limits
 * - Provides usage percentages and limit status
 * - Supports admin access to any company's usage data
 * 
 * ROUTES:
 * - GET /api/subscription/usage - Get current subscription usage
 * - GET /api/subscription/usage?company_id=X - Admin: Get specific company usage
 * TODO:
 * - Implement storage usage calculation from actual storage data
 * - Add usage history tracking and trends
 * - Consider usage alerts when approaching limits
 * - Add usage analytics dashboard data
 * - Implement usage caching for performance
 * 
 * ROUTE: GET /api/subscription/usage
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getUsageHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Get current user and their company (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (unless they're ADMIN)
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // For ADMIN users, we can allow them to check specific company usage via query param
    const { searchParams } = new URL(request.url);
    const companyId = currentUserProfile.role === 'ADMIN' 
      ? searchParams.get('company_id') || currentUserProfile.company_id
      : currentUserProfile.company_id;

    if (!companyId) {
      return NextResponse.json({ error: "No company specified" }, { status: 400 });
    }

    // Get company subscription details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subscription_tier, max_users, max_projects, max_storage_gb')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get current usage counts
    const [usersResult, projectsResult] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .neq('role', 'ADMIN'), // Don't count ADMIN users toward limits
      supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
    ]);

    if (usersResult.error) throw usersResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const currentUsers = usersResult.count || 0;
    const currentProjects = projectsResult.count || 0;

    // Calculate usage percentages
    const userUsagePercent = Math.round((currentUsers / company.max_users) * 100);
    const projectUsagePercent = Math.round((currentProjects / company.max_projects) * 100);

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        subscription_tier: company.subscription_tier
      },
      limits: {
        max_users: company.max_users,
        max_projects: company.max_projects,
        max_storage_gb: company.max_storage_gb
      },
      usage: {
        current_users: currentUsers,
        current_projects: currentProjects,
        current_storage_gb: 0 // TODO: Implement storage calculation when needed
      },
      usage_percentages: {
        users: userUsagePercent,
        projects: projectUsagePercent,
        storage: 0
      },
      limits_reached: {
        users: currentUsers >= company.max_users,
        projects: currentProjects >= company.max_projects,
        storage: false
      }
    });

  } catch (error: any) {
    console.error("Error fetching subscription usage:", error);
    return NextResponse.json({ 
      message: "Failed to fetch subscription usage", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const GET = withAuth(getUsageHandler); 