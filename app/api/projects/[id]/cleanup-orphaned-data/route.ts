import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { DocumentCategory } from '@/lib/types/types';

/**
 * Project Cleanup Orphaned Data API Route
 * 
 * PURPOSE: Clean up orphaned/inconsistent data in project
 * - Remove template entries from template_variables that are not in template arrays
 * - Remove duplicate template entries across categories in template_variables
 * - Clean up template_version_locks for templates not in arrays
 * - Fix category_variables for orphaned entries
 * 
 * ROUTE: POST /api/projects/[id]/cleanup-orphaned-data
 */

// Map DocumentCategory enum to database column names
const CATEGORY_TO_DB_FIELD: Record<DocumentCategory, string> = {
  [DocumentCategory.ARCHITECTURE]: 'architecture_templates',
  [DocumentCategory.CONSTRUCTIONS]: 'constructions_templates',
  [DocumentCategory.FIRE]: 'fire_templates',
  [DocumentCategory.AUTHORITY_PROCESSING]: 'authority_processing_templates',
  [DocumentCategory.ENERGY]: 'energy_templates',
  [DocumentCategory.HVAC]: 'hvac_templates',
  [DocumentCategory.EXECUTION_CONTROL]: 'execution_control_templates',
};

// Map database column names back to DocumentCategory
const DB_FIELD_TO_CATEGORY: Record<string, DocumentCategory> = {
  'architecture_templates': DocumentCategory.ARCHITECTURE,
  'constructions_templates': DocumentCategory.CONSTRUCTIONS,
  'fire_templates': DocumentCategory.FIRE,
  'authority_processing_templates': DocumentCategory.AUTHORITY_PROCESSING,
  'energy_templates': DocumentCategory.ENERGY,
  'hvac_templates': DocumentCategory.HVAC,
  'execution_control_templates': DocumentCategory.EXECUTION_CONTROL,
};

