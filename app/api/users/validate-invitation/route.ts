import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function validateInvitationHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ 
        message: "Invitation token is required" 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the invitation by token
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

    // Return the invitation data (without sensitive fields)
    const safeInvitation = {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      company_id: invitation.company_id,
      invited_by: invitation.invited_by,
      expires_at: invitation.expires_at,
      status: invitation.status
    };

    return NextResponse.json({
      message: "Invitation is valid",
      invitation: safeInvitation
    });

  } catch (error: any) {
    console.error("Error validating invitation:", error);
    return NextResponse.json({ 
      message: "Failed to validate invitation", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

export const GET = validateInvitationHandler;
