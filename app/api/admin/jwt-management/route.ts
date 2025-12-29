/**
 * JWT Management API
 * 
 * PURPOSE: Admin tool for JWT token management and monitoring
 * - GET: Retrieve JWT statistics and user distribution
 * - POST: Force refresh JWT tokens for users (when roles/companies change)
 * 
 * ACCESS: Admin only
 * ROUTE: /api/admin/jwt-management
 * 
 * TOOD: This is not actively used, but might be useful in the future.
 */
import { NextResponse } from 'next/server';
import { withAdmin, AuthenticatedRequest, jwtUtils } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';

// Get JWT metadata stats for monitoring
async function getJwtStatsHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // Get sample of users with metadata
    const { data: users, error } = await supabase
      .from('users')
      .select('id, role, company_id, updated_at')
      .limit(10);

    if (error) {
      console.error('Failed to fetch user sample:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve user data' },
        { status: 500 }
      );
    }

    // Count users by role
    const { data: roleStats, error: roleError } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);

    const roleCounts = roleStats?.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      jwt_metadata: {
        authentication_method: 'JWT metadata (zero database calls)',
        performance: {
          auth_time: '~0.1ms (JWT parsing only)',
          database_calls_per_auth: 0,
          cache_complexity: 'none'
        },
        user_distribution: roleCounts,
        sample_users: users,
        last_updated: new Date().toISOString()
      },
      operations: {
        force_refresh: 'POST /api/admin/jwt-management with { user_ids: [...] }',
        batch_refresh: 'POST /api/admin/jwt-management with { refresh_all: true }'
      }
    });
  } catch (error) {
    console.error('Failed to get JWT stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve JWT statistics' },
      { status: 500 }
    );
  }
}

// Force refresh JWT tokens for users (when roles/companies change)
async function refreshTokensHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { user_ids, refresh_all } = body;

    if (refresh_all) {
      // Refresh all users (use carefully!)
      const supabase = await createClient();
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id')
        .not('role', 'is', null);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch users for batch refresh' },
          { status: 500 }
        );
      }

      const userIds = allUsers.map(u => u.id);
      const results = await jwtUtils.batchRefreshTokens(userIds);

      return NextResponse.json({
        success: true,
        message: `Batch refresh completed`,
        results: {
          total: userIds.length,
          successful: results.success.length,
          failed: results.failed.length,
          failed_users: results.failed
        },
        timestamp: new Date().toISOString()
      });
    }

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'user_ids array is required when refresh_all is not true' },
        { status: 400 }
      );
    }

    // Refresh specific users
    const results = await jwtUtils.batchRefreshTokens(user_ids);

    return NextResponse.json({
      success: true,
      message: `Token refresh completed for ${user_ids.length} users`,
      results: {
        total: user_ids.length,
        successful: results.success.length,
        failed: results.failed.length,
        successful_users: results.success,
        failed_users: results.failed
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return NextResponse.json(
      { error: 'Failed to refresh JWT tokens' },
      { status: 500 }
    );
  }
}

// Apply admin-only authentication wrapper
export const GET = withAdmin(getJwtStatsHandler);
export const POST = withAdmin(refreshTokensHandler); 