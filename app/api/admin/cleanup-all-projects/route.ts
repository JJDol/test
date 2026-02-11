import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { DocumentCategory } from '@/lib/types/types';

/**
 * Bulk Project Cleanup API Route
 * 
 * PURPOSE: Clean up orphaned/inconsistent data in ALL projects
 * - Remove template entries from template_variables that are not in template arrays
 * - Remove duplicate template entries across categories in template_variables
 * - Clean up template_version_locks for templates not in arrays
 * - Fix category_variables for orphaned entries
 * - Fix variable_propagation_settings for orphaned entries
 * 
 * ROUTE: POST /api/admin/cleanup-all-projects
 * 
 * BODY:
 * - dryRun: boolean (default: true) - If true, only report issues without fixing
 * - projectIds: string[] (optional) - Specific project IDs to clean, or all if not provided
 */

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

interface ProjectCleanupReport {
  projectId: number;
  projectName: string;
  hasIssues: boolean;
  orphanedTemplateVariables: string[];
  duplicateAcrossCategories: { template: string; categories: string[] }[];
  orphanedVersionLocks: string[];
  orphanedCategoryVariables: { category: string; templates: string[] }[];
  orphanedPropagationSettings: { category: string; templates: string[] }[];
}

interface CleanupResult {
  projectId: number;
  projectName: string;
  success: boolean;
  error?: string;
  report: ProjectCleanupReport;
}

function cleanupProject(project: any): {
  report: ProjectCleanupReport;
  cleanedData: {
    template_variables: any;
    template_version_locks: any;
    category_variables: any;
    variable_propagation_settings: any;
  };
} {
  // Build a map of which templates are in which category arrays
  const templateToCategory: Map<string, DocumentCategory> = new Map();
  const allActiveTemplates: Set<string> = new Set();

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
    const templates = project[column] as string[] || [];
    const category = DB_FIELD_TO_CATEGORY[column];
    
    for (const templateName of templates) {
      allActiveTemplates.add(templateName);
      templateToCategory.set(templateName, category);
    }
  }

  // Track cleanup actions
  const report: ProjectCleanupReport = {
    projectId: project.id,
    projectName: project.name,
    hasIssues: false,
    orphanedTemplateVariables: [],
    duplicateAcrossCategories: [],
    orphanedVersionLocks: [],
    orphanedCategoryVariables: [],
    orphanedPropagationSettings: [],
  };

  // Clean template_variables
  const currentTemplateVars = project.template_variables || {};
  const cleanedTemplateVars: any = {};
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
        report.orphanedTemplateVariables.push(`${category}/${templateName}`);
        continue;
      }

      // Check if template belongs to THIS category
      const correctCategory = templateToCategory.get(templateName);
      if (correctCategory !== category) {
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
      report.duplicateAcrossCategories.push({ template, categories });
    }
  }

  // Clean template_version_locks
  const currentVersionLocks = project.template_version_locks || {};
  const cleanedVersionLocks: any = {};

  for (const templateName of Object.keys(currentVersionLocks)) {
    if (allActiveTemplates.has(templateName)) {
      cleanedVersionLocks[templateName] = currentVersionLocks[templateName];
    } else {
      report.orphanedVersionLocks.push(templateName);
    }
  }

  // Clean category_variables
  const currentCategoryVars = project.category_variables || {};
  const cleanedCategoryVars: any = {};

  for (const category of Object.values(DocumentCategory)) {
    const categoryData = currentCategoryVars[category];
    if (!categoryData) continue;

    const categoryTemplates = Array.from(allActiveTemplates).filter(
      t => templateToCategory.get(t) === category
    );

    if (categoryTemplates.length > 0) {
      cleanedCategoryVars[category] = categoryData;
    } else if (categoryData.variables && categoryData.variables.length > 0) {
      report.orphanedCategoryVariables.push({
        category,
        templates: categoryTemplates
      });
    }
  }

  // Clean variable_propagation_settings
  const currentPropSettings = project.variable_propagation_settings || {};
  const cleanedPropSettings: any = {};

  for (const category of Object.values(DocumentCategory)) {
    const categorySettings = currentPropSettings[category];
    if (!categorySettings) continue;

    cleanedPropSettings[category] = {};

    for (const templateName of Object.keys(categorySettings)) {
      if (allActiveTemplates.has(templateName) && templateToCategory.get(templateName) === category) {
        cleanedPropSettings[category][templateName] = categorySettings[templateName];
      } else {
        const existing = report.orphanedPropagationSettings.find(o => o.category === category);
        if (existing) {
          existing.templates.push(templateName);
        } else {
          report.orphanedPropagationSettings.push({ category, templates: [templateName] });
        }
      }
    }

    // Remove empty categories
    if (Object.keys(cleanedPropSettings[category]).length === 0) {
      delete cleanedPropSettings[category];
    }
  }

  report.hasIssues = 
    report.orphanedTemplateVariables.length > 0 ||
    report.duplicateAcrossCategories.length > 0 ||
    report.orphanedVersionLocks.length > 0 ||
    report.orphanedCategoryVariables.length > 0 ||
    report.orphanedPropagationSettings.length > 0;

  return {
    report,
    cleanedData: {
      template_variables: cleanedTemplateVars,
      template_version_locks: cleanedVersionLocks,
      category_variables: cleanedCategoryVars,
      variable_propagation_settings: cleanedPropSettings,
    }
  };
}

