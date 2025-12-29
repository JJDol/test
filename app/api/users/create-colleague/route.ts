import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

/**
 * Colleague User Creation API Route
 * 
 * PURPOSE: Create new user accounts within a company with proper authentication setup
 * - Creates both Supabase auth users and profile records
 * - Generates secure temporary passwords for new users
 * - Enforces company isolation and role-based permissions
 * - Supports USER and MANAGER role creation for company admins
 * 
 * TODO:
 * - Replace temporary password generation with email invitation system
 * - Add email verification workflow for new users
 * - Implement user onboarding flow and welcome emails
 * - Add user creation approval workflow for sensitive roles
 * - Consider integration with SSO providers for enterprise customers
 * - Add user creation rate limiting to prevent abuse
 * - Implement user template system for common role configurations
 * - Add audit trail for user creation operations
 * - Consider bulk user import functionality for large companies
 * 
 * ROUTE: /api/users/create-colleague
 */

async function createColleagueHandler(request: AuthenticatedRequest) {
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

    // Create admin client inside the function
    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey);
    const supabase = await createClient();

    // Check if the current user is a COMPANY_ADMIN (middleware already verified this) or ADMIN
    // TODO: Check if this works also for the admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, company_id')
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

    // Validate role (company admins can only create non-admin users)
    const allowedRoles = ['USER', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ 
        message: "Invalid role. Company admins can only create USER or MANAGER roles" 
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

    // Generate a temporary password
    // TODO: This has to be changed with sending email to user -> probably fixed in different branch
    const tempPassword = Math.random().toString(36).slice(-12) + '!1A';

    console.log('Creating auth user...');

    // Create the auth user using admin client
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name || '',
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ 
        message: "Failed to create user account", 
        error: authError.message 
      }, { status: 500 });
    }

    if (!authUser.user) {
      return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
    }

    console.log('Auth user created successfully, now creating user profile...');

    // Manually create user profile (trigger may not work due to Supabase bug)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        name: name || '',
        email: email,
        role: role,
        company_id: currentUser.company_id
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      
      // Clean up auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupError) {
        console.error('Error cleaning up auth user:', cleanupError);
      }
      
      return NextResponse.json({ 
        message: "Failed to create user profile", 
        error: profileError.message 
      }, { status: 500 });
    }

    console.log('User profile created successfully, providing login credentials...');

    // Provide direct login credentials
    const loginCredentials = {
      email: email,
      password: tempPassword,
      instructions: "Share these credentials with the new user. They should log in and change their password immediately."
    };
    
    return NextResponse.json({
      message: "User created successfully! Share these login credentials:",
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        name: name || '',
        role: role,
        company_id: currentUser.company_id
      },
      loginCredentials,
      note: "User should log in and change password immediately for security"
    });

  } catch (error: any) {
    console.error("Error in create colleague:", error);
    return NextResponse.json({ 
      message: "Failed to create colleague", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply company admin authentication wrapper
export const POST = withCompanyAdmin(createColleagueHandler);