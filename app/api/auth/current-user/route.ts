/**
 * Current User API
 * 
 * PURPOSE: Get current user profile data
 * - GET: Retrieve authenticated user's profile
 * 
 * 
 * ACCESS: Authenticated users only
 * ROUTE: /api/auth/current-user
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getCurrentUserHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user profile (auth middleware already verified user exists)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    if (!userProfile) {
      return NextResponse.json({ 
        error: "User profile not found" 
      }, { status: 404 });
    }

    return NextResponse.json(userProfile);

  } catch (error: any) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ 
      message: "Failed to fetch current user", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

export const GET = withAuth(getCurrentUserHandler);