async function cleanupAllProjectsHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const projectIds: number[] | undefined = body.projectIds;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    // Verify user is admin or company admin
    const userSupabase = await createClient();
    const { data: currentUserProfile, error: currentUserError } = await userSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Only ADMIN or COMPANY_ADMIN can run this
    if (!['ADMIN', 'COMPANY_ADMIN'].includes(currentUserProfile.role)) {
      return NextResponse.json({ 
        error: 'Access denied. Only admins can run bulk cleanup.' 
      }, { status: 403 });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Build query for projects
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
      `);

    // If specific project IDs provided, filter by them
    if (projectIds && projectIds.length > 0) {
      projectQuery = projectQuery.in('id', projectIds);
    }

    // If not super admin, only get projects from user's company
    if (currentUserProfile.role !== 'ADMIN') {
      projectQuery = projectQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: projects, error: projectsError } = await projectQuery;

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ 
        message: 'Failed to fetch projects',
        error: projectsError.message 
      }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No projects found',
        summary: {
          totalProjects: 0,
          projectsWithIssues: 0,
          projectsCleaned: 0,
          totalOrphanedEntries: 0
        },
        results: []
      });
    }

    const results: CleanupResult[] = [];
    let projectsCleaned = 0;
    let totalOrphanedEntries = 0;

    for (const project of projects) {
      const { report, cleanedData } = cleanupProject(project);
      
      totalOrphanedEntries += 
        report.orphanedTemplateVariables.length +
        report.orphanedVersionLocks.length +
        report.duplicateAcrossCategories.length;

      if (!dryRun && report.hasIssues) {
        // Apply cleanup
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            template_variables: cleanedData.template_variables,
            template_version_locks: cleanedData.template_version_locks,
            category_variables: cleanedData.category_variables,
            variable_propagation_settings: cleanedData.variable_propagation_settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id);

        if (updateError) {
          results.push({
            projectId: project.id,
            projectName: project.name,
            success: false,
            error: updateError.message,
            report
          });
          continue;
        }
        projectsCleaned++;
      }

      results.push({
        projectId: project.id,
        projectName: project.name,
        success: true,
        report
      });
    }

    const projectsWithIssues = results.filter(r => r.report.hasIssues).length;

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun 
        ? `Found ${projectsWithIssues} project(s) with issues. Run with dryRun: false to fix.`
        : `Cleaned up ${projectsCleaned} project(s) successfully.`,
      summary: {
        totalProjects: projects.length,
        projectsWithIssues,
        projectsCleaned: dryRun ? 0 : projectsCleaned,
        totalOrphanedEntries
      },
      results
    });

  } catch (error) {
    console.error('Error in bulk cleanup:', error);
    return NextResponse.json({ 
      message: 'Failed to run bulk cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(cleanupAllProjectsHandler);
