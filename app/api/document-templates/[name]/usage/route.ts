/**
 * Document Template Usage Check Route
 *
 * PURPOSE: Check which projects are using a specific template
 * Returns list of projects and count for deletion warning
 *
 * ROUTE: GET /api/document-templates/[name]/usage
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';

export const dynamic = 'force-dynamic';

async function getTemplateUsageHandler(
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

    // Check if template exists
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('name, company_id')
      .eq('name', templateName)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Find all projects using this template
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, architecture_templates, constructions_templates, fire_templates, authority_processing_templates, energy_templates, hvac_templates, execution_control_templates')
      .eq('company_id', currentUserProfile.company_id);

    if (projectsError) throw projectsError;

    // Filter projects that use this template and identify which category
    const usingProjects: { id: string; name: string; category: string }[] = [];

    const categoryFields = [
      { field: 'architecture_templates', label: 'Architecture' },
      { field: 'constructions_templates', label: 'Constructions' },
      { field: 'fire_templates', label: 'Fire Safety' },
      { field: 'authority_processing_templates', label: 'Authority Processing' },
      { field: 'energy_templates', label: 'Energy' },
      { field: 'hvac_templates', label: 'HVAC' },
      { field: 'execution_control_templates', label: 'Execution Control' },
    ];

    for (const project of projects || []) {
      for (const { field, label } of categoryFields) {
        const templates = project[field as keyof typeof project] as string[] | null;
        if (templates && templates.includes(templateName)) {
          usingProjects.push({
            id: project.id,
            name: project.name,
            category: label,
          });
          break; // Only add project once even if used in multiple categories
        }
      }
    }

    return NextResponse.json({
      templateName,
      projectCount: usingProjects.length,
      projects: usingProjects,
    });

  } catch (error) {
    console.error('Error checking template usage:', error);
    return NextResponse.json({
      message: 'Failed to check template usage',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const GET = withAuthDynamic(getTemplateUsageHandler);