async function cleanupOrphanedDataHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    // Get current user profile
    const userSupabase = await createClient();
    const { data: currentUserProfile, error: currentUserError } = await userSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Get the project with all relevant fields
    let projectQuery = supabase
      .from('projects')
      .select(`
        id, 
        name,
        template_variables, 
        template_version_locks,
        category_variables,
        variable_propagation_settings,
        architecture_templates, 
        constructions_templates, 
        fire_templates, 
        authority_processing_templates, 
        energy_templates, 
        hvac_templates, 
        execution_control_templates, 
        company_id
      `)
      .eq('id', projectId);

    if (currentUserProfile.role !== 'ADMIN') {
      projectQuery = projectQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: project, error: projectError } = await projectQuery.single();

    if (projectError || !project) {
      return NextResponse.json({ 
        message: 'Project not found or not accessible' 
      }, { status: 404 });
    }

    // Build a map of which templates are in which category arrays
    const templateToCategory: Map<string, DocumentCategory> = new Map();
    const allActiveTemplates: Set<string> = new Set();

    // Process each database column
    const dbColumns = [
      'architecture_templates',
      'constructions_templates', 
      'fire_templates',
      'authority_processing_templates',
      'energy_templates',
      'hvac_templates',
      'execution_control_templates'
    ];

    for (const column of dbColumns) {
      const templates = (project as any)[column] as string[] || [];
      const category = DB_FIELD_TO_CATEGORY[column];
      
      for (const templateName of templates) {
        allActiveTemplates.add(templateName);
        templateToCategory.set(templateName, category);
      }
    }

    // Track cleanup actions
    const cleanupReport = {
      projectId,
      projectName: project.name,
      dryRun,
      templatesInArrays: Array.from(allActiveTemplates),
      orphanedTemplateVariables: [] as string[],
      duplicateAcrossCategories: [] as { template: string; categories: string[] }[],
      orphanedVersionLocks: [] as string[],
      orphanedCategoryVariables: [] as { category: string; templates: string[] }[],
      orphanedPropagationSettings: [] as { category: string; templates: string[] }[],
    };

    // Clean template_variables
    const currentTemplateVars = project.template_variables || {};
    const cleanedTemplateVars: typeof currentTemplateVars = {};
    const templateSeenInCategories: Map<string, string[]> = new Map();

    for (const category of Object.values(DocumentCategory)) {
      const categoryVars = currentTemplateVars[category];
      if (!categoryVars) continue;

      cleanedTemplateVars[category] = {};

      for (const templateName of Object.keys(categoryVars)) {
        // Track which categories this template appears in
        const categories = templateSeenInCategories.get(templateName) || [];
        categories.push(category);
        templateSeenInCategories.set(templateName, categories);

        // Check if template is in the active templates
        if (!allActiveTemplates.has(templateName)) {
          cleanupReport.orphanedTemplateVariables.push(`${category}/${templateName}`);
          continue; // Don't include orphaned templates
        }

        // Check if template belongs to THIS category
        const correctCategory = templateToCategory.get(templateName);
        if (correctCategory !== category) {
          // Template is in wrong category - skip it (will be recorded as duplicate)
          continue;
        }

        // Keep valid template
        cleanedTemplateVars[category][templateName] = categoryVars[templateName];
      }

      // Remove empty categories
      if (Object.keys(cleanedTemplateVars[category]).length === 0) {
        delete cleanedTemplateVars[category];
      }
    }

    // Report duplicates across categories
    for (const [template, categories] of templateSeenInCategories) {
      if (categories.length > 1) {
        cleanupReport.duplicateAcrossCategories.push({ template, categories });
      }
    }

    // Clean template_version_locks
    const currentVersionLocks = project.template_version_locks || {};
    const cleanedVersionLocks: typeof currentVersionLocks = {};

    for (const templateName of Object.keys(currentVersionLocks)) {
      if (allActiveTemplates.has(templateName)) {
        cleanedVersionLocks[templateName] = currentVersionLocks[templateName];
      } else {
        cleanupReport.orphanedVersionLocks.push(templateName);
      }
    }

    // Clean category_variables
    const currentCategoryVars = project.category_variables || {};
    const cleanedCategoryVars: typeof currentCategoryVars = {};

    for (const category of Object.values(DocumentCategory)) {
      const categoryData = currentCategoryVars[category];
      if (!categoryData) continue;

      // Check if this category has any active templates
      const categoryTemplates = Array.from(allActiveTemplates).filter(
        t => templateToCategory.get(t) === category
      );

      if (categoryTemplates.length > 0) {
        cleanedCategoryVars[category] = categoryData;
      } else if (categoryData.variables && categoryData.variables.length > 0) {
        cleanupReport.orphanedCategoryVariables.push({
          category,
          templates: categoryTemplates
        });
      }
    }

    // Clean variable_propagation_settings
    const currentPropSettings = project.variable_propagation_settings || {};
    const cleanedPropSettings: typeof currentPropSettings = {};

    for (const category of Object.values(DocumentCategory)) {
      const categorySettings = currentPropSettings[category];
      if (!categorySettings) continue;

      cleanedPropSettings[category] = {};

      for (const templateName of Object.keys(categorySettings)) {
        if (allActiveTemplates.has(templateName) && templateToCategory.get(templateName) === category) {
          cleanedPropSettings[category][templateName] = categorySettings[templateName];
        } else {
          if (!cleanupReport.orphanedPropagationSettings.find(o => o.category === category)) {
            cleanupReport.orphanedPropagationSettings.push({ category, templates: [] });
          }
          cleanupReport.orphanedPropagationSettings.find(o => o.category === category)!.templates.push(templateName);
        }
      }

      // Remove empty categories
      if (Object.keys(cleanedPropSettings[category]).length === 0) {
        delete cleanedPropSettings[category];
      }
    }

    // Apply changes if not dry run
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          template_variables: cleanedTemplateVars,
          template_version_locks: cleanedVersionLocks,
          category_variables: cleanedCategoryVars,
          variable_propagation_settings: cleanedPropSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (updateError) {
        console.error(`Error updating project ${projectId}:`, updateError);
        return NextResponse.json({ 
          message: 'Failed to update project',
          error: updateError.message 
        }, { status: 500 });
      }
    }

    const hasIssues = 
      cleanupReport.orphanedTemplateVariables.length > 0 ||
      cleanupReport.duplicateAcrossCategories.length > 0 ||
      cleanupReport.orphanedVersionLocks.length > 0 ||
      cleanupReport.orphanedCategoryVariables.length > 0 ||
      cleanupReport.orphanedPropagationSettings.length > 0;

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? (hasIssues ? 'Issues found - run without dryRun to fix' : 'No issues found')
        : (hasIssues ? 'Orphaned data cleaned up successfully' : 'No cleanup needed'),
      report: cleanupReport,
      ...(dryRun ? {} : { 
        cleaned: {
          template_variables: cleanedTemplateVars,
          template_version_locks: cleanedVersionLocks
        }
      })
    });

  } catch (error) {
    console.error('Error cleaning up orphaned data:', error);
    return NextResponse.json({ 
      message: 'Failed to clean up orphaned data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(cleanupOrphanedDataHandler);
