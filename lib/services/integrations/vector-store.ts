import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { SourceAttribution } from '@/lib/types/types';

export class VectorStoreService {
  private getClient() {
    return createServiceRoleClient();
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

      const rows = chunks.map((chunk, index) => {
        if (!chunk.embedding || !Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
          throw new Error(`Invalid embedding for chunk ${index}: ${typeof chunk.embedding}, length: ${chunk.embedding?.length || 0}`);
        }
        if (chunk.embedding.some(val => !isFinite(val))) {
          throw new Error(`Embedding contains invalid values (NaN/Infinity) for chunk ${index}`);
        }

        return {
          document_id: documentId,
          company_id: companyId || 'public',
          source_type: sourceType,
          content: chunk.text.substring(0, 10000),
          chunk_index: index,
          metadata: {
            'br-page-title': chunk.metadata['br-page-title'],
            'br-paragraph': chunk.metadata['br-paragraph'],
            'br-href': chunk.metadata['br-href'],
            source: chunk.metadata['source'],
            status: chunk.metadata['status'],
            text_length: chunk.metadata.text_length,
            paragraph_id: chunk.metadata.paragraph_id,
            extracted_facts: chunk.metadata.extracted_facts,
            generated_questions: chunk.metadata.generated_questions,
            enhancement_applied: chunk.metadata.enhancement_applied,
          },
          embedding: JSON.stringify(chunk.embedding),
        };
      });

      const supabase = this.getClient();
      const { data, error } = await supabase
        .from('document_chunks')
        .insert(rows)
        .select('id');

      if (error) {
        console.error('❌ Error upserting document chunks:', error.message, error.details, error.hint, error.code);
        throw new Error(`Supabase insert failed: ${error.message} (code: ${error.code}, details: ${error.details})`);
      }

      const ids = (data || []).map((row: { id: string }) => row.id);
      console.log(`✅ Upserted ${ids.length} chunks for document ${documentId}`);
      return ids;
    } catch (error) {
      console.error('❌ Error upserting document chunks:', error instanceof Error ? error.message : JSON.stringify(error));
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
      console.log(`🔍 Searching with query: "${query}" for company: ${companyId}`);

      const supabase = this.getClient();
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_company_id: companyId,
        match_limit: limit,
      });

      if (error) {
        console.error('❌ Error searching vector store:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📝 No matching documents found');
        return [];
      }

      console.log(`🔍 Search returned ${data.length} results`);

      const sources: SourceAttribution[] = data.map((row: any) => ({
        document_id: row.document_id,
        document_name: row.metadata?.['br-page-title'] || row.source_type || 'Unknown Document',
        document_type: row.source_type as 'br18' | 'upload' | 'template',
        text_snippet: row.content,
        page_number: row.metadata?.page_number,
        confidence_score: row.similarity || 0,
        chunk_id: row.id,
      }));

      console.log(`✅ Returning ${sources.length} sources to chat API`);
      return sources;
    } catch (error) {
      console.error('❌ Error searching vector store:', error);
      if (error instanceof Error && error.message?.includes('could not find')) {
        console.log('📝 RPC function not found, returning empty results');
        return [];
      }
      throw error;
    }
  }

  async deleteDocumentPoints(pointIds: string[]): Promise<void> {
    try {
      if (pointIds.length === 0) return;

      const supabase = this.getClient();
      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .in('id', pointIds);

      if (error) {
        console.error('❌ Error deleting chunks:', error);
        throw error;
      }

      console.log(`✅ Deleted ${pointIds.length} chunks from vector store`);
    } catch (error) {
      console.error('❌ Error deleting chunks:', error);
      throw error;
    }
  }

  async deletePointsBySourceType(sourceType: string): Promise<number> {
    try {
      console.log(`🗑️ Deleting chunks with source_type: ${sourceType}`);

      const supabase = this.getClient();

      const { count: existingCount } = await supabase
        .from('document_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', sourceType);

      if (!existingCount || existingCount === 0) {
        console.log(`📝 No chunks found with source_type: ${sourceType}`);
        return 0;
      }

      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .eq('source_type', sourceType);

      if (error) {
        console.error(`❌ Error deleting chunks by source_type ${sourceType}:`, error);
        throw error;
      }

      console.log(`✅ Deleted ${existingCount} chunks with source_type: ${sourceType}`);
      return existingCount;
    } catch (error) {
      console.error(`❌ Error deleting chunks by source_type ${sourceType}:`, error);
      throw error;
    }
  }

  async findDocumentPoints(documentId: string): Promise<any[]> {
    try {
      console.log(`🔍 Finding chunks for document: ${documentId}`);

      const supabase = this.getClient();
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, document_id, company_id, source_type, content, metadata, chunk_index')
        .eq('document_id', documentId);

      if (error) {
        console.error('❌ Error finding document chunks:', error);
        throw error;
      }

      console.log(`📊 Found ${data?.length || 0} chunks for document ${documentId}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error finding document chunks:', error);
      throw error;
    }
  }

  async getCollectionInfo(): Promise<{ points_count: number }> {
    try {
      const supabase = this.getClient();
      const { count, error } = await supabase
        .from('document_chunks')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Error getting collection info:', error);
        throw error;
      }

      return { points_count: count || 0 };
    } catch (error) {
      console.error('❌ Error getting collection info:', error);
      throw error;
    }
  }

  async getPublicDocumentsForChatbot(): Promise<any[]> {
    try {
      console.log('🔍 Fetching public documents from vector store for chatbot...');

      const supabase = this.getClient();
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('id, document_id, company_id, source_type, content, metadata, chunk_index')
        .eq('company_id', 'public')
        .order('document_id')
        .order('chunk_index');

      if (error) {
        console.error('❌ Error fetching public documents:', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        console.log('📝 No public documents found');
        return [];
      }

      console.log(`📊 Found ${chunks.length} public chunks`);

      const sourceTypeMap = new Map<string, Map<string, any>>();

      for (const chunk of chunks) {
        const sourceType = chunk.source_type || 'unknown';
        const documentId = chunk.document_id;

        if (!sourceTypeMap.has(sourceType)) {
          sourceTypeMap.set(sourceType, new Map());
        }

        const documentsOfType = sourceTypeMap.get(sourceType)!;

        if (!documentsOfType.has(documentId)) {
          let documentName = '';
          let documentType = 'text/plain';

          if (sourceType === 'br18') {
            documentName = chunk.metadata?.['br-page-title'] || `BR18 Document ${documentId}`;
            documentType = 'text/html';
          } else {
            documentName = chunk.metadata?.source || `${sourceType} Document ${documentId}`;
          }

          documentsOfType.set(documentId, {
            id: `${sourceType}-${documentId}`,
            name: documentName,
            size: 0,
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
            page_url: chunk.metadata?.['br-href'] || '',
            page_title: chunk.metadata?.['br-page-title'] || '',
            chunks: [],
          });
        }

        const doc = documentsOfType.get(documentId);
        doc.chunks.push({
          text: chunk.content,
          chunk_index: chunk.chunk_index,
        });
        doc.size += chunk.content?.length || 0;
        doc.chunks_count += 1;
      }

      const allDocuments: any[] = [];
      sourceTypeMap.forEach((documentsOfType) => {
        const documentsArray = Array.from(documentsOfType.values());
        documentsArray.sort((a: any, b: any) => a.name.localeCompare(b.name));
        allDocuments.push(...documentsArray);
      });

      allDocuments.sort((a: any, b: any) => {
        if (a.source_type !== b.source_type) {
          return a.source_type.localeCompare(b.source_type);
        }
        return a.name.localeCompare(b.name);
      });

      console.log(`✅ Processed ${allDocuments.length} unique public documents for chatbot`);
      return allDocuments;
    } catch (error) {
      console.error('❌ Error retrieving public documents from vector store:', error);
      return [];
    }
  }
}

export const vectorStoreService = new VectorStoreService();
