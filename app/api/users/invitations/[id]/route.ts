/**
 * Invitation Operations Route
 *
 * PURPOSE: Revoke (delete) a pending or expired user invitation.
 * - Company isolation enforced (invitation.company_id must match caller's company_id)
 * - Uses service role client to bypass RLS (middleware already verifies caller role)
 *
 * ROUTES:
 * - DELETE /api/users/invitations/[id]
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import {
  withCompanyAdminDynamic,
  AuthenticatedRequest,
  RouteContext,
} from '@/lib/auth/auth-middleware';

async function revokeInvitationHandler(
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

    // Resolve caller's company_id for isolation check
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, company_id')
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

    // Verify the invitation belongs to the caller's company before deletion
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('id, company_id, email')
      .eq('id', id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.company_id !== currentUser.company_id) {
      return NextResponse.json(
        { message: 'You can only revoke invitations from your own company' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('user_invitations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json(
        { message: 'Failed to revoke invitation', error: deleteError.message },
        { status: 500 }
      );
    }

    // Clean up orphaned auth.users entry created by inviteUserByEmail.
    // Only delete if the invitee has NOT completed signup (no matching public.users row).
    // This prevents the "User already exists in auth.users" error when re-inviting
    // the same email after a revoke.
    try {
      const { data: existingPublicUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', invitation.email)
        .maybeSingle();

      if (!existingPublicUser) {
        const { data: authUsersList, error: listError } =
          await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

        if (listError) {
          console.error('Error listing auth users during revoke cleanup:', listError);
        } else {
          const orphanAuthUser = authUsersList?.users?.find(
            (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
          );

          if (orphanAuthUser) {
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
              orphanAuthUser.id
            );
            if (authDeleteError) {
              console.error('Error deleting orphan auth user during revoke:', authDeleteError);
            } else {
              console.log('Cleaned up orphan auth.users entry for revoked invitation:', {
                email: invitation.email,
                authUserId: orphanAuthUser.id,
              });
            }
          }
        }
      }
    } catch (cleanupError) {
      // Non-fatal: the invitation row was already revoked.
      console.error('Unexpected error during auth.users cleanup:', cleanupError);
    }

    return NextResponse.json({
      message: 'Invitation revoked successfully',
      invitation: { id: invitation.id, email: invitation.email },
    });
  } catch (error: any) {
    console.error('Error in revoke invitation:', error);
    return NextResponse.json(
      { message: 'Failed to revoke invitation', error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export const DELETE = withCompanyAdminDynamic(revokeInvitationHandler);
