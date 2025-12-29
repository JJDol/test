import { openaiService } from './openai-client';
import { qdrantService } from '@/lib/services/integrations/qdrant-client';
import { SourceAttribution } from '@/lib/types/types';

export interface EnhancedSearchResult {
  query: string;
  response: string;
  sources: SourceAttribution[];
  reasoning: string;
  tokensUsed: number;
  cost: number;
}

export class EnhancedQueryEngine {
  
  /**
   * Two-stage retrieval with context-aware prompting (ported from backend)
   */
  async search(
    query: string,
    companyId: string,
    options: {
      initialSearchLimit?: number;
      finalResultLimit?: number;
      includeInactiveContent?: boolean;
    } = {}
  ): Promise<EnhancedSearchResult> {
    const {
      initialSearchLimit = 20, // Cast wider net initially (like backend)
      finalResultLimit = 3,    // Keep only top 3 (like backend)
      includeInactiveContent = false
    } = options;

    console.log(`🔍 Enhanced search for: "${query}"`);

    try {
      // Step 1: Generate query embedding
      const queryEmbedding = await openaiService.generateEmbedding(query);

      // Step 2: Wide initial search (stage 1 retrieval)
      const initialSources = await qdrantService.searchSimilar(
        query,
        queryEmbedding,
        companyId,
        initialSearchLimit
      );

      if (initialSources.length === 0) {
        return {
          query,
          response: "I could not find any relevant information in the available documents or BR18 regulations. Please try rephrasing your question or ensure that the relevant documents have been uploaded.",
          sources: [],
          reasoning: "No documents found in initial search",
          tokensUsed: 0,
          cost: 0
        };
      }

      console.log(`📊 Initial search returned ${initialSources.length} results`);

      // Step 3: Filter active content (ported from backend logic)
      const activeSources = includeInactiveContent 
        ? initialSources
        : this.filterActiveContent(initialSources);

      if (activeSources.length === 0) {
        return {
          query,
          response: "I could not find any active regulations related to your query. The sections I found might have been repealed or are no longer in effect.",
          sources: [],
          reasoning: "All found content was inactive/repealed",
          tokensUsed: 0,
          cost: 0
        };
      }

      // Step 4: Apply top-N filtering (stage 2 retrieval)
      const topSources = activeSources.slice(0, finalResultLimit);
      console.log(`🎯 Filtered to top ${topSources.length} sources`);

      // Step 5: Context-aware prompting (ported from backend)
      const { prompt, reasoning } = this.buildContextAwarePrompt(query, topSources);

      // Step 6: Generate response with cost tracking
      const response = await openaiService.generateChatResponse([
        { 
          role: 'system', 
          content: 'You are an expert assistant specializing in analyzing documents and answering questions about building regulations and construction requirements.' 
        },
        { role: 'user', content: prompt }
      ], 1000); // Reasonable token limit

      // Step 7: Calculate costs
      const embeddingTokens = Math.ceil(query.length / 4);
      const embeddingCost = embeddingTokens * 0.00000002; // text-embedding-3-small cost
      const chatCost = response.tokensUsed * 0.0000005;   // gpt-3.5-turbo cost
      const totalCost = embeddingCost + chatCost;

      console.log(`✅ Enhanced search completed: ${response.tokensUsed} tokens, $${totalCost.toFixed(6)} cost`);

      return {
        query,
        response: response.content,
        sources: topSources,
        reasoning,
        tokensUsed: response.tokensUsed + embeddingTokens,
        cost: totalCost
      };

    } catch (error) {
      console.error('❌ Enhanced search failed:', error);
      return {
        query,
        response: "An error occurred while processing your query. Please try again.",
        sources: [],
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokensUsed: 0,
        cost: 0
      };
    }
  }

  /**
   * Filter out repealed/inactive content (ported from backend)
   */
  private filterActiveContent(sources: SourceAttribution[]): SourceAttribution[] {
    return sources.filter(source => {
      // Check for Danish "Ophævet" (repealed) marker
      if (source.text_snippet.includes('Ophævet') || source.text_snippet.includes('(Ophævet)')) {
        return false;
      }
      
      // Check for explicit status metadata
      if (source.document_name && source.document_name.includes('repealed')) {
        return false;
      }
      
      // Default to active if no negative indicators
      return true;
    });
  }

