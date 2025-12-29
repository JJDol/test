// TODO: Investigate this whole file
import { openaiService } from './openai-client';
import { qdrantService } from '@/lib/services/integrations/qdrant-client';
import { AI_CONFIG } from '@/lib/config/ai-config';

export interface ProcessedChunk {
  text: string;
  metadata: Record<string, any>;
  embedding: number[];
  extractedFacts?: string[];
  generatedQuestions?: string[];
}

export interface DocumentNode {
  text: string;
  metadata: Record<string, any>;
  relationships: {
    parent?: string;
    children?: string[];
  };
}

export class EnhancedDocumentProcessor {
  private readonly STATEMENT_OF_FACT_PROMPT = `Context:
{context}

Extract {num_statements} simple facts about building regulations from the context above.
Each fact should be a complete sentence.
Focus on:
- Requirements
- Measurements  
- Standards
- Rules

Format each fact on a new line starting with a quote mark like this:
"The minimum ceiling height must be 2.3 meters."
"Fire doors must be self-closing."
"Ventilation must provide fresh air at 0.3 l/s per m²."

Facts:`;

  private readonly QUESTION_GENERATION_PROMPT = `Context:
{context}

Generate {num_questions} simple questions about building regulations and requirements from the context above.
Each question should be a complete sentence.
Focus on:
- Building requirements
- Technical specifications
- Regulatory rules
- Construction standards

Format each question on a new line starting with a quote mark like this:
"What is the minimum ceiling height requirement?"
"What type of fire doors are required?"
"How should ventilation be implemented?"

Questions:`;

