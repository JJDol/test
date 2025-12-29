import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { VariableProcessor } from '@/lib/services/processors/project-variable-processor';
import { createClient } from '@/lib/supabase/server';

/**
 * Project General Variables API Route
 * 
 * PURPOSE: Update general variables that propagate across all project templates
 * - Triggers general variable processing and propagation
 * - Updates variable propagation settings
 */

async function updateGeneralVariablesHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    
    // Get the user's company_id from their profile
    const supabase = await createClient();
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', request.user.id)
      .single();
    
    if (profileError || !userProfile?.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Update general variables using the processor
    // TODO: Investigate if this is correct
    const variableProcessor = new VariableProcessor();
    await variableProcessor.updateProjectGeneralVariables(
      projectId,
      userProfile.company_id,
      request.user.id
    );

    return NextResponse.json({ success: true, message: "General variables updated successfully" });
  } catch (error) {
    console.error('Error updating general variables:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update general variables' },
      { status: 500 }
    );
  }
}

export const POST = withAuthDynamic(updateGeneralVariablesHandler); 