  /**
   * Build context-aware prompt based on query type (ported from backend)
   */
  private buildContextAwarePrompt(query: string, sources: SourceAttribution[]): { prompt: string; reasoning: string } {
    const context = sources
      .map(source => `Document: ${source.document_name}\nContent: ${source.text_snippet}`)
      .join('\n\n');

    // Query classification (ported from backend logic)
    const isBR18Query = this.containsAny(query.toLowerCase(), [
      'br18', 'regulation', 'code', 'requirement', 'standard', 'bygningsreglement'
    ]);
    
    const isDocumentQuery = this.containsAny(query.toLowerCase(), [
      'file', 'document', 'about', 'content', 'contains', 'what is'
    ]);

    const isProjectQuery = this.containsAny(query.toLowerCase(), [
      'project', 'construction', 'building', 'design', 'plan'
    ]);

    let prompt: string;
    let reasoning: string;

    if (isBR18Query) {
      reasoning = "Detected BR18/regulation query - using regulation-focused prompt";
      prompt = `Based on the BR18 building regulations content below, provide a clear and direct answer about the specific regulation or requirement. Focus on:
1. The exact requirement or standard being asked about
2. Any specific numerical values or limits
3. Mandatory conditions or exceptions

Content from BR18:
${context}

Question: ${query}

Write your response in clear, professional English, emphasizing the regulatory requirements. If you're unsure about something, say so.`;

    } else if (isDocumentQuery) {
      reasoning = "Detected document analysis query - using content-focused prompt";
      prompt = `Based on the document content below, provide a clear analysis of what this document contains. Focus on:
1. The main purpose and scope of the document
2. Key sections and their content
3. Any specific technical details, measurements, or requirements
4. How this document relates to construction or building regulations (if applicable)

Content:
${context}

Question: ${query}

Write your response in clear, professional English, focusing on explaining the document's content and purpose. If you're unsure about something, say so.`;

    } else if (isProjectQuery) {
      reasoning = "Detected project-related query - using project-focused prompt";
      prompt = `Based on the available content below, provide practical guidance for construction and building projects. Focus on:
1. Applicable requirements and standards
2. Implementation considerations
3. Compliance requirements
4. Best practices

Content:
${context}

Question: ${query}

Write your response in clear, professional English, focusing on actionable guidance for project implementation. If you're unsure about something, say so.`;

    } else {
      reasoning = "General query - using comprehensive prompt";
      prompt = `Based on the available content below, provide a clear and direct answer to the question:

Content:
${context}

Question: ${query}

Write your response in clear, professional English. Focus on the facts from the provided content. If you're unsure about something, say so.`;
    }

    return { prompt, reasoning };
  }

  /**
   * Check if text contains any of the specified terms
   */
  private containsAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }

  /**
   * Batch search for multiple queries (cost-optimized)
   */
  async batchSearch(
    queries: string[],
    companyId: string,
    options: {
      maxConcurrent?: number;
      costLimit?: number;
    } = {}
  ): Promise<EnhancedSearchResult[]> {
    const { maxConcurrent = 3, costLimit = 0.10 } = options; // $0.10 default limit
    
    console.log(`🔄 Batch search for ${queries.length} queries (max ${maxConcurrent} concurrent)`);
    
    const results: EnhancedSearchResult[] = [];
    let totalCost = 0;
    
    // Process in batches to control concurrency and cost
    for (let i = 0; i < queries.length; i += maxConcurrent) {
      const batch = queries.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(query => this.search(query, companyId));
      const batchResults = await Promise.all(batchPromises);
      
      // Check cost limit
      const batchCost = batchResults.reduce((sum, result) => sum + result.cost, 0);
      totalCost += batchCost;
      
      results.push(...batchResults);
      
      if (totalCost > costLimit) {
        console.warn(`⚠️ Cost limit reached: $${totalCost.toFixed(6)} > $${costLimit}`);
        break;
      }
    }
    
    console.log(`✅ Batch search completed: ${results.length} results, $${totalCost.toFixed(6)} total cost`);
    return results;
  }

  /**
   * Get search analytics for cost monitoring
   */
  getSearchAnalytics(results: EnhancedSearchResult[]): {
    totalQueries: number;
    totalCost: number;
    totalTokens: number;
    averageCostPerQuery: number;
    averageTokensPerQuery: number;
    queryTypes: Record<string, number>;
  } {
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    
    // Analyze query types based on reasoning
    const queryTypes: Record<string, number> = {};
    results.forEach(result => {
      const type = result.reasoning.split(' ')[1] || 'unknown'; // Extract query type
      queryTypes[type] = (queryTypes[type] || 0) + 1;
    });
    
    return {
      totalQueries: results.length,
      totalCost,
      totalTokens,
      averageCostPerQuery: totalCost / results.length,
      averageTokensPerQuery: totalTokens / results.length,
      queryTypes
    };
  }
}

export const enhancedQueryEngine = new EnhancedQueryEngine(); 