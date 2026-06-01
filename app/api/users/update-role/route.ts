import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/users/update-role
 * Body: { userId: string, role: 'USER' | 'MANAGER' }
 *
 * Company Admins can change roles of non-admin members within their company.
 */
async function updateRoleHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ message: 'userId and role are required' }, { status: 400 });
    }

    const allowedRoles = ['USER', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({
        message: 'Invalid role. Only USER or MANAGER roles can be assigned.',
      }, { status: 400 });
    }

    const { data: currentUser, error: cuError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', request.user.id)
      .single();

    if (cuError || !currentUser?.company_id) {
      return NextResponse.json({ message: 'Your company could not be determined' }, { status: 403 });
    }

    const { data: target, error: targetError } = await supabase
      .from('users')
      .select('id, role, company_id')
      .eq('id', userId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (target.company_id !== currentUser.company_id) {
      return NextResponse.json({ message: 'User is not in your company' }, { status: 403 });
    }

    if (['ADMIN', 'COMPANY_ADMIN'].includes(target.role)) {
      return NextResponse.json({ message: 'Cannot change the role of an admin account' }, { status: 403 });
    }

    if (target.id === request.user.id) {
      return NextResponse.json({ message: 'You cannot change your own role' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createSupabaseAdmin(supabaseUrl, serviceRoleKey);
    const { error: updateError } = await adminClient
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json({ message: 'Failed to update role', error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Role updated successfully', userId, role });
  } catch (error: any) {
    console.error('Error in update-role handler:', error);
    return NextResponse.json({ message: 'Internal server error', error: error?.message }, { status: 500 });
  }
}

export const PATCH = withCompanyAdmin(updateRoleHandler);
