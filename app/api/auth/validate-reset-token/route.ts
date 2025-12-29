/**
 * Validate Reset Token API
 * 
 * PURPOSE: Validate password reset token before allowing password change
 * - GET: Check if reset token is valid and not expired
 * 
 * SECURITY: Token validation, expiry checking
 * ROUTE: /api/auth/validate-reset-token
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient as createServiceClient } from '@/lib/supabase/service-role';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        message: 'Reset token is required' 
      }, { status: 400 });
    }

    console.log('Validating reset token...');
    
    // Use service role client to bypass RLS policies
    const supabaseService = createServiceClient();

    // Check if token exists and is not expired
    const { data: resetToken, error } = await supabaseService
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !resetToken) {
      console.log('Token validation failed');
      return NextResponse.json({ 
        valid: false, 
        message: 'Invalid or expired reset token' 
      }, { status: 400 });
    }

    console.log('Token validation successful');

    return NextResponse.json({ 
      valid: true, 
      message: 'Token is valid',
      userId: resetToken.user_id 
    });

  } catch (error) {
    console.error('Error validating reset token');
    return NextResponse.json({ 
      valid: false, 
      message: 'Failed to validate token' 
    }, { status: 500 });
  }
} 