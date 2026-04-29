/**
 * Get Document Analysis Results API
 * 
 * PURPOSE: Retrieve all analysis results for a project
 * - Fetch analysis results with issues and suggestions
 * - Filter by template, chapter, status
 * - Support pagination
 * 
 * ROUTE: GET /api/ai/analysis-results/[projectId]
 */

import { NextResponse } from 'next/server';
import {
  withAuthDynamic,
  AuthenticatedRequest,
  RouteContext,
} from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';

async function getAnalysisResultsHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ projectId: string }>
) {
  try {
    const supabase = await createClient();
    const user = request.user;
    const { projectId } = await params;

    // Get user's company info
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, name, role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('User not found in database:', user.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id, leader_id, workers')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ 
        error: 'Project not found' 
      }, { status: 404 });
    }

    if (project.company_id !== userData.company_id) {
      return NextResponse.json({ 
        error: 'Access denied to this project' 
      }, { status: 403 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const templateName = searchParams.get('template');
    const chapterName = searchParams.get('chapter');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('document_analysis_results')
      .select('*')
      .eq('project_id', projectId)
      .order('analyzed_at', { ascending: false });

    if (templateName) {
      query = query.eq('template_name', templateName);
    }

    if (chapterName) {
      query = query.eq('chapter_name', chapterName);
    }

    if (status && ['pass', 'warning', 'error'].includes(status)) {
      query = query.eq('overall_status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: results, error: resultsError } = await query;

    if (resultsError) {
      console.error('Error fetching analysis results:', resultsError);
      return NextResponse.json({ 
        error: 'Failed to fetch analysis results',
        details: resultsError.message 
      }, { status: 500 });
    }

    // Get issue counts summary
    const { data: issueCounts } = await supabase
      .from('document_analysis_issues')
      .select('severity, status')
      .eq('project_id', projectId);

    const issuesSummary = {
      total: issueCounts?.length || 0,
      open: issueCounts?.filter(i => i.status === 'open').length || 0,
      critical: issueCounts?.filter(i => i.severity === 'critical' && i.status === 'open').length || 0,
      high: issueCounts?.filter(i => i.severity === 'high' && i.status === 'open').length || 0,
      medium: issueCounts?.filter(i => i.severity === 'medium' && i.status === 'open').length || 0,
      low: issueCounts?.filter(i => i.severity === 'low' && i.status === 'open').length || 0,
    };

    return NextResponse.json({
      success: true,
      results: results || [],
      summary: issuesSummary,
      pagination: {
        limit,
        offset,
        total: results?.length || 0,
      },
    });

  } catch (error) {
    console.error('❌ Error getting analysis results:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const GET = withAuthDynamic(getAnalysisResultsHandler);
