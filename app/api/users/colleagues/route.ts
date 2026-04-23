import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getColleaguesHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Get current user profile (middleware already verified user is COMPANY_ADMIN)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', request.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!currentUser.company_id) {
      return NextResponse.json({ message: "Company admin must be assigned to a company" }, { status: 403 });
    }

    // Fetch colleagues from the same company (excluding current user and ADMIN users)
    const { data: colleagues, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('company_id', currentUser.company_id)
      .neq('id', currentUser.id) // Exclude current user
      .neq('role', 'ADMIN') // Exclude ADMIN users (developers only)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching colleagues:', error);
      return NextResponse.json({ 
        message: "Failed to fetch colleagues",
        error: error.message 
      }, { status: 500 });
    }

    // Double-check: filter out any ADMIN users that might have slipped through
    const filteredColleagues = (colleagues || []).filter(colleague => colleague.role !== 'ADMIN');

    // Fetch pending/expired invitations for the same company using service role
    // (RLS on user_invitations only allows COMPANY_ADMIN; ADMIN role requires bypass)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let invitations: Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      invited_by: string;
      expires_at: string;
      created_at: string;
      status: 'pending' | 'expired';
    }> = [];

    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: rawInvitations, error: invitationsError } = await supabaseAdmin
        .from('user_invitations')
        .select('id, email, name, role, invited_by, expires_at, created_at, status')
        .eq('company_id', currentUser.company_id)
        .in('status', ['pending', 'expired'])
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
      } else if (rawInvitations) {
        const now = Date.now();
        const acceptedEmails = new Set(
          filteredColleagues.map((c) => c.email?.toLowerCase()).filter(Boolean)
        );

        invitations = rawInvitations
          .filter((inv) => !acceptedEmails.has(inv.email?.toLowerCase()))
          .map((inv) => {
            const isExpired =
              inv.status === 'expired' || new Date(inv.expires_at).getTime() < now;
            return {
              id: inv.id,
              email: inv.email,
              name: inv.name,
              role: inv.role,
              invited_by: inv.invited_by,
              expires_at: inv.expires_at,
              created_at: inv.created_at,
              status: isExpired ? ('expired' as const) : ('pending' as const),
            };
          });
      }
    } else {
      console.warn('Skipping invitations fetch: missing Supabase service role env vars');
    }

    return NextResponse.json({
      colleagues: filteredColleagues,
      invitations,
    });

  } catch (error: any) {
    console.error("Error in get colleagues:", error);
    return NextResponse.json({ 
      message: "Failed to fetch colleagues", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply company admin authentication wrapper
export const GET = withCompanyAdmin(getColleaguesHandler);
