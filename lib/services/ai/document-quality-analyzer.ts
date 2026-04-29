/**
 * Document Quality Analyzer Service
 * 
 * Analyzes document chapters against predefined definitions and quality standards
 * using AI to identify issues, mistakes, and provide improvement suggestions.
 */

import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/config/ai-config';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChapterDefinition {
  id: string;
  chapter_name: string;
  chapter_number?: string;
  title: string;
  description?: string;
  required_content: string;
  common_mistakes?: string[];
  min_word_count?: number;
  max_word_count?: number;
  required_sections?: string[];
  required_keywords?: string[];
}

export interface AnalysisIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type: 
    | 'missing_content'
    | 'incorrect_format'
    | 'style_issue'
    | 'missing_keyword'
    | 'word_count'
    | 'structure_problem'
    | 'clarity_issue'
    | 'compliance_issue'
    | 'missing_section';
  title: string;
  description: string;
  location?: string;
  suggestion?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
}

export interface AnalysisSuggestion {
  id: string;
  type: 'improvement' | 'addition' | 'clarification';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  overall_status: 'pass' | 'warning' | 'error';
  confidence_score: number; // 0 to 1
  issues: AnalysisIssue[];
  suggestions: AnalysisSuggestion[];
  completeness_score: number; // 0 to 1
  quality_score: number; // 0 to 1
  compliance_score: number; // 0 to 1
  word_count: number;
  ai_tokens_used: number;
  ai_cost_usd: number;
}

// ============================================================================
// Zod Schema for Structured Output
// ============================================================================

const IssueSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  issue_type: z.enum([
    'missing_content',
    'incorrect_format',
    'style_issue',
    'missing_keyword',
    'word_count',
    'structure_problem',
    'clarity_issue',
    'compliance_issue',
    'missing_section'
  ]),
  title: z.string(),
  description: z.string(),
  location: z.string().optional(),
  suggestion: z.string().optional(),
});

