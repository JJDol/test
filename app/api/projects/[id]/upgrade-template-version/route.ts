import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * Upgrade a project's template version lock to a newer version
 * POST /api/projects/[id]/upgrade-template-version
 * Body: { templateName: string, targetVersion?: number }
 */
async function upgradeTemplateVersionHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const { templateName, targetVersion } = await request.json();

    if (!templateName) {
      return NextResponse.json({
        message: 'Template name is required'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user's company
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError || !currentUserProfile) {
      return NextResponse.json({
        message: 'User profile not found'
      }, { status: 401 });
    }

    // Get the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({
        message: 'Project not found'
      }, { status: 404 });
    }

    // Get the template to find the current/latest version
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('name, current_version, variables')
      .eq('name', templateName)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({
        message: 'Template not found'
      }, { status: 404 });
    }

    // Determine target version (default to latest)
    const newVersion = targetVersion || template.current_version || 1;
    const currentLockedVersion = project.template_version_locks?.[templateName] || 1;

    if (newVersion <= currentLockedVersion) {
      return NextResponse.json({
        message: 'Target version must be newer than current locked version'
      }, { status: 400 });
    }

    // Get the new version's data
    const { data: versionData, error: versionError } = await supabase
      .from('template_versions')
      .select('version, variables, changes_summary')
      .eq('template_name', templateName)
      .eq('version', newVersion)
      .single();

    if (versionError || !versionData) {
      return NextResponse.json({
        message: `Version ${newVersion} not found for template ${templateName}`
      }, { status: 404 });
    }

    // Update the version lock
    const updatedVersionLocks = {
      ...(project.template_version_locks || {}),
      [templateName]: newVersion
    };

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        template_version_locks: updatedVersionLocks,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update version lock:', updateError);
      return NextResponse.json({
        message: 'Failed to upgrade template version'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templateName,
      previousVersion: currentLockedVersion,
      newVersion,
      changes: versionData.changes_summary
    });

  } catch (error) {
    console.error('Error upgrading template version:', error);
    return NextResponse.json({
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(upgradeTemplateVersionHandler);
