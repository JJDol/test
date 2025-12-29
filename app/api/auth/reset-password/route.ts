/**
 * Reset Password API
 * 
 * PURPOSE: Complete password reset process with token validation
 * - POST: Update user password using valid reset token
 * 
 * SECURITY: Token validation, password strength checking
 * ROUTE: /api/auth/reset-password
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient as createServiceClient } from '@/lib/supabase/service-role';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { validatePassword, validatePasswordConfirmation } from '@/lib/validation/validators';

export async function POST(request: Request) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ 
        error: 'Token, password, and confirm password are required' 
      }, { status: 400 });
    }

    // Validate password strength and confirmation using our validation system
    const passwordValidation = validatePassword(password, 'Password');
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: `Password is too weak: ${passwordValidation.errors[0]?.message || 'Password does not meet requirements'}` 
      }, { status: 400 });
    }

    // Validate password confirmation
    const confirmationValidation = validatePasswordConfirmation(password, confirmPassword, 'Password', 'Confirm Password');
    if (!confirmationValidation.isValid) {
      return NextResponse.json({ 
        error: confirmationValidation.errors[0]?.message || 'Passwords do not match' 
      }, { status: 400 });
    }

    console.log('Processing password reset...');

    const supabaseService = createServiceClient();
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate token and get user using service role client
    const { data: resetToken, error: tokenError } = await supabaseService
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !resetToken) {
      console.log('Token validation failed');
      return NextResponse.json({ 
        error: 'Invalid or expired reset token' 
      }, { status: 400 });
    }

    console.log('Token validated successfully');

    // Update user password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resetToken.user_id,
      { password: password }
    );

    if (updateError) {
      console.error('Error updating password');
      return NextResponse.json({ 
        error: 'Failed to update password' 
      }, { status: 500 });
    }

    console.log('Password updated successfully');

    // Mark token as used using service role client
    const { error: markUsedError } = await supabaseService
      .from('password_reset_tokens')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('token', token);

    if (markUsedError) {
      console.error('Error marking token as used');
      // Don't fail the request if we can't mark the token as used
    } else {
      console.log('Token marked as used successfully');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ 
      error: 'Failed to reset password' 
    }, { status: 500 });
  }
} 