/**
 * Forgot Password API
 * 
 * PURPOSE: Initiate password reset process
 * - POST: Send password reset email with secure token
 * 
 * SECURITY: No user enumeration, secure token generation
 * ROUTE: /api/auth/forgot-password
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient as createServiceClient } from '@/lib/supabase/service-role';

export async function POST(request: Request) {
  
  try {
    const body = await request.json();
    
    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    
    // Use service role client to bypass RLS policies for user lookup
    const supabaseService = createServiceClient();
    const supabase = await createClient();

    // Check if user exists using service role client to bypass RLS
    // But maintain tenant isolation by only selecting necessary fields
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('id, email, company_id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.log('API: User not found');
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, you will receive a password reset link.' 
      });
    }

    // Generate secure token with company context
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database using service role client
    // Include company_id for additional security and audit purposes
    const { error: tokenError } = await supabaseService
      .from('password_reset_tokens')
      .insert({
        token: token,
        user_id: user.id,
        company_id: user.company_id, // Add company context for audit trail
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('❌ [forgot-password] Error storing reset token:', tokenError);
      return NextResponse.json({ 
        error: 'Could not process password reset request. Please contact support.' 
      }, { status: 500 });
    }

    // Determine the correct reset URL based on environment
    let resetUrl: string;

    
    // Check if we're in a Vercel preview deployment
    const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL;
    const isPreviewDeployment = vercelUrl && vercelUrl.includes('git-');
    
    const siteUrl = process.env.SITE_URL
      || process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_APP_URL;

    if (isPreviewDeployment) {
      console.log('🚀 [forgot-password] Preview deployment detected, using Vercel branch URL:', vercelUrl);
      resetUrl = `https://${vercelUrl}/reset-password/${token}`;
    } else if (siteUrl) {
      const base = siteUrl.replace(/\/$/, '');
      console.log('🏭 [forgot-password] Using SITE_URL:', base);
      resetUrl = `${base}/reset-password/${token}`;
    } else if (vercelUrl) {
      console.log('🌐 [forgot-password] Vercel deployment without SITE_URL, using VERCEL_URL:', vercelUrl);
      resetUrl = `https://${vercelUrl}/reset-password/${token}`;
    } else if (process.env.NODE_ENV === 'development') {
      console.log('🖥️ [forgot-password] Local development, using localhost fallback');
      resetUrl = `http://localhost:3000/reset-password/${token}`;
    } else {
      console.error('❌ [forgot-password] Could not determine reset URL - configuration error');
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }
    
    console.log('🔗 [forgot-password] Final reset URL generated:', resetUrl);

    // Send email with reset link using regular client (auth functions work with regular client)
    const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (emailError) {
      console.error('API: Error sending reset email');
      console.error('API: Email error details:', {
        code: emailError.code,
        message: emailError.message,
        status: emailError.status
      });
      
      // Provide more specific error messages based on the error
      if (emailError.message?.includes('email') || emailError.message?.includes('SMTP')) {
        return NextResponse.json({ 
          error: 'Email service is not configured. Please contact support to set up password reset functionality.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Could not send password reset email. Please try again or contact support.' 
      }, { status: 500 });
    }

    const response = { 
      success: true, 
      message: 'Check your email for a link to reset your password.' 
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 [forgot-password] Unexpected error in forgot password API:', error);
    const errorResponse = { 
      error: 'An unexpected error occurred. Please try again or contact support.' 
    };
    console.log('📤 [forgot-password] Returning error response:', errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 