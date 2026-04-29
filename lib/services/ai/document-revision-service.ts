/**
 * Document Revision Service
 * 
 * Generates AI-powered revision suggestions for document text
 * with multiple alternatives for comparison and selection.
 */

import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/config/ai-config';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RevisionContext {
  documentType?: string; // e.g., "architecture", "constructions"
  chapterName?: string;
  chapterPurpose?: string; // What this chapter should accomplish
  targetAudience?: string; // Who will read this
  tone?: 'formal' | 'professional' | 'technical' | 'simple';
  improvementFocus?: ('clarity' | 'completeness' | 'conciseness' | 'technical-accuracy' | 'style')[];
}

export interface RevisionAlternative {
  id: string;
  revised_text: string;
  changes_summary: string; // Brief explanation of what changed
  improvements: string[]; // List of specific improvements made
  reasoning: string; // Why these changes improve the text
  confidence: number; // 0 to 1
}

export interface RevisionResult {
  original_text: string;
  alternatives: RevisionAlternative[];
  overall_assessment: string;
  tokens_used: number;
  cost_usd: number;
}

// ============================================================================
// Zod Schema for Structured Output
// ============================================================================

const RevisionAlternativeSchema = z.object({
  revised_text: z.string().describe('The revised version of the text'),
  changes_summary: z.string().describe('Brief summary of what was changed (e.g., "Improved clarity, added technical details")'),
  improvements: z.array(z.string()).describe('List of specific improvements made'),
  reasoning: z.string().describe('Why these changes make the text better'),
  confidence: z.number().min(0).max(1).describe('Confidence in this revision (0-1)'),
});

const RevisionOutputSchema = z.object({
  overall_assessment: z.string().describe('Brief assessment of the original text and revision opportunities'),
  alternatives: z.array(RevisionAlternativeSchema).min(1).max(3).describe('1-3 alternative revisions'),
});

type AIRevisionOutput = z.infer<typeof RevisionOutputSchema>;

// ============================================================================
// Document Revision Service
// ============================================================================