  /**
   * Smart text chunking with sentence awareness (ported from LlamaIndex logic)
   */
  async smartChunkText(text: string, metadata: Record<string, any> = {}): Promise<DocumentNode[]> {
    const chunkSize = AI_CONFIG.processing.chunkSize; // 1000 chars
    const chunkOverlap = AI_CONFIG.processing.chunkOverlap; // 200 chars
    
    // Split by sentences first to avoid breaking mid-sentence
    const sentences = this.splitIntoSentences(text);
    const chunks: DocumentNode[] = [];
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed chunk size, finalize current chunk
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunk_index: chunkIndex,
            text_length: currentChunk.length,
            chunk_type: 'text'
          },
          relationships: {}
        });
        
        // Start new chunk with overlap from previous chunk
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + sentence;
        chunkIndex++;
      } else {
        currentChunk += sentence;
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunk_index: chunkIndex,
          text_length: currentChunk.length,
          chunk_type: 'text'
        },
        relationships: {}
      });
    }
    
    return this.filterEmptyAndShortChunks(chunks);
  }

  /**
   * Extract factual statements using OpenAI (ported from StatementOfFactExtractor)
   */
  async extractFactualStatements(node: DocumentNode, numStatements: number = 5): Promise<string[]> {
    try {
      const prompt = this.STATEMENT_OF_FACT_PROMPT
        .replace('{context}', node.text)
        .replace('{num_statements}', numStatements.toString());

      const response = await openaiService.generateChatResponse([
        { role: 'system', content: 'You are an expert at extracting factual statements from building regulation documents.' },
        { role: 'user', content: prompt }
      ], 500); // Keep token limit low for cost

      return this.parseQuotedStatements(response.content);
    } catch (error) {
      console.error('Error extracting factual statements:', error);
      return [];
    }
  }

  /**
   * Generate questions from content (ported from backend logic)
   */
  async generateQuestions(node: DocumentNode, numQuestions: number = 3): Promise<string[]> {
    try {
      const prompt = this.QUESTION_GENERATION_PROMPT
        .replace('{context}', node.text)
        .replace('{num_questions}', numQuestions.toString());

      const response = await openaiService.generateChatResponse([
        { role: 'system', content: 'You are an expert at generating relevant questions about building regulations.' },
        { role: 'user', content: prompt }
      ], 300); // Keep token limit low for cost

      return this.parseQuotedStatements(response.content);
    } catch (error) {
      console.error('Error generating questions:', error);
      return [];
    }
  }

  /**
   * Full document processing pipeline (ported from build_ingestion_pipeline)
   */
  async processDocument(
    documentId: string,
    companyId: string | null,
    sourceType: 'br18' | 'upload' | 'template',
    text: string,
    metadata: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    chunksProcessed: number;
    pointIds: string[];
    totalCost: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      chunksProcessed: 0,
      pointIds: [] as string[],
      totalCost: 0,
      errors: [] as string[]
    };

    try {
      console.log(`🔄 Processing document ${documentId} with enhanced pipeline...`);

      // Step 1: Smart chunking
      const chunks = await this.smartChunkText(text, metadata);
      console.log(`📄 Created ${chunks.length} smart chunks`);

      // Step 2: Process each chunk with enhancements
      const processedChunks: ProcessedChunk[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔍 Processing chunk ${i + 1}/${chunks.length}`);

        try {
          // Generate embedding
          const embedding = await openaiService.generateEmbedding(chunk.text);
          // TODO: Look at this reasoning

          //
          // Extract facts (only for substantial chunks to save costs)
          let extractedFacts: string[] = [];
          if (chunk.text.length > 100 && sourceType === 'br18') {
            extractedFacts = await this.extractFactualStatements(chunk, 3);
          }

          // Generate questions (only for BR18 content to save costs)
          let generatedQuestions: string[] = [];
          if (chunk.text.length > 100 && sourceType === 'br18' && extractedFacts.length > 0) {
            generatedQuestions = await this.generateQuestions(chunk, 2);
          }

          processedChunks.push({
            text: chunk.text,
            metadata: {
              ...chunk.metadata,
              extracted_facts: extractedFacts,
              generated_questions: generatedQuestions,
              enhancement_applied: extractedFacts.length > 0 || generatedQuestions.length > 0
            },
            embedding,
            extractedFacts,
            generatedQuestions
          });

          // Estimate cost (rough calculation)
          const estimatedTokens = Math.ceil(chunk.text.length / 4);
          result.totalCost += estimatedTokens * AI_CONFIG.costs.embeddingPricePerToken;
          
          if (extractedFacts.length > 0 || generatedQuestions.length > 0) {
            result.totalCost += 100 * AI_CONFIG.costs.chatPricePerToken; // Rough estimate for LLM calls
          }

        } catch (error) {
          console.error(`❌ Error processing chunk ${i + 1}:`, error);
          result.errors.push(`Chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 3: Store in Qdrant
      if (processedChunks.length > 0) {
        const pointIds = await qdrantService.upsertDocumentChunks(
          documentId,
          companyId,
          sourceType,
          processedChunks
        );
        
        result.pointIds = pointIds;
        result.chunksProcessed = processedChunks.length;
      }

      console.log(`✅ Document processing completed: ${result.chunksProcessed} chunks, $${result.totalCost.toFixed(6)} cost`);
      
    } catch (error) {
      console.error('❌ Document processing failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Utility methods (ported from backend)
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with more sophisticated logic
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.');
  }

  private getOverlapText(text: string, overlapLength: number): string {
    if (text.length <= overlapLength) return text;
    
    // Try to find a good breaking point (sentence end) within overlap region
    const overlapRegion = text.slice(-overlapLength);
    const sentenceEnd = overlapRegion.lastIndexOf('.');
    
    if (sentenceEnd > overlapLength / 2) {
      return text.slice(-(overlapLength - sentenceEnd));
    }
    
    return text.slice(-overlapLength);
  }

  private filterEmptyAndShortChunks(chunks: DocumentNode[]): DocumentNode[] {
    return chunks.filter(chunk => {
      const text = chunk.text.trim();
      const wordCount = text.split(/\s+/).length;
      return text.length > 10 && wordCount >= 3; // Minimum viable chunk
    });
  }

  private parseQuotedStatements(response: string): string[] {
    const lines = response.split('\n').map(line => line.trim()).filter(line => line);
    const statements: string[] = [];
    
    for (const line of lines) {
      // Extract content within quotes
      const matches = line.match(/"([^"]+)"/);
      if (matches && matches[1]) {
        statements.push(matches[1].trim());
        continue;
      }
      
      // Fallback: if line starts with dash or number, extract content
      if (/^[-\d\s]/.test(line)) {
        const content = line.replace(/^[-\d\s]*/, '').trim();
        if (content) {
          statements.push(content);
        }
      }
    }
    
    return statements.filter(s => s.length > 5); // Filter out very short statements
  }
}

export const enhancedDocumentProcessor = new EnhancedDocumentProcessor(); 