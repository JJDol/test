/**
 * Session Status API
 * 
 * PURPOSE: Check authentication status and session expiry
 * - GET: Return session status, user info, expiry details
 * 
 * ACCESS: Public (no authentication required)
 * ROUTE: /api/auth/session-status
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: error.message,
          reason: 'session_error'
        },
        { status: 401 }
      );
    }
    
    if (!session) {
      return NextResponse.json(
        { 
          authenticated: false, 
          reason: 'no_session'
        },
        { status: 401 }
      );
    }
    
    // Check if session is about to expire
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata?.role,
        company_id: session.user.user_metadata?.company_id
      },
      session: {
        expires_at: expiresAt,
        timeUntilExpiry,
        willExpireSoon: timeUntilExpiry < 300 // 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Session status check error:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Internal server error',
        reason: 'server_error'
      },
      { status: 500 }
    );
  }
}
