import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { enhancedQueryEngine } from '@/lib/services/ai/enhanced-query-engine';

/**
 * Semantic Search API Route
 * 
 * PURPOSE: Advanced document search with AI-powered query processing
 * - Two-stage search process for better results
 * - AI reasoning and source attribution
 * - Cost and token usage tracking
 * - Configurable search limits and result counts

 * TODO:
 * - Consider if this should be integrated into the main chat interface
 * - Evaluate search result caching for performance
 * - Add search analytics dashboard
 * 
 * ROUTE: /api/semantic/search
 */
async function searchHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const searchLimit = parseInt(searchParams.get('limit') || '20');
    const resultLimit = parseInt(searchParams.get('results') || '3');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!request.user.company_id) {
      return NextResponse.json({ error: 'User must have company_id for document search' }, { status: 400 });
    }

    console.log(`🔍 Enhanced search request from user ${request.user.id}: "${query}"`);

    // Use enhanced query engine with sophisticated processing
    const result = await enhancedQueryEngine.search(
      query,
      request.user.company_id,
      {
        initialSearchLimit: searchLimit,
        finalResultLimit: resultLimit,
        includeInactiveContent: includeInactive
      }
    );

    // Log analytics for monitoring
    console.log(`📊 Search analytics:`, {
      userId: request.user.id,
      companyId: request.user.company_id,
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      reasoning: result.reasoning,
      sourcesFound: result.sources.length,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      query: result.query,
      response: result.response,
      sources: result.sources,
      metadata: {
        reasoning: result.reasoning,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        searchMethod: 'enhanced_two_stage',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Enhanced search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process enhanced search request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(searchHandler); 