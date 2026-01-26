import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Debug endpoint for Word add-in - returns current user info
 */
async function debugHandler(request: AuthenticatedRequest) {
  try {
    const serviceClient = createServiceRoleClient();
    
    // Get full user data from database
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('id, email, role, company_id, assigned_projects, name')
      .eq('id', request.user.id)
      .single();
    
    // Get project count for this user's company
    let projectCount = 0;
    if (userData?.company_id) {
      const { count } = await serviceClient
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', userData.company_id);
      projectCount = count || 0;
    }
    
    // Get total project count (for ADMIN)
    const { count: totalProjects } = await serviceClient
      .from('projects')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      authUser: {
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
        company_id: request.user.company_id,
      },
      databaseUser: userData,
      userError: userError?.message,
      projectsInCompany: projectCount,
      totalProjectsInSystem: totalProjects,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://aticon-autodoc-new.vercel.app',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export const GET = withAuth(debugHandler);
