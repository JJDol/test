// AI Service Configuration
export const AI_CONFIG = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      embedding: 'text-embedding-3-small', // Cost-effective choice
      chat: 'gpt-4o-mini',
    },
    maxTokens: {
      embedding: 8000, // Max tokens per embedding request
      chat: 4000, // Max tokens for chat responses
    },
  },

  // Processing Configuration
  processing: {
    chunkSize: 1000, // characters per chunk
    chunkOverlap: 200, // overlap between chunks
    batchSize: 10, // documents to process in parallel
    maxFileSize: 10 * 1024 * 1024, // 10MB max file size
    supportedFileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  // BR18 Configuration
  br18: {
    sourceUrl: process.env.BR18_SOURCE_URL || 'https://example.com/br18-data',
    updateInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    lastUpdated: process.env.BR18_LAST_UPDATED,
  },

  // Cost Optimization
  costs: {
    embeddingPricePerToken: 0.00000002, // $0.02 per 1M tokens for text-embedding-3-small
    chatPricePerToken: 0.00000015, // $0.15 per 1M tokens for gpt-4o-mini
    maxMonthlyBudget: 100, // $100 monthly budget
  },
};

// Validation
const requiredEnvVars = ['OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default AI_CONFIG; 