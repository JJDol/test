/**
 * Invitation Resend Route
 *
 * PURPOSE: Resend an invitation email with a freshly issued token and 7-day expiry.
 * - Rotates the invitation token to invalidate any previous link
 * - Resets `status` to 'pending' and `expires_at` to now + 7 days
 * - Re-sends email via Supabase auth admin invite (same flow as initial invite)
 *
 * ROUTES:
 * - POST /api/users/invitations/[id]/resend
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  withCompanyAdminDynamic,
  AuthenticatedRequest,
  RouteContext,
} from '@/lib/auth/auth-middleware';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function resendInvitationHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'Invitation id is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    const supabase = await createClient();
    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve caller
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, name, company_id')
      .eq('id', request.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (!currentUser.company_id) {
      return NextResponse.json(
        { message: 'Company admin must be assigned to a company' },
        { status: 403 }
      );
    }

    // Load invitation and verify company ownership
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('id, email, name, role, company_id, status')
      .eq('id', id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.company_id !== currentUser.company_id) {
      return NextResponse.json(
        { message: 'You can only resend invitations from your own company' },
        { status: 403 }
      );
    }

    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { message: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Rotate token + reset expiry
    const newToken = randomUUID();
    const newExpiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const { error: updateError } = await supabaseAdmin
      .from('user_invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString(),
        status: 'pending',
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { message: 'Failed to refresh invitation', error: updateError.message },
        { status: 500 }
      );
    }

    // Build invitation URL using the same fallback chain as invite-colleague
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:3000';
    const invitationUrl = `${baseUrl}/invite?token=${newToken}`;

    // Lookup company name for email payload (best-effort)
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', currentUser.company_id)
      .single();
    const companyName = company?.name || 'Your Company';

    // Send email via Supabase auth admin
    // If user already exists in auth.users (from prior invite), delete and re-invite
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(u => u.email === invitation.email);

      // Only delete if user has NOT completed registration (no entry in public.users)
      if (existingAuthUser) {
        const { data: publicUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', existingAuthUser.id)
          .single();

        if (!publicUser) {
          await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
          console.log('Deleted stale auth user for re-invitation:', invitation.email);
        }
      }

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        invitation.email,
        {
          data: {
            role: invitation.role,
            company_id: currentUser.company_id,
            invited_by: currentUser.id,
            invited_by_name: currentUser.name || 'Your administrator',
            company_name: companyName,
            invitation_token: newToken,
            inviter_name: currentUser.name || 'Your administrator',
            company: companyName,
            user_role: invitation.role,
            custom_invitation_url: invitationUrl,
          },
          redirectTo: invitationUrl,
        }
      );

      if (inviteError) {
        console.error('Error re-sending invitation email:', inviteError);
        console.log('Invitation refreshed (email failed). Manual URL:', invitationUrl);
      }
    } catch (emailError) {
      console.error('Unexpected error sending invitation email:', emailError);
      console.log('Invitation refreshed (email failed). Manual URL:', invitationUrl);
    }

    return NextResponse.json({
      message: 'Invitation resent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: newExpiresAt.toISOString(),
      },
      devNote:
        process.env.NODE_ENV === 'development'
          ? `Development mode: invitation URL = ${invitationUrl}`
          : undefined,
    });
  } catch (error: any) {
    console.error('Error in resend invitation:', error);
    return NextResponse.json(
      { message: 'Failed to resend invitation', error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withCompanyAdminDynamic(resendInvitationHandler);
