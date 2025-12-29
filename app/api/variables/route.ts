import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth/auth-middleware";

// Shape stored in JSONB `variables` column
// {
//   general: Array<{ name: string; label?: string; type: string; description?: string }>;
//   [category: string]: Array<{ name: string; label?: string; type: string; description?: string }>;
// }

async function getCompanyVariablesHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', request.user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: "User not assigned to company" }, { status: 403 });
    }
    
    // maybeSingle avoids throwing when row doesn't exist
    const { data, error } = await supabase
      .from('company_variables')
      .select('variables')
      .eq('company_id', profile.company_id)
      .maybeSingle();
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500});
    } 

    const payload = data?.variables ?? { general: [] };
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500});
  }
}

async function upsertCompanyVariablesHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
  
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'User not assigned to company' }, { status: 403});
    }

    // Basic shape guard
    const variables = body && typeof body === 'object' ? body : { general: [] };

    const { error } = await supabase
      .from('company_variables')
      .upsert(
        {
          company_id: profile.company_id,
          variables, 
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 });
  }
}

// Export with auth wrapper (same style as document-templates/route.ts)
export const GET = withAuth(getCompanyVariablesHandler);
export const PUT = withAuth(upsertCompanyVariablesHandler);



