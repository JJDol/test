/**
 * Document Analysis API
 * 
 * PURPOSE: Analyze document chapters for quality, completeness, and compliance
 * - Extract chapter content from documents
 * - Compare against chapter definitions
 * - Use AI to identify issues and provide suggestions
 * - Store analysis results in database
 * 
 * ROUTE: POST /api/ai/analyze-document
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { documentQualityAnalyzer, ChapterDefinition } from '@/lib/services/ai/document-quality-analyzer';

interface AnalyzeDocumentRequest {
  projectId: string;
  templateName: string;
  chapterName: string;
  chapterContent: string;
  chapterDefinitionId?: string; // Optional: if known
}

async function analyzeDocumentHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    const user = request.user;

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

    if (!userData.company_id) {
      return NextResponse.json({ 
        error: 'User not assigned to a company' 
      }, { status: 403 });
    }

    // Parse request body
    const body: AnalyzeDocumentRequest = await request.json();
    const { projectId, templateName, chapterName, chapterContent, chapterDefinitionId } = body;

    if (!projectId || !templateName || !chapterName || !chapterContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, templateName, chapterName, chapterContent' 
      }, { status: 400 });
    }

    console.log(`📊 Analyzing document chapter: Project ${projectId}, Template ${templateName}, Chapter ${chapterName}`);

    // Step 1: Verify user has access to the project
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

    // Step 2: Get or find chapter definition
    let chapterDefinition: ChapterDefinition | null = null;

    if (chapterDefinitionId) {
      // Use provided definition ID
      const { data: definition, error: defError } = await supabase
        .from('document_chapter_definitions')
        .select('*')
        .eq('id', chapterDefinitionId)
        .eq('company_id', userData.company_id)
        .single();

      if (!defError && definition) {
        chapterDefinition = definition as ChapterDefinition;
      }
    }

    if (!chapterDefinition) {
      // Try to find matching definition by chapter name
      const { data: definitions, error: defsError } = await supabase
        .from('document_chapter_definitions')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('chapter_name', chapterName)
        .eq('is_active', true)
        .limit(1);

      if (!defsError && definitions && definitions.length > 0) {
        chapterDefinition = definitions[0] as ChapterDefinition;
      }
    }

    // If no definition found, create a default one for basic analysis
    if (!chapterDefinition) {
      console.warn(`No chapter definition found for "${chapterName}", using default analysis`);
      chapterDefinition = {
        id: 'default',
        chapter_name: chapterName,
        title: chapterName,
        required_content: `This chapter should contain relevant content for: ${chapterName}`,
        min_word_count: 100,
      };
    }

    // Step 3: Perform analysis
    const analysisResult = await documentQualityAnalyzer.analyzeChapter(
      chapterContent,
      chapterDefinition
    );

    // Step 4: Store analysis results in database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('document_analysis_results')
      .insert({
        project_id: projectId,
        template_name: templateName,
        chapter_name: chapterName,
        analyzed_by: user.id,
        chapter_content: chapterContent,
        word_count: analysisResult.word_count,
        overall_status: analysisResult.overall_status,
        confidence_score: analysisResult.confidence_score,
        issues: analysisResult.issues,
        suggestions: analysisResult.suggestions,
        completeness_score: analysisResult.completeness_score,
        quality_score: analysisResult.quality_score,
        compliance_score: analysisResult.compliance_score,
        ai_tokens_used: analysisResult.ai_tokens_used,
        ai_cost_usd: analysisResult.ai_cost_usd,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis results:', saveError);
      // Continue anyway - return the analysis even if save failed
    }

    // Step 5: Store individual issues in normalized table for better querying
    if (savedAnalysis && analysisResult.issues.length > 0) {
      const issuesData = analysisResult.issues.map(issue => ({
        analysis_result_id: savedAnalysis.id,
        project_id: projectId,
        severity: issue.severity,
        issue_type: issue.issue_type,
        title: issue.title,
        description: issue.description,
        location: issue.location || null,
        suggestion: issue.suggestion || null,
        status: issue.status,
      }));

      const { error: issuesError } = await supabase
        .from('document_analysis_issues')
        .insert(issuesData);

      if (issuesError) {
        console.error('Error saving analysis issues:', issuesError);
      }
    }

    console.log(`✅ Analysis complete and saved. Status: ${analysisResult.overall_status}, Issues: ${analysisResult.issues.length}`);

    // Return analysis results
    return NextResponse.json({
      success: true,
      message: 'Document analysis completed successfully',
      analysis: {
        id: savedAnalysis?.id,
        overall_status: analysisResult.overall_status,
        confidence_score: analysisResult.confidence_score,
        issues: analysisResult.issues,
        suggestions: analysisResult.suggestions,
        scores: {
          completeness: analysisResult.completeness_score,
          quality: analysisResult.quality_score,
          compliance: analysisResult.compliance_score,
        },
        word_count: analysisResult.word_count,
        stats: {
          ai_tokens_used: analysisResult.ai_tokens_used,
          ai_cost_usd: analysisResult.ai_cost_usd,
        },
        chapter_definition: chapterDefinition.id !== 'default' ? {
          id: chapterDefinition.id,
          name: chapterDefinition.chapter_name,
          title: chapterDefinition.title,
        } : null,
      },
    });

  } catch (error) {
    console.error('❌ Error in document analysis:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(analyzeDocumentHandler);

// Export type for frontend use
export type DocumentAnalysisResponse = {
  success: boolean;
  message: string;
  analysis: {
    id?: string;
    overall_status: 'pass' | 'warning' | 'error';
    confidence_score: number;
    issues: any[];
    suggestions: any[];
    scores: {
      completeness: number;
      quality: number;
      compliance: number;
    };
    word_count: number;
    stats: {
      ai_tokens_used: number;
      ai_cost_usd: number;
    };
    chapter_definition: {
      id: string;
      name: string;
      title: string;
    } | null;
  };
};
