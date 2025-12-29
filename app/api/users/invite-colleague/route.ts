import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { randomUUID } from 'crypto';

async function inviteColleagueHandler(request: AuthenticatedRequest) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!serviceRoleKey 
      });
      return NextResponse.json({ 
        message: "Server configuration error" 
      }, { status: 500 });
    }

    const supabase = await createClient();
    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey);

    // Check if the current user is a COMPANY_ADMIN (middleware already verified this)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, company_id, name')
      .eq('id', request.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!currentUser.company_id) {
      return NextResponse.json({ message: "Company admin must be assigned to a company" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, role, name } = body;

    if (!email || !role) {
      return NextResponse.json({ message: "Email and role are required" }, { status: 400 });
    }

    // Validate role (company admins can only invite non-admin users)
    const allowedRoles = ['USER', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ 
        message: "Invalid role. Company admins can only invite USER or MANAGER roles" 
      }, { status: 400 });
    }

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('id, created_at')
      .eq('email', email)
      .eq('company_id', currentUser.company_id)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      // Check if invitation is still valid (less than 7 days old)
      const invitationAge = Date.now() - new Date(existingInvitation.created_at).getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (invitationAge < sevenDaysInMs) {
        return NextResponse.json({ 
          message: "An invitation has already been sent to this email address. Please wait for them to accept or try again later." 
        }, { status: 400 });
      }
    }

    // Generate invitation token
    const invitationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create invitation record
    const { error: invitationError } = await supabase
      .from('user_invitations')
      .insert({
        email,
        name: name || '',
        role,
        company_id: currentUser.company_id,
        invited_by: currentUser.id,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json({ 
        message: "Failed to create invitation",
        error: invitationError.message 
      }, { status: 500 });
    }

    // Send invitation email using Supabase Email Templates
    // Use your existing environment variables
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.SITE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';
    
    const invitationUrl = `${baseUrl}/invite?token=${invitationToken}`;
    
    console.log('🔍 Debug URL generation:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SITE_URL: process.env.SITE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      baseUrl: baseUrl,
      invitationUrl: invitationUrl
    });
    
    try {
      // Get company name for the email
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', currentUser.company_id)
        .single();

      const companyName = company?.name || 'Your Company';

      // Create admin client first for all admin operations
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      console.log('🔍 Debug env vars:', {
        hasServiceRoleKey: !!serviceRoleKey,
        serviceRoleKeyLength: serviceRoleKey?.length || 0,
        serviceRoleKeyPrefix: serviceRoleKey?.substring(0, 20) + '...',
        supabaseUrl: supabaseUrl
      });

      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing');
      }

      // Create admin client with service role key for admin operations
      const supabaseAdmin = createSupabaseAdmin(
        supabaseUrl!,
        serviceRoleKey, // Service role key required for admin operations
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Check if user already exists (either in auth.users or public.users)
      console.log('🔍 Checking if user already exists:', email);
      
      // Check if user exists in auth.users
      const { data: existingAuthUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000 // Adjust as needed
      });

      const existingAuthUser = existingAuthUsers?.users?.find(user => user.email === email);
      
      // Check if user exists in public.users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, role, company_id')
        .eq('email', email)
        .single();

      if (existingAuthUser) {
        console.log('❌ User already exists in auth.users:', { email, id: existingAuthUser.id });
        return NextResponse.json({ 
          error: `User with email ${email} already has an account. They cannot be invited again.` 
        }, { status: 400 });
      }

      if (existingUser && !userCheckError) {
        console.log('❌ User already exists in public.users:', { email, id: existingUser.id, company_id: existingUser.company_id });
        return NextResponse.json({ 
          error: `User with email ${email} already exists in your system.` 
        }, { status: 400 });
      }

      console.log('✅ User does not exist, proceeding with invitation');

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role,
          company_id: currentUser.company_id,
          invited_by: currentUser.id,
          invited_by_name: currentUser.name || 'Your administrator',
          company_name: companyName,
          invitation_token: invitationToken,
          // Add data that email template can use
          inviter_name: currentUser.name || 'Your administrator',
          company: companyName,
          user_role: role,
          custom_invitation_url: invitationUrl
        },
        redirectTo: `${baseUrl}/invite?token=${invitationToken}`
      });

      if (inviteError) {
        console.error('❌ Error sending invitation email:', {
          error: inviteError,
          errorMessage: inviteError.message,
          errorCode: inviteError.code,
          errorStatus: inviteError.status,
          email: email,
          hasServiceRoleKey: !!serviceRoleKey,
          serviceRoleKeyLength: serviceRoleKey?.length || 0
        });
        
        // Still log the invitation details for manual fallback
        console.log('📧 Invitation created (email failed):', {
          email,
          invitationUrl,
          invitedByName: currentUser.name || 'Your administrator',
          companyName,
          role,
          expiresAt: expiresAt.toISOString()
        });
      } else {
        console.log('✅ Invitation email sent successfully to:', email);
        console.log('📧 Invite data:', inviteData);
      }

      // In development, always log the invitation URL for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Invitation URL (DEV):', invitationUrl);
      }
      
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Fallback: log invitation details for manual sending
      console.log('📧 Invitation created (email failed):', {
        email,
        invitationUrl,
        invitedByName: currentUser.name || 'Your administrator',
        role,
        expiresAt: expiresAt.toISOString()
      });
    }
    
    return NextResponse.json({
      message: "Invitation created successfully!",
      user: {
        email: email,
        name: name || '',
        role: role,
        company_id: currentUser.company_id
      },
      note: "The user will receive an email with a secure link to create their account.",
      devNote: process.env.NODE_ENV === 'development' ? 
        `Development mode: Check console for invitation URL: ${invitationUrl}` : undefined
    });

  } catch (error: any) {
    console.error("Error in invite colleague:", error);
    return NextResponse.json({ 
      message: "Failed to invite colleague", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply company admin authentication wrapper
export const POST = withCompanyAdmin(inviteColleagueHandler);
