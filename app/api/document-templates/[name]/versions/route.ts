/**
 * Document Template Versions Route
 *
 * PURPOSE: List and manage template versions
 * - GET: List all versions of a template
 *
 * ROUTE: /api/document-templates/[name]/versions
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

export const dynamic = 'force-dynamic';

async function getVersionsHandler(
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

    // Verify template exists and user has access
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('name, current_version, is_public, user_id, company_id')
      .eq('name', templateName)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Check access
    if (template.company_id !== currentUserProfile.company_id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Get all versions
    const { data: versions, error: versionsError } = await supabase
      .from('template_versions')
      .select('*')
      .eq('template_name', templateName)
      .order('version', { ascending: false });

    if (versionsError) throw versionsError;

    return NextResponse.json({
      template_name: templateName,
      current_version: template.current_version || 1,
      versions: versions || []
    });

  } catch (error) {
    console.error('Error fetching template versions:', error);
    return NextResponse.json({
      message: 'Failed to fetch template versions',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const GET = withAuthDynamic(getVersionsHandler);