const SuggestionSchema = z.object({
  type: z.enum(['improvement', 'addition', 'clarification']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

const AnalysisOutputSchema = z.object({
  overall_assessment: z.string().describe('Brief overall assessment of the chapter quality'),
  issues: z.array(IssueSchema).describe('List of identified issues and problems'),
  suggestions: z.array(SuggestionSchema).describe('List of improvement suggestions'),
  completeness_score: z.number().min(0).max(1).describe('How complete is the content (0-1)'),
  quality_score: z.number().min(0).max(1).describe('Overall quality of writing (0-1)'),
  compliance_score: z.number().min(0).max(1).describe('Compliance with requirements (0-1)'),
  confidence: z.number().min(0).max(1).describe('Confidence in this analysis (0-1)'),
});

type AIAnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// ============================================================================
// Document Quality Analyzer Service
// ============================================================================

export class DocumentQualityAnalyzer {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });
  }

  /**
   * Analyze a document chapter against its definition
   */
  async analyzeChapter(
    chapterContent: string,
    chapterDefinition: ChapterDefinition
  ): Promise<AnalysisResult> {
    console.log(`🔍 Analyzing chapter: ${chapterDefinition.chapter_name}`);

    // Step 1: Basic validation
    const wordCount = this.countWords(chapterContent);
    const basicIssues = this.performBasicChecks(chapterContent, chapterDefinition, wordCount);

    // Step 2: AI-powered deep analysis
    const aiAnalysis = await this.performAIAnalysis(chapterContent, chapterDefinition);

    if (!aiAnalysis) {
      // Fallback: return basic checks only
      return this.createFallbackResult(basicIssues, wordCount);
    }

    // Step 3: Combine basic checks with AI analysis
    const allIssues = [
      ...basicIssues,
      ...aiAnalysis.issues.map(issue => ({
        ...issue,
        id: this.generateUUID(),
        status: 'open' as const,
      }))
    ];

    const allSuggestions = aiAnalysis.suggestions.map(suggestion => ({
      ...suggestion,
      id: this.generateUUID(),
    }));

    // Step 4: Determine overall status
    const criticalIssueCount = allIssues.filter(i => i.severity === 'critical').length;
    const highIssueCount = allIssues.filter(i => i.severity === 'high').length;
    
    let overall_status: 'pass' | 'warning' | 'error';
    if (criticalIssueCount > 0 || highIssueCount >= 3) {
      overall_status = 'error';
    } else if (highIssueCount > 0 || allIssues.length >= 5) {
      overall_status = 'warning';
    } else {
      overall_status = 'pass';
    }

    console.log(`✅ Analysis complete: ${overall_status} (${allIssues.length} issues, ${allSuggestions.length} suggestions)`);

    return {
      overall_status,
      confidence_score: aiAnalysis.confidence,
      issues: allIssues,
      suggestions: allSuggestions,
      completeness_score: aiAnalysis.completeness_score,
      quality_score: aiAnalysis.quality_score,
      compliance_score: aiAnalysis.compliance_score,
      word_count: wordCount,
      ai_tokens_used: aiAnalysis.tokens_used || 0,
      ai_cost_usd: aiAnalysis.cost_usd || 0,
    };
  }

  /**
   * Perform basic automated checks (no AI required)
   */
  private performBasicChecks(
    content: string,
    definition: ChapterDefinition,
    wordCount: number
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Check word count
    if (definition.min_word_count && wordCount < definition.min_word_count) {
      issues.push({
        id: this.generateUUID(),
        severity: 'high',
        issue_type: 'word_count',
        title: 'Content too short',
        description: `Chapter has ${wordCount} words but requires minimum ${definition.min_word_count} words.`,
        suggestion: `Add approximately ${definition.min_word_count - wordCount} more words to meet the minimum requirement.`,
        status: 'open',
      });
    }

    if (definition.max_word_count && wordCount > definition.max_word_count) {
      issues.push({
        id: this.generateUUID(),
        severity: 'medium',
        issue_type: 'word_count',
        title: 'Content too long',
        description: `Chapter has ${wordCount} words but maximum is ${definition.max_word_count} words.`,
        suggestion: `Consider condensing the content by approximately ${wordCount - definition.max_word_count} words.`,
        status: 'open',
      });
    }

    // Check for required keywords
    if (definition.required_keywords && definition.required_keywords.length > 0) {
      const lowerContent = content.toLowerCase();
      const missingKeywords = definition.required_keywords.filter(
        keyword => !lowerContent.includes(keyword.toLowerCase())
      );

      if (missingKeywords.length > 0) {
        issues.push({
          id: this.generateUUID(),
          severity: 'medium',
          issue_type: 'missing_keyword',
          title: 'Missing required keywords',
          description: `The following required keywords are missing: ${missingKeywords.join(', ')}`,
          suggestion: `Ensure these keywords are naturally incorporated into the content: ${missingKeywords.join(', ')}`,
          status: 'open',
        });
      }
    }

    // Check for empty content
    if (content.trim().length === 0) {
      issues.push({
        id: this.generateUUID(),
        severity: 'critical',
        issue_type: 'missing_content',
        title: 'Chapter is empty',
        description: 'This chapter contains no content.',
        suggestion: `Add content according to the chapter definition: ${definition.required_content}`,
        status: 'open',
      });
    }

    return issues;
  }

  /**
   * Perform AI-powered deep analysis
   */
  private async performAIAnalysis(
    content: string,
    definition: ChapterDefinition
  ): Promise<(AIAnalysisOutput & { tokens_used: number; cost_usd: number }) | null> {
    try {
      // Build the analysis prompt
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(content, definition);

      const completion = await this.client.beta.chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: zodResponseFormat(AnalysisOutputSchema, 'document_analysis'),
        temperature: 0.3, // Lower temperature for consistent analysis
      });

      const parsedResult = completion.choices[0].message.parsed;
      const tokensUsed = completion.usage?.total_tokens || 0;
      const costUsd = tokensUsed * AI_CONFIG.costs.chatPricePerToken;

      if (!parsedResult) {
        console.error('Failed to parse AI analysis result');
        return null;
      }

      return {
        ...parsedResult,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
      };

    } catch (error) {
      console.error('Error performing AI analysis:', error);
      return null;
    }
  }

  /**
   * Build system prompt for AI analysis
   */
  private buildSystemPrompt(): string {
    return `You are an expert document quality analyst specializing in Danish architecture and construction documentation.

Your task is to analyze document chapters and identify issues, mistakes, and areas for improvement.

ANALYSIS GUIDELINES:
- Be thorough but fair in your assessment
- Focus on substantial issues, not minor style preferences
- Provide constructive, actionable feedback
- Consider Danish construction industry standards and practices
- Evaluate clarity, completeness, and compliance with requirements

SEVERITY LEVELS:
- CRITICAL: Missing essential content, major compliance issues
- HIGH: Important content missing or incorrect, significant quality issues
- MEDIUM: Minor content issues, style problems, clarity concerns
- LOW: Suggestions for improvement, minor enhancements

Be specific about locations when possible, and always provide helpful suggestions for improvement.`;
  }

  /**
   * Build user prompt with chapter content and definition
   */
  private buildUserPrompt(content: string, definition: ChapterDefinition): string {
    let prompt = `Please analyze the following document chapter:\n\n`;
    prompt += `**Chapter: ${definition.chapter_name}**\n`;
    if (definition.chapter_number) {
      prompt += `**Chapter Number: ${definition.chapter_number}**\n`;
    }
    prompt += `\n**Chapter Definition:**\n${definition.required_content}\n\n`;

    if (definition.required_sections && definition.required_sections.length > 0) {
      prompt += `**Required Sections:**\n`;
      definition.required_sections.forEach(section => {
        prompt += `- ${section}\n`;
      });
      prompt += `\n`;
    }

    if (definition.common_mistakes && definition.common_mistakes.length > 0) {
      prompt += `**Common Mistakes to Watch For:**\n`;
      definition.common_mistakes.forEach(mistake => {
        prompt += `- ${mistake}\n`;
      });
      prompt += `\n`;
    }

    prompt += `**Actual Chapter Content:**\n\`\`\`\n${content}\n\`\`\`\n\n`;
    prompt += `Analyze this content and provide:
1. Issues and problems (with severity, type, description, location, and suggestions)
2. Improvement suggestions
3. Scores for completeness, quality, and compliance (0-1 scale)
4. Your confidence in this analysis (0-1 scale)`;

    return prompt;
  }

  /**
   * Create fallback result when AI analysis fails
   */
  private createFallbackResult(basicIssues: AnalysisIssue[], wordCount: number): AnalysisResult {
    return {
      overall_status: basicIssues.length > 0 ? 'warning' : 'pass',
      confidence_score: 0.5, // Low confidence for basic checks only
      issues: basicIssues,
      suggestions: [],
      completeness_score: 0.5,
      quality_score: 0.5,
      compliance_score: 0.5,
      word_count: wordCount,
      ai_tokens_used: 0,
      ai_cost_usd: 0,
    };
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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
}

// Singleton instance
export const documentQualityAnalyzer = new DocumentQualityAnalyzer();