export class DocumentRevisionService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });
  }

  /**
   * Generate revision suggestions for a piece of text
   */
  async generateRevisions(
    originalText: string,
    context: RevisionContext = {},
    numberOfAlternatives: number = 2
  ): Promise<RevisionResult> {
    console.log(`✍️  Generating ${numberOfAlternatives} revision alternative(s)...`);

    if (!originalText || originalText.trim().length < 20) {
      throw new Error('Text is too short for revision (minimum 20 characters)');
    }

    if (numberOfAlternatives < 1 || numberOfAlternatives > 3) {
      throw new Error('Number of alternatives must be between 1 and 3');
    }

    const aiOutput = await this.performAIRevision(originalText, context, numberOfAlternatives);

    const alternatives = aiOutput.alternatives.map((alt, index) => ({
      id: this.generateUUID(),
      ...alt,
    }));

    console.log(`✅ Generated ${alternatives.length} revision alternatives`);

    return {
      original_text: originalText,
      alternatives,
      overall_assessment: aiOutput.overall_assessment,
      tokens_used: aiOutput.tokens_used,
      cost_usd: aiOutput.cost_usd,
    };
  }

  /**
   * Perform AI-powered revision generation
   */
  private async performAIRevision(
    text: string,
    context: RevisionContext,
    numberOfAlternatives: number
  ): Promise<AIRevisionOutput & { tokens_used: number; cost_usd: number }> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(text, context, numberOfAlternatives);

      const completion = await this.client.beta.chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: zodResponseFormat(RevisionOutputSchema, 'document_revision'),
        temperature: 0.7, // Higher temperature for creative revisions
      });

      const parsedResult = completion.choices[0].message.parsed;
      const tokensUsed = completion.usage?.total_tokens || 0;
      const costUsd = tokensUsed * AI_CONFIG.costs.chatPricePerToken;

      if (!parsedResult) {
        throw new Error('Failed to parse AI revision result');
      }

      return {
        ...parsedResult,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
      };

    } catch (error) {
      console.error('Error performing AI revision:', error);
      throw new Error(`AI revision failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt for AI revision
   */
  private buildSystemPrompt(context: RevisionContext): string {
    let prompt = `You are an expert technical writer specializing in Danish architecture and construction documentation.

Your task is to improve and revise document text while maintaining accuracy and professionalism.

REVISION GUIDELINES:
- Preserve all factual information and technical details
- Improve clarity, readability, and structure
- Use appropriate technical terminology
- Follow Danish construction industry writing standards
- Maintain a ${context.tone || 'professional'} tone
- Write in Danish when the original text is in Danish`;

    if (context.improvementFocus && context.improvementFocus.length > 0) {
      prompt += `\n\nFOCUS AREAS:\n`;
      context.improvementFocus.forEach(focus => {
        switch (focus) {
          case 'clarity':
            prompt += `- CLARITY: Make the text easier to understand, remove ambiguity\n`;
            break;
          case 'completeness':
            prompt += `- COMPLETENESS: Ensure all necessary information is included\n`;
            break;
          case 'conciseness':
            prompt += `- CONCISENESS: Remove redundancy, make text more concise\n`;
            break;
          case 'technical-accuracy':
            prompt += `- TECHNICAL ACCURACY: Ensure technical terms and details are precise\n`;
            break;
          case 'style':
            prompt += `- STYLE: Improve writing style and flow\n`;
            break;
        }
      });
    }

    if (context.targetAudience) {
      prompt += `\n\nTARGET AUDIENCE: ${context.targetAudience}`;
    }

    prompt += `\n\nProvide meaningful improvements that genuinely enhance the text quality.
Each alternative should have a distinct approach or emphasis.`;

    return prompt;
  }

  /**
   * Build user prompt with text to revise
   */
  private buildUserPrompt(
    text: string,
    context: RevisionContext,
    numberOfAlternatives: number
  ): string {
    let prompt = `Please revise the following text:\n\n`;

    if (context.documentType) {
      prompt += `**Document Type:** ${context.documentType}\n`;
    }
    if (context.chapterName) {
      prompt += `**Chapter:** ${context.chapterName}\n`;
    }
    if (context.chapterPurpose) {
      prompt += `**Purpose:** ${context.chapterPurpose}\n`;
    }

    prompt += `\n**Original Text:**\n\`\`\`\n${text}\n\`\`\`\n\n`;

    prompt += `Provide ${numberOfAlternatives} alternative revision(s) that improve this text.

For each alternative:
1. Provide the complete revised text
2. Summarize the main changes made
3. List specific improvements
4. Explain why these changes improve the text
5. Rate your confidence in this revision (0-1)

Make sure each alternative is meaningfully different and represents a distinct improvement approach.`;

    return prompt;
  }

  /**
   * Generate UUID (simple version)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Compare two texts and highlight differences (simple version)
   */
  getDifferenceSummary(original: string, revised: string): {
    added_words: number;
    removed_words: number;
    changed_words: number;
    similarity_score: number;
  } {
    const originalWords = original.toLowerCase().split(/\s+/);
    const revisedWords = revised.toLowerCase().split(/\s+/);

    const originalSet = new Set(originalWords);
    const revisedSet = new Set(revisedWords);

    const added = revisedWords.filter(w => !originalSet.has(w)).length;
    const removed = originalWords.filter(w => !revisedSet.has(w)).length;
    const common = originalWords.filter(w => revisedSet.has(w)).length;

    const similarity = common / Math.max(originalWords.length, revisedWords.length);

    return {
      added_words: added,
      removed_words: removed,
      changed_words: added + removed,
      similarity_score: similarity,
    };
  }
}

// Singleton instance
export const documentRevisionService = new DocumentRevisionService();
