/**
 * Document Template Archive Route
 *
 * PURPOSE: Archive (soft delete) a template instead of permanently deleting
 * - POST: Archive the template
 * - DELETE: Restore from archive
 *
 * ROUTE: /api/document-templates/[name]/archive
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

export const dynamic = 'force-dynamic';

// Archive a template
async function archiveTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ name: string }>
) {
  try {
    const { name: templateName } = await params;
    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', templateName)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Check permissions
    if (!template.is_public && template.user_id !== request.user.id) {
      return NextResponse.json({
        message: 'You do not have permission to archive this template'
      }, { status: 403 });
    }

    // Archive the template
    const { error: updateError } = await supabase
      .from('document_templates')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: request.user.id,
      })
      .eq('name', templateName);

    if (updateError) throw updateError;

    return NextResponse.json({
      message: 'Template archived successfully',
      templateName,
    });

  } catch (error) {
    console.error('Error archiving template:', error);
    return NextResponse.json({
      message: 'Failed to archive template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Restore a template from archive
async function restoreTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ name: string }>
) {
  try {
    const { name: templateName } = await params;
    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', templateName)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Restore the template
    const { error: updateError } = await supabase
      .from('document_templates')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
      })
      .eq('name', templateName);

    if (updateError) throw updateError;

    return NextResponse.json({
      message: 'Template restored successfully',
      templateName,
    });

  } catch (error) {
    console.error('Error restoring template:', error);
    return NextResponse.json({
      message: 'Failed to restore template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(archiveTemplateHandler);
export const DELETE = withAuthDynamic(restoreTemplateHandler);
