import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/config/ai-config';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: AI_CONFIG.openai.models.embedding,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error);
      throw error;
    }
  }

  async generateChatResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens: number = AI_CONFIG.openai.maxTokens.chat
  ): Promise<{
    content: string;
    tokensUsed: number;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: AI_CONFIG.openai.models.chat,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      return {
        content: response.choices[0].message.content || '',
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error('❌ Error generating chat response:', error);
      throw error;
    }
  }

  async chunkText(text: string): Promise<string[]> {
    const chunkSize = AI_CONFIG.processing.chunkSize;
    const overlap = AI_CONFIG.processing.chunkOverlap;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  estimateCost(tokens: number, type: 'embedding' | 'chat'): number {
    const pricePerToken = type === 'embedding' 
      ? AI_CONFIG.costs.embeddingPricePerToken 
      : AI_CONFIG.costs.chatPricePerToken;
    
    return tokens * pricePerToken;
  }
}

// Singleton instance
export const openaiService = new OpenAIService(); 