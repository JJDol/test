import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { ChatRequest, ChatResponse } from '@/lib/types/types';
import { openaiService } from '@/lib/services/ai/openai-client';
import { enhancedQueryEngine } from '@/lib/services/ai/enhanced-query-engine';
import { projectContextService, ProjectContextService } from '@/lib/services/ai/project-context';

export const maxDuration = 60;

/**
 * Semantic Chat API Route
 * 
 * PURPOSE: AI-powered chat interface for construction project queries
 * - Handles both document/regulation queries and project data queries
 * - Routes queries to appropriate engines (enhanced query vs project context)
 * - Maintains chat session history and context
 * - Part of unified semantic system for AI operations
 * 
 * TODO:
 * - Consider using MCP for Supabase queries (with multitenancy care)
 * - Verify enhanced query engine decision logic
 * - Optimize query routing and context fetching
 * - Integrate with unified file management system
 * 
 * ROUTE: /api/semantic/chat
 */

// Helper function to detect pure project data queries
function isPureProjectDataQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const projectDataPatterns = [
    /how many.*projects?/,
    /number of.*projects?/,
    /list.*projects?/,
    /active projects?/,
    /my projects?/,
    /company projects?/,
    /project status/,
    /project count/,
    /projects? (do|does) (i|we) have/,
    /what projects?.*working on/,
    /current projects?/,
    /ongoing projects?/,
    /project overview/,
    /show.*projects?/,
    /projects? assigned/,
    /project team/,
    /project members/,
  ];
  
  return projectDataPatterns.some(pattern => pattern.test(lowerMessage));
}

function isOnTopicQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const allowedTopics = [
    // Construction & architecture
    'build', 'construct', 'architect', 'design', 'structur', 'foundation',
    'concrete', 'steel', 'timber', 'insulation', 'facade', 'roof',
    'wall', 'floor', 'ceiling', 'beam', 'column', 'load', 'bearing',
    'ventilation', 'hvac', 'plumbing', 'electrical', 'drainage',
    'fire', 'safety', 'escape', 'sprinkler', 'smoke',
    'energy', 'thermal', 'u-value', 'heat', 'cooling',
    'acoustic', 'sound', 'noise', 'lyd',
    'access', 'elevator', 'stair', 'ramp', 'handicap', 'disability',
    'parking', 'landscape', 'terrain', 'site',

    // Regulations & standards
    'br18', 'regulation', 'code', 'requirement', 'standard', 'compliance',
    'bygningsreglement', 'paragraph', '§', 'section', 'rule',
    'permit', 'approval', 'inspection', 'certificate', 'authority',
    'eurocode', 'ds ', 'en ', 'iso',
    'annex', 'bilag', 'vejledning', 'guideline',

    // Danish building terms
    'konstruktion', 'brand', 'energi', 'adgang', 'affald', 'afløb',
    'indretning', 'legeplads', 'udsyn', 'vand', 'fugt', 'vådrum',
    'byggeri', 'bygning', 'bygge', 'bolig',
    'ophævet', 'gældende', 'krav', 'bestemmelse',

    // Project management
    'project', 'deadline', 'progress', 'team', 'leader', 'worker',
    'template', 'document', 'variable', 'category', 'assignment',
    'kanban', 'status', 'stage', 'milestone', 'task', 'schedule',
    'company', 'member', 'colleague', 'capacity', 'workload',

    // Document queries
    'file', 'upload', 'document', 'report', 'template', 'docx', 'pdf',
    'content', 'contains', 'search', 'find',

    // General assistant interactions (greetings, help)
    'hello', 'hi', 'hey', 'help', 'what can you', 'who are you',
    'how do you', 'thank', 'thanks', 'hej', 'tak',
  ];

  return allowedTopics.some(topic => lowerMessage.includes(topic));
}

