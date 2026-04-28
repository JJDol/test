/**
 * Document Revision Suggestion API
 * 
 * PURPOSE: Generate AI-powered revision suggestions for document text
 * - Accepts text and context
 * - Generates multiple revision alternatives
 * - Returns side-by-side comparison data
 * 
 * ROUTE: POST /api/ai/suggest-revision
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { documentRevisionService, RevisionContext } from '@/lib/services/ai/document-revision-service';

interface SuggestRevisionRequest {
  text: string;
  context?: RevisionContext;
  numberOfAlternatives?: number;
}

async function suggestRevisionHandler(request: AuthenticatedRequest) {
  try {
    // Parse request body
    const body: SuggestRevisionRequest = await request.json();
    const { text, context = {}, numberOfAlternatives = 2 } = body;

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ 
        error: 'Text is too short. Minimum 20 characters required.' 
      }, { status: 400 });
    }

    console.log(`📝 Generating revision suggestions for ${text.length} characters of text`);

    // Generate revisions
    const result = await documentRevisionService.generateRevisions(
      text,
      context,
      numberOfAlternatives
    );

    // Calculate difference summaries for each alternative
    const alternativesWithDiff = result.alternatives.map(alt => {
      const diff = documentRevisionService.getDifferenceSummary(
        result.original_text,
        alt.revised_text
      );

      return {
        ...alt,
        difference: diff,
      };
    });

    console.log(`✅ Generated ${result.alternatives.length} revision alternatives`);

    return NextResponse.json({
      success: true,
      message: 'Revision suggestions generated successfully',
      result: {
        original_text: result.original_text,
        alternatives: alternativesWithDiff,
        overall_assessment: result.overall_assessment,
        stats: {
          tokens_used: result.tokens_used,
          cost_usd: result.cost_usd,
        },
      },
    });

  } catch (error) {
    console.error('❌ Error generating revision suggestions:', error);
    return NextResponse.json({
      error: 'Failed to generate revision suggestions',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(suggestRevisionHandler);

// Export type for frontend use
export type RevisionSuggestionResponse = {
  success: boolean;
  message: string;
  result: {
    original_text: string;
    alternatives: Array<{
      id: string;
      revised_text: string;
      changes_summary: string;
      improvements: string[];
      reasoning: string;
      confidence: number;
      difference: {
        added_words: number;
        removed_words: number;
        changed_words: number;
        similarity_score: number;
      };
    }>;
    overall_assessment: string;
    stats: {
      tokens_used: number;
      cost_usd: number;
    };
  };
};
