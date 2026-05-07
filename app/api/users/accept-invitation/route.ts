import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { validateInvitationForm } from '@/lib/validation/validators';

async function acceptInvitationHandler(request: NextRequest) {
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

    const body = await request.json();
    const { token, name, password, confirmPassword } = body;

    if (!token) {
      return NextResponse.json({ 
        message: "Token is required" 
      }, { status: 400 });
    }

    // Use shared validation logic
    const validationResult = validateInvitationForm({ name, password, confirmPassword });
    
    if (!validationResult.isValid) {
      return NextResponse.json({ 
        message: validationResult.errors[0].message 
      }, { status: 400 });
    }

    // Find and validate the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        message: "Invalid invitation token" 
      }, { status: 404 });
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json({ 
        message: "This invitation has expired. Please contact your administrator for a new invitation." 
      }, { status: 410 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        message: "A user with this email already exists" 
      }, { status: 409 });
    }

    console.log('Finding existing auth user from invitation...');

    // Find the existing auth user that was created by inviteUserByEmail
    const { data: existingAuthUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing auth users:', listError);
      return NextResponse.json({ 
        message: "Failed to find user account", 
        error: listError.message 
      }, { status: 500 });
    }

    const existingAuthUser = existingAuthUsers.users.find(user => user.email === invitation.email);
    
    let finalAuthUserId: string;

    if (existingAuthUser) {
      console.log('Updating existing auth user with password and metadata...');

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password: password,
          email_confirm: true,
          user_metadata: {
            name: name,
            role: invitation.role,
            company_id: invitation.company_id
          }
        }
      );

      if (authError) {
        console.error('Error updating auth user:', authError);
        return NextResponse.json({ 
          message: "Failed to complete account setup", 
          error: authError.message 
        }, { status: 500 });
      }

      if (!authUser.user) {
        return NextResponse.json({ message: "Failed to update user" }, { status: 500 });
      }

      finalAuthUserId = existingAuthUser.id;
      console.log('Auth user updated successfully, now creating user profile...');
    } else {
      console.log('No auth user found, creating new auth user for:', invitation.email);

      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name,
          role: invitation.role,
          company_id: invitation.company_id
        }
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        return NextResponse.json({ 
          message: "Failed to create account", 
          error: createError.message 
        }, { status: 500 });
      }

      if (!newAuthUser.user) {
        return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
      }

      finalAuthUserId = newAuthUser.user.id;
      console.log('Auth user created successfully, now creating user profile...');
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: finalAuthUserId,
        name: name,
        email: invitation.email,
        role: invitation.role,
        company_id: invitation.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      
      try {
        await supabaseAdmin.auth.admin.deleteUser(finalAuthUserId);
      } catch (cleanupError) {
        console.error('Error cleaning up auth user:', cleanupError);
      }
      
      return NextResponse.json({ 
        message: "Failed to create user profile",
        error: profileError.message 
      }, { status: 500 });
    }

    console.log('User profile created successfully, updating invitation status...');

    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation status:', updateError);
    }

    console.log('Invitation accepted successfully');

    return NextResponse.json({
      message: "Account created successfully!",
      user: {
        id: finalAuthUserId,
        email: invitation.email,
        name: name,
        role: invitation.role,
        company_id: invitation.company_id
      }
    });

  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ 
      message: "Failed to accept invitation", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

export const POST = acceptInvitationHandler;
