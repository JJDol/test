// Use require syntax to avoid TypeScript import issues for now
const { QdrantClient } = require('@qdrant/js-client-rest');
import { AI_CONFIG } from '@/lib/config/ai-config';
import { SourceAttribution } from '@/lib/types/types';

export class QdrantService {
  private client: any; // Using any for now to avoid type issues
  private collectionName: string;

  constructor() {
    this.client = new QdrantClient({
      url: AI_CONFIG.qdrant.url,
      apiKey: AI_CONFIG.qdrant.apiKey,
    });
    this.collectionName = AI_CONFIG.qdrant.collection.name;
  }

  async ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col: any) => col.name === this.collectionName
      );

      if (!collectionExists) {
        // Create collection
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: AI_CONFIG.qdrant.collection.size,
            distance: AI_CONFIG.qdrant.collection.distance,
          },
        });
        console.log(`✅ Created Qdrant collection: ${this.collectionName}`);
      }

      // Create index for company_id field to enable filtering
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "company_id",
          field_schema: "keyword"
        });
        console.log(`✅ Created index for company_id field`);
      } catch (indexError: any) {
        // Index might already exist, which is fine
        if (indexError.message?.includes('already exists') || indexError.status === 400) {
          console.log(`📝 Index for company_id already exists`);
        } else {
          console.error('❌ Error creating company_id index:', indexError);
          throw indexError;
        }
      }

      // Create index for source_type field to enable filtering by document type
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "source_type",
          field_schema: "keyword"
        });
        console.log(`✅ Created index for source_type field`);
      } catch (indexError: any) {
        // Index might already exist, which is fine
        if (indexError.message?.includes('already exists') || indexError.status === 400) {
          console.log(`📝 Index for source_type already exists`);
        } else {
          console.error('❌ Error creating source_type index:', indexError);
          throw indexError;
        }
      }

      // Create index for document_id field to enable filtering by document for deletion
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "document_id",
          field_schema: "keyword"
        });
        console.log(`✅ Created index for document_id field`);
      } catch (indexError: any) {
        // Index might already exist, which is fine
        if (indexError.message?.includes('already exists') || indexError.status === 400) {
          console.log(`📝 Index for document_id already exists`);
        } else {
          console.error('❌ Error creating document_id index:', indexError);
          throw indexError;
        }
      }
      
    } catch (error) {
      console.error('❌ Error ensuring Qdrant collection:', error);
      throw error;
    }
  }

  async upsertDocumentChunks(
    documentId: string,
    companyId: string | null,
    sourceType: 'br18' | 'upload' | 'template',
    chunks: Array<{
      text: string;
      metadata: Record<string, any>;
      embedding: number[];
    }>
  ): Promise<string[]> {
    try {
      console.log(`🔍 Preparing ${chunks.length} chunks for upsert...`);
      
      const points = chunks.map((chunk, index) => {
        // Validate embedding
        if (!chunk.embedding || !Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
          throw new Error(`Invalid embedding for chunk ${index}: ${typeof chunk.embedding}, length: ${chunk.embedding?.length || 0}`);
        }
        
        // Check for NaN or infinite values in embedding
        const hasInvalidValues = chunk.embedding.some(val => !isFinite(val));
        if (hasInvalidValues) {
          throw new Error(`Embedding contains invalid values (NaN/Infinity) for chunk ${index}`);
        }
        
        // Generate a proper UUID for each chunk point
        const chunkId = crypto.randomUUID();
        
        return {
          id: chunkId,
          vector: chunk.embedding,
          payload: {
            document_id: documentId,
            company_id: companyId || 'public',
            source_type: sourceType,
            text: chunk.text.substring(0, 1000), // Limit text length in payload
            chunk_index: index,
            // Filter out potentially problematic metadata
            'br-page-title': chunk.metadata['br-page-title'],
            'br-paragraph': chunk.metadata['br-paragraph'],
            'br-href': chunk.metadata['br-href'],
            'source': chunk.metadata['source'],
            'status': chunk.metadata['status'],
            text_length: chunk.metadata.text_length,
            paragraph_id: chunk.metadata.paragraph_id
          },
        };
      });

      console.log(`🔍 Sample point data:`, {
        id: points[0].id,
        vectorLength: points[0].vector.length,
        payloadKeys: Object.keys(points[0].payload),
        textPreview: points[0].payload.text.substring(0, 50) + '...'
      });

      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      });

      console.log(`✅ Upserted ${points.length} chunks for document ${documentId}`);
      return points.map(p => p.id as string);
    } catch (error) {
      console.error('❌ Error upserting document chunks:', error);
      
      // Try to get more specific error information
      if (error && typeof error === 'object' && 'data' in error) {
        console.error('❌ Qdrant error details:', error.data);
      }
      
      throw error;
    }
  }

  async searchSimilar(
    query: string,
    queryEmbedding: number[],
    companyId: string,
    limit: number = 10
  ): Promise<SourceAttribution[]> {
    try {
      // First check if collection has any points
      const collectionInfo = await this.client.getCollection(this.collectionName);
      await this.ensureCollection();
      console.log(`🔍 Collection info: ${collectionInfo.points_count} points in collection`);
      
      if (collectionInfo.points_count === 0) {
        console.log('📝 Collection is empty, returning no results');
        return [];
      }

      console.log(`🔍 Searching with query: "${query}" for company: ${companyId}`);
      
      // Now we can use filtering since we create the index
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        filter: {
          should: [
            {
              key: "company_id",
              match: {
                value: "public"
              }
            },
            {
              key: "company_id", 
              match: {
                value: companyId
              }
            }
          ]
        },
        with_payload: true,
        with_vector: false,
      });

      console.log(`🔍 Search returned ${searchResult.length} results`);
      
      if (searchResult.length > 0) {
        console.log(`🔍 Sample result:`, {
          score: searchResult[0].score,
          payloadKeys: Object.keys(searchResult[0].payload || {}),
          sourceType: searchResult[0].payload?.source_type,
          companyId: searchResult[0].payload?.company_id,
          textPreview: searchResult[0].payload?.text?.substring(0, 100)
        });
      }

      const sources = searchResult.map((result: any) => ({
        document_id: result.payload?.document_id as string,
        document_name: result.payload?.['br-page-title'] || result.payload?.source_type || 'Unknown Document',
        document_type: result.payload?.source_type as 'br18' | 'upload' | 'template',
        text_snippet: result.payload?.text as string,
        page_number: result.payload?.page_number as number | undefined,
        confidence_score: result.score || 0,
        qdrant_point_id: result.id as string,
      }));

      console.log(`✅ Returning ${sources.length} sources to chat API`);
      return sources;
      
    } catch (error) {
      console.error('❌ Error searching Qdrant:', error);
      
      // If the error is because there are no matching points, return empty array
      if (error instanceof Error && (error.message?.includes('Bad Request') || (error as any).status === 400)) {
        console.log('📝 No matching documents found, returning empty results');
        return [];
      }
      
      throw error;
    }
  }

  async deleteDocumentPoints(pointIds: string[]): Promise<void> {
    try {
      if (pointIds.length === 0) return;

      await this.client.delete(this.collectionName, {
        wait: true,
        points: pointIds,
      });

      console.log(`✅ Deleted ${pointIds.length} points from Qdrant`);
    } catch (error) {
      console.error('❌ Error deleting points:', error);
      throw error;
    }
  }

  async deletePointsBySourceType(sourceType: string): Promise<number> {
    try {
      console.log(`🗑️ Deleting all points from collection (ignoring source_type for now)`);

      // Get all points without any filtering
      const searchResult = await this.client.scroll(this.collectionName, {
        limit: 1000,
        with_payload: false,
        with_vector: false
      });

      if (!searchResult.points || searchResult.points.length === 0) {
        console.log(`📝 No points found in collection`);
        return 0;
      }

      console.log(`🔍 Total points in collection: ${searchResult.points.length}`);

      // Delete ALL points (no filtering)
      const pointIds = searchResult.points.map((point: any) => point.id);
      console.log(`🔍 Deleting all ${pointIds.length} points from collection`);

      // Delete by IDs
      await this.client.delete(this.collectionName, {
        wait: true,
        points: pointIds
      });

      console.log(`✅ Deleted all ${pointIds.length} points from collection`);
      return pointIds.length;
    } catch (error) {
      console.error(`❌ Error deleting all points:`, error);
      throw error;
    }
  }

  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('❌ Error getting collection info:', error);
      throw error;
    }
  }

  async scrollPublicDocuments(limit: number = 1000): Promise<any[]> {
    try {
      console.log('🔍 Scrolling public documents from Qdrant...');
      
      const scrollResult = await this.client.scroll(this.collectionName, {
        filter: {
          should: [
            {
              key: "company_id",
              match: {
                value: "public"
              }
            }
          ]
        },
        limit,
        with_payload: true,
        with_vector: false
      });

      console.log(`📊 Found ${scrollResult.points?.length || 0} public documents`);
      return scrollResult.points || [];
    } catch (error) {
      console.error('❌ Error scrolling public documents:', error);
      throw error;
    }
  }

  async findDocumentPoints(documentId: string): Promise<any[]> {
    try {
      console.log(`🔍 Finding points for document: ${documentId}`);
      
      const scrollResult = await this.client.scroll(this.collectionName, {
        filter: {
          should: [
            {
              key: "document_id",
              match: {
                value: documentId
              }
            }
          ]
        },
        limit: 1000,
        with_payload: true,
        with_vector: false
      });

      console.log(`📊 Found ${scrollResult.points?.length || 0} points for document ${documentId}`);
      return scrollResult.points || [];
    } catch (error) {
      console.error('❌ Error finding document points:', error);
      throw error;
    }
  }

  async getPublicDocumentsForChatbot(): Promise<any[]> {
    try {
      console.log('🔍 Fetching public documents from Qdrant for chatbot...');

      // Ensure collection and indexes exist
      await this.ensureCollection();

      // Get collection info
      const collectionInfo = await this.getCollectionInfo();
      console.log(`📊 Collection info: ${collectionInfo.points_count} total points`);

      if (collectionInfo.points_count === 0) {
        console.log('📝 Collection is empty');
        return [];
      }

      // Scroll through public documents
      const publicPoints = await this.scrollPublicDocuments(1000);
      
      if (!publicPoints || publicPoints.length === 0) {
        console.log('📝 No public documents found in Qdrant');
        return [];
      }

      console.log(`📊 Found ${publicPoints.length} public chunks in Qdrant`);

      // Group chunks by source_type, then by document_id
      const sourceTypeMap = new Map();

      publicPoints.forEach((point: any) => {
        const payload = point.payload;
        
        // Filter for public documents only
        if (payload.company_id !== 'public') {
          return; // Skip non-public documents
        }
        
        const sourceType = payload.source_type || 'unknown';
        const documentId = payload.document_id;
        
        if (!sourceTypeMap.has(sourceType)) {
          sourceTypeMap.set(sourceType, new Map());
        }
        
        const documentsOfType = sourceTypeMap.get(sourceType);
        
        if (!documentsOfType.has(documentId)) {
          // Create document entry based on source type
          let documentName = '';
          let documentType = 'text/plain';
          
          if (sourceType === 'br18') {
            documentName = payload['br-page-title'] || `BR18 Document ${documentId}`;
            documentType = 'text/html';
          } else {
            documentName = payload.source || `${sourceType} Document ${documentId}`;
          }
          
          documentsOfType.set(documentId, {
            id: `${sourceType}-${documentId}`,
            name: documentName,
            size: 0, // We'll calculate this
            type: documentType,
            company_id: 'public',
            user_id: null,
            is_company_wide: true,
            description: `${sourceType.toUpperCase()} public document`,
            tags: [sourceType.toUpperCase(), 'Public'],
            ingestion_status: 'completed',
            ingestion_progress: 100,
            ingestion_error: null,
            chunks_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            uploaded_by: 'system',
            uploaded_by_name: `${sourceType.toUpperCase()} System`,
            source_type: sourceType,
            // BR18 specific fields
            page_url: payload['br-href'] || '',
            page_title: payload['br-page-title'] || '',
            chunks: []
          });
        }

        // Add chunk info and update size
        const doc = documentsOfType.get(documentId);
        doc.chunks.push({
          text: payload.text,
          chunk_index: payload.chunk_index
        });
        doc.size += (payload.text?.length || 0);
        doc.chunks_count += 1;
      });

      // Convert nested maps to flat array and sort
      const allDocuments: any[] = [];
      
      sourceTypeMap.forEach((documentsOfType, sourceType) => {
        const documentsArray = Array.from(documentsOfType.values());
        documentsArray.sort((a: any, b: any) => a.name.localeCompare(b.name));
        allDocuments.push(...documentsArray);
      });

      // Sort by source type first, then by name
      allDocuments.sort((a: any, b: any) => {
        if (a.source_type !== b.source_type) {
          return a.source_type.localeCompare(b.source_type);
        }
        return a.name.localeCompare(b.name);
      });

      console.log(`✅ Processed ${allDocuments.length} unique public documents for chatbot`);
      console.log(`📊 Source types found:`, Array.from(sourceTypeMap.keys()));
      
      return allDocuments;

    } catch (error) {
      console.error('❌ Error retrieving public documents from Qdrant for chatbot:', error);
      return [];
    }
  }
}

// Singleton instance
export const qdrantService = new QdrantService();