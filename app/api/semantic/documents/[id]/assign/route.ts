/**
 * Semantic Document Assignment Route
 * 
 * PURPOSE: Manage document access and ownership within semantic system
 * - Change document ownership (user_id)
 * - Modify access level (is_company_wide flag)
 * - Transfer documents between users or make them company-wide
 * 
 * SECURITY:
 * - Authentication required via withAuthDynamic middleware
 * - Company isolation enforced
 * - Only document owner or company admin can modify
 * 
 * INTEGRATION:
 * - Part of unified semantic system for AI operations
 * - Manages document access for semantic search and chat
 * - Supports flexible document sharing within company
 * 
 * TODO:
 * - Complete implementation for document ownership transfer
 * - Add validation for company-wide access changes
 * - Consider document sharing permissions
 * - Add audit logging for ownership changes
 * 
 * ROUTE: POST /api/semantic/documents/[id]/assign
 * STATUS: Under development - needs completion
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

async function assignDocumentHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
    const { assignee_id, supervisor_id } = await request.json();
    const supabase = await createClient();

    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Verify the document exists and apply company filter only for non-ADMIN users
    let documentQuery = supabase
      .from('documents')
      .select('*')
      .eq('id', id);

    if (currentUserProfile.role !== 'ADMIN') {
      documentQuery = documentQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: document, error: documentError } = await documentQuery.single();

    if (documentError || !document) {
      return NextResponse.json({ 
        message: currentUserProfile.role === 'ADMIN' 
          ? 'Document not found' 
          : 'Document not found or not accessible in your company' 
      }, { status: 404 });
    }

    // All users (including ADMIN) must assign from the same company as the document
    const userCompanyFilter = { company_id: document.company_id };

    // Verify that assignee and supervisor exist (and are in the same company for non-ADMIN users)
    if (assignee_id) {
      const { data: assignee, error: assigneeError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', assignee_id)
        .match(userCompanyFilter)
        .single();

      if (assigneeError || !assignee) {
        return NextResponse.json({ 
          message: 'Assignee not found or not in the document\'s company' 
        }, { status: 400 });
      }
    }

    if (supervisor_id) {
      const { data: supervisor, error: supervisorError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', supervisor_id)
        .match(userCompanyFilter)
        .single();

      if (supervisorError || !supervisor) {
        return NextResponse.json({ 
          message: 'Supervisor not found or not in the document\'s company' 
        }, { status: 400 });
      }
    }

    // Update the document assignment
    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update({
        assignee_id,
        supervisor_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating document assignment:', updateError);
      return NextResponse.json({ 
        message: 'Failed to update document assignment',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error in document assignment:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply dynamic authentication wrapper
export const POST = withAuthDynamic(assignDocumentHandler); 