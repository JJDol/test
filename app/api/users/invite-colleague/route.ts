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

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.SITE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';

    // Get company name for the email
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', currentUser.company_id)
      .single();
    const companyName = company?.name || 'Your Company';

    // --- Pre-flight checks (before creating any DB records) ---

    // 1) Check if user already exists in public.users
    const { data: existingAppUser } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('email', email)
      .single();

    if (existingAppUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    // 2) Check if user already exists in auth.users
    const { data: authUserList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingAuthUser = authUserList?.users?.find(u => u.email === email);

    // 3) Check for active (non-expired) pending invitation
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('id, created_at')
      .eq('email', email)
      .eq('company_id', currentUser.company_id)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      const invitationAge = Date.now() - new Date(existingInvitation.created_at).getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (invitationAge < sevenDaysInMs) {
        return NextResponse.json({ 
          message: "An invitation has already been sent to this email address. Please wait for them to accept or try again later." 
        }, { status: 400 });
      }
    }

    // --- Handle case: auth account exists but not in public.users (previously deleted user) ---
    if (existingAuthUser) {
      console.log('ℹ️ User exists in auth but not in public.users — adding directly:', email);
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: existingAuthUser.id,
          email,
          name: name || existingAuthUser.user_metadata?.full_name || '',
          role,
          company_id: currentUser.company_id,
        });

      if (insertError) {
        console.error('Error adding existing auth user to public.users:', insertError);
        return NextResponse.json({ 
          message: "Failed to add user",
          error: insertError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        message: "User added successfully. They can log in with their existing account.",
        user: { email, name: name || '', role, company_id: currentUser.company_id },
        note: "This user already had an account and has been added to your company directly."
      });
    }

    // --- Normal invitation flow (new user, no auth account) ---

    // Generate invitation token
    const invitationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const invitationUrl = `${baseUrl}/invite?token=${invitationToken}`;

    // Create invitation record
    const { error: invitationError } = await supabaseAdmin
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

    // Send invitation email
    try {
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role,
          company_id: currentUser.company_id,
          invited_by: currentUser.id,
          invited_by_name: currentUser.name || 'Your administrator',
          company_name: companyName,
          invitation_token: invitationToken,
          inviter_name: currentUser.name || 'Your administrator',
          company: companyName,
          user_role: role,
          custom_invitation_url: invitationUrl
        },
        redirectTo: `${baseUrl}/invite?token=${invitationToken}`
      });

      if (inviteError) {
        console.error('❌ Error sending invitation email:', inviteError);
      } else {
        console.log('✅ Invitation email sent successfully to:', email, inviteData);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Invitation URL (DEV):', invitationUrl);
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
    }

    return NextResponse.json({
      message: "Invitation created successfully!",
      user: { email, name: name || '', role, company_id: currentUser.company_id },
      note: "The user will receive an email with a secure link to create their account.",
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