const OFF_TOPIC_RESPONSE = `I'm sorry, but I can only help with topics related to:

• **Construction & Architecture** — building design, materials, structural engineering
• **Danish Building Regulations (BR18)** — requirements, compliance, specific paragraphs
• **Your Projects** — project status, team, deadlines, documents, templates

Please ask me something related to these areas and I'll be happy to help!`;
// TODO: Verify this logic behind the decision to use enhanced query engine
// TODO: Consider using MCP for supabase so the queries are better optimized for question - CAREFUL with multitenancy, maybe we have to use different separation method
async function chatHandler(request: AuthenticatedRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { message, session_id } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Reject off-topic queries before any expensive processing
    if (!isOnTopicQuery(message)) {
      const supabase = await createClient();

      let currentSessionId = session_id;
      if (!currentSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            company_id: request.user.company_id,
            user_id: request.user.id,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (sessionError) throw sessionError;
        currentSessionId = newSession.id;
      }

      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'user',
        content: message,
        metadata: { timestamp: new Date().toISOString(), user_id: request.user.id },
      });

      const { data: assistantMsg } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: OFF_TOPIC_RESPONSE,
          sources: [],
          metadata: { off_topic: true, response_time_ms: Date.now() - startTime },
        })
        .select()
        .single();

      return NextResponse.json({
        message_id: assistantMsg?.id || '',
        session_id: currentSessionId!,
        content: OFF_TOPIC_RESPONSE,
        sources: [],
        metadata: {
          tokens_used: 0,
          response_time_ms: Date.now() - startTime,
          model_used: 'none',
        },
      } as ChatResponse);
    }

    const supabase = await createClient();

    // Step 1: Get or create chat session
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          company_id: request.user.company_id,
          user_id: request.user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
    }

    // Step 2: Save user message to database
    const { data: userMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: message,
        metadata: {
          timestamp: new Date().toISOString(),
          user_id: request.user.id,
        },
      })
      .select()
      .single();

    if (userMessageError) throw userMessageError;

    // Step 3: Classify query type and fetch appropriate context
    const isProjectQuery = ProjectContextService.isProjectQuery(message);
    const isProjectDataQuery = isPureProjectDataQuery(message);
    
    let projectContextText = '';
    let searchResult: any = null;
    let sources: any[] = [];
    
    if (isProjectQuery) {
      console.log('🏗️ Detected project query, fetching project context...');
      try {
        const projectContext = await projectContextService.getProjectContext(request.user);
        projectContextText = ProjectContextService.formatContextForAI(projectContext, request.user);
      } catch (error) {
        console.error('⚠️ Error fetching project context:', error);
        // Continue without project context if there's an error
      }
    }

    // Step 4: Only search documents if it's NOT a pure project data query
    if (!isProjectDataQuery) {
      console.log('🔍 Using enhanced query engine for document search...');
      
      // Ensure company_id exists for tenant filtering
      if (!request.user.company_id) {
        throw new Error('User must have company_id for document search');
      }
      
      searchResult = await enhancedQueryEngine.search(
        message,
        request.user.company_id,
        {
          initialSearchLimit: 15, // Reasonable limit for chat
          finalResultLimit: 5,    // Top 5 for context
          includeInactiveContent: false
        }
      );

      sources = searchResult.sources;
    } else {
      console.log('📊 Pure project data query - skipping document search');
      // Create a mock search result for consistency
      searchResult = {
        sources: [],
        response: '',
        reasoning: 'Pure project data query - no document search performed',
        tokensUsed: 0,
        cost: 0
      };
    }

    // Step 5: Generate AI response (enhanced logic)
    let finalResponse: string;
    let totalTokensUsed = searchResult.tokensUsed;
    let totalCost = searchResult.cost;

    if (searchResult.sources.length > 0 && searchResult.response && !isProjectQuery) {
      // Use the enhanced search response if it's a pure document query
      finalResponse = searchResult.response;
      console.log('🎯 Using enhanced search response directly');
    } else {
      // Generate custom response for project queries or when we need to combine contexts
      console.log('🤖 Generating custom AI response with combined context...');
      
      const documentContext = sources.length > 0 
        ? sources.map(source => `Document: ${source.document_name}\nContent: ${source.text_snippet}`).join('\n\n')
        : '';

      // Combine project context and document context
      let combinedContext = '';
      if (projectContextText) {
        combinedContext += `PROJECT DATA:\n${projectContextText}\n\n`;
      }
      if (documentContext) {
        combinedContext += `DOCUMENT KNOWLEDGE BASE:\n${documentContext}`;
      }
      
      if (!combinedContext) {
        combinedContext = 'No specific project data or documents found in the knowledge base.';
      }

      console.log(`📝 Context length: ${combinedContext.length} characters`);
      console.log(`📊 Sources found: ${sources.length}`);
      
      let systemPrompt: string;
      // TODO: Test different prompts for different queries,assess the quality of the response
      const domainGuardrail = `
IMPORTANT RESTRICTION: You are ONLY allowed to answer questions about:
1. Construction, architecture, and building engineering
2. Danish Building Regulations (BR18 / Bygningsreglementet) and related standards
3. Project management data from the user's company
If a question is outside these domains, politely decline and explain what topics you can help with.`;

      if (isProjectDataQuery) {
        systemPrompt = `You are an AI assistant for construction project management with access to project data from the company database.
${domainGuardrail}

Context available:
${combinedContext}

Instructions:
- Use ONLY the PROJECT DATA provided to answer questions
- Do NOT cite or reference any document sources
- Focus on project counts, statuses, assignments, and team information
- Be direct and factual about project information
- If project data is not available, clearly state this
- Do not make assumptions about projects not in the data`;
      } else {
        systemPrompt = `You are an AI assistant for the construction industry with access to Danish building regulations (BR18) and project data.
${domainGuardrail}

Context available:
${combinedContext}

Instructions:
- ALWAYS use the provided DOCUMENT KNOWLEDGE BASE when available to answer questions
- The documents may be in Danish - translate and explain the content in English
- For BR18/building regulation questions, reference the specific sections (§) mentioned in the documents
- Quote relevant parts of the regulations and explain their meaning
- If asking about "my projects" vs "company projects", use PROJECT DATA appropriately  
- Be specific and cite the exact sources provided
- If you have relevant BR18 content, use it even if it's in Danish
- Focus on construction, architecture, and building regulations
- When referencing regulations, include the section numbers (like § 49, § 50, etc.)
- If no relevant data is available, state this clearly`;
      }

      const aiResponse = await openaiService.generateChatResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]);
      // TODO: Test different models, assess the quality of the response
      // TODO: Right now we are using the cheapest option, discuss with the team if we should use a more expensive model
      finalResponse = aiResponse.content;
      totalTokensUsed += aiResponse.tokensUsed;
      totalCost += aiResponse.tokensUsed * 0.0000005; // gpt-3.5-turbo cost
    }

    // Step 6: Save AI response to database
    const responseTime = Date.now() - startTime;
    const sourcesToSave = isProjectDataQuery ? [] : sources; // Don't save sources for project data queries
    
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: finalResponse,
        sources: sourcesToSave,
        metadata: {
          tokens_used: totalTokensUsed,
          response_time_ms: responseTime,
          model_used: 'enhanced_pipeline',
          sources_count: sourcesToSave.length,
          has_project_context: isProjectQuery,
          is_project_data_query: isProjectDataQuery,
          search_reasoning: searchResult.reasoning,
          total_cost: totalCost,
        } as any,
      })
      .select()
      .single();

    if (assistantMessageError) throw assistantMessageError;

    // Step 7: Update session timestamp
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', currentSessionId);

    // Step 8: Return response
    const response: ChatResponse = {
      message_id: assistantMessage.id,
      session_id: currentSessionId!,
      content: finalResponse,
      sources: sourcesToSave, // Only return sources for document queries
      metadata: {
        tokens_used: totalTokensUsed,
        response_time_ms: responseTime,
        model_used: 'enhanced_pipeline',
        search_reasoning: searchResult.reasoning,
        total_cost: totalCost,
        is_project_data_query: isProjectDataQuery,
      } as any,
    };

    const queryTypeLog = isProjectDataQuery ? ' (project data query - no sources)' : isProjectQuery ? ' (with project context)' : '';
    console.log(`✅ Enhanced chat completed in ${responseTime}ms, ${totalTokensUsed} tokens used, $${totalCost.toFixed(6)} cost${queryTypeLog}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Chat API error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'OpenAI API authentication failed' },
          { status: 502 }
        );
      }
      
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(chatHandler); 