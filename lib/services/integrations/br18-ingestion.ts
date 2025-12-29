import { enhancedDocumentProcessor } from '@/lib/services/ai/ai-document-processor';
import { br18Scraper } from './br18-scraper';
import { createClient } from '@/lib/supabase/server';

export class EnhancedBR18IngestionService {

  async ingestAllBR18(testMode: boolean = false): Promise<{
    success: boolean;
    documentsProcessed: number;
    chunksIngested: number;
    totalCost: number;
    errors: string[];
    enhancementsApplied: number;
  }> {
    const results = {
      success: true,
      documentsProcessed: 0,
      chunksIngested: 0,
      totalCost: 0,
      errors: [] as string[],
      enhancementsApplied: 0
    };

    try {
      console.log(`🚀 Starting Enhanced BR18 ${testMode ? 'TEST' : 'FULL'} ingestion...`);
      
      // Clean up existing BR18 data first
      await this.cleanupExistingBR18Data();
      
      // Get pages to process
      const pagesToProcess = testMode ? [2, 3] : Array.from({ length: 21 }, (_, i) => i + 2);
      console.log(`📄 Will process ${pagesToProcess.length} pages: ${pagesToProcess.join(', ')}`);

      for (const pageNumber of pagesToProcess) {
        try {
          console.log(`\n📖 Processing BR18 page ${pageNumber} with enhanced pipeline...`);
          
          // Scrape documents from the webpage
          const documents = await br18Scraper.scrapeBR18Page(pageNumber);
          
          if (documents.length === 0) {
            console.warn(`⚠️ No documents found on page ${pageNumber}`);
            results.errors.push(`No documents found on page ${pageNumber}`);
            continue;
          }

          console.log(`📑 Found ${documents.length} documents on page ${pageNumber}`);

          // Create database record for this page
          const documentId = await this.createDocumentRecord(pageNumber, documents);
          
          // Combine all documents from this page into one text block for processing
          const combinedText = documents
            .map(doc => doc.text)
            .filter(text => text && text.trim().length > 10)
            .join('\n\n');

          if (!combinedText) {
            console.warn(`⚠️ No valid text content on page ${pageNumber}`);
            continue;
          }

          // Extract metadata from first document (page-level metadata)
          const pageMetadata = documents[0]?.metadata || {};
          
          // Process with enhanced pipeline
          const processingResult = await enhancedDocumentProcessor.processDocument(
            documentId,
            null, // BR18 is shared content
            'br18',
            combinedText,
            {
              ...pageMetadata,
              page_number: pageNumber,
              source: 'BR18',
              status: 'active',
              document_count: documents.length
            }
          );

          if (processingResult.success) {
            results.chunksIngested += processingResult.chunksProcessed;
            results.totalCost += processingResult.totalCost;
            results.documentsProcessed += 1;
            
            // Count enhancements (chunks with extracted facts or questions)
            const enhancedChunks = processingResult.pointIds.length; // Approximation
            results.enhancementsApplied += enhancedChunks;

            console.log(`✅ Page ${pageNumber} completed: ${processingResult.chunksProcessed} chunks, $${processingResult.totalCost.toFixed(6)} cost`);
          } else {
            results.errors.push(...processingResult.errors);
            console.error(`❌ Failed to process page ${pageNumber}:`, processingResult.errors);
          }

        } catch (error) {
          console.error(`❌ Error processing page ${pageNumber}:`, error);
          results.errors.push(`Page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.success = false;
        }
      }

      console.log(`\n🎉 Enhanced BR18 ingestion completed!`);
      console.log(`📊 Final results:`);
      console.log(`   - Documents processed: ${results.documentsProcessed}`);
      console.log(`   - Chunks ingested: ${results.chunksIngested}`);
      console.log(`   - Enhancements applied: ${results.enhancementsApplied}`);
      console.log(`   - Total cost: $${results.totalCost.toFixed(6)}`);
      console.log(`   - Errors: ${results.errors.length}`);

      // Update ingestion status in database
      await this.updateIngestionStatus(results);

    } catch (error) {
      console.error('❌ Enhanced BR18 ingestion failed:', error);
      results.success = false;
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return results;
  }

  /**
   * Process a single BR18 page with enhanced pipeline
   */
  async ingestSingleBR18Page(pageNumber: number): Promise<{
    success: boolean;
    chunksProcessed: number;
    totalCost: number;
    enhancementsApplied: number;
    errors: string[];
  }> {
    console.log(`🔄 Processing single BR18 page ${pageNumber} with enhanced pipeline...`);
    
    try {
      // Scrape the page
      const documents = await br18Scraper.scrapeBR18Page(pageNumber);
      
      if (documents.length === 0) {
        return {
          success: false,
          chunksProcessed: 0,
          totalCost: 0,
          enhancementsApplied: 0,
          errors: [`No documents found on page ${pageNumber}`]
        };
      }

      // Create document record
      const documentId = await this.createDocumentRecord(pageNumber, documents);
      
      // Combine and process
      const combinedText = documents
        .map(doc => doc.text)
        .filter(text => text && text.trim().length > 10)
        .join('\n\n');

      const pageMetadata = documents[0]?.metadata || {};
      
      const result = await enhancedDocumentProcessor.processDocument(
        documentId,
        null,
        'br18',
        combinedText,
        {
          ...pageMetadata,
          page_number: pageNumber,
          source: 'BR18',
          status: 'active'
        }
      );

      return {
        success: result.success,
        chunksProcessed: result.chunksProcessed,
        totalCost: result.totalCost,
        enhancementsApplied: result.chunksProcessed, // Approximation
        errors: result.errors
      };

    } catch (error) {
      return {
        success: false,
        chunksProcessed: 0,
        totalCost: 0,
        enhancementsApplied: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Check current ingestion status
   */
  async checkIngestionStatus(): Promise<{
    isIngested: boolean;
    documentCount: number;
    lastIngestion?: Date;
    totalChunks?: number;
  }> {
    try {
      const supabase = await createClient();
      // TODO: Use API route for this
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, created_at, metadata')
        .eq('source_type', 'br18')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking ingestion status:', error);
        return { isIngested: false, documentCount: 0 };
      }

      return {
        isIngested: documents.length > 0,
        documentCount: documents.length,
        lastIngestion: documents[0]?.created_at ? new Date(documents[0].created_at) : undefined,
        totalChunks: documents.reduce((sum, doc) => sum + (doc.metadata?.chunk_count || 0), 0)
      };

    } catch (error) {
      console.error('Error checking ingestion status:', error);
      return { isIngested: false, documentCount: 0 };
    }
  }

  private async cleanupExistingBR18Data(): Promise<void> {
    try {
      console.log('🧹 Cleaning up existing BR18 data...');
      
      const supabase = await createClient();
      
      // Delete from Qdrant first
      // TODO: Use API route for this
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('qdrant_points')
        .eq('source_type', 'br18');

      if (existingDocs && existingDocs.length > 0) {
        // Note: We'll need to implement deletePointsBySourceType in qdrant-client.ts
        // For now, we'll log this
        console.log(`📝 Found ${existingDocs.length} existing BR18 documents to clean up`);
      }

      // Delete from database
      // TODO: Use API route for this
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('source_type', 'br18');

      if (deleteError) {
        console.error('❌ Error deleting existing BR18 documents:', deleteError);
        throw deleteError;
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  private async createDocumentRecord(pageNumber: number, documents: any[]): Promise<string> {
    try {
      const supabase = await createClient();
      
      const documentRecord = {
        company_id: null, // BR18 is shared content
        name: `BR18 Page ${pageNumber}`,
        source_type: 'br18' as const,
        metadata: {
          page_number: pageNumber,
          document_count: documents.length,
          page_title: documents[0]?.metadata?.['br-page-title'] || `BR18 Page ${pageNumber}`,
          page_url: documents[0]?.metadata?.['br-page-url'] || '',
          ingestion_method: 'enhanced_pipeline',
          ingestion_date: new Date().toISOString()
        },
        embedding_status: 'processing' as const,
        is_temporary: false
      };
      // TODO: Use API route for this
      const { data, error } = await supabase
        .from('documents')
        .insert(documentRecord)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating document record:', error);
        throw error;
      }

      return data.id;

    } catch (error) {
      console.error('❌ Error creating document record:', error);
      throw error;
    }
  }

  private async updateIngestionStatus(results: any): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Update all BR18 documents to completed status
      // TODO: Use API route for this
      const { error } = await supabase
        .from('documents')
        .update({ 
          embedding_status: results.success ? 'completed' : 'failed',
          embedding_error: results.errors.length > 0 ? results.errors.join('; ') : null,
          metadata: {
            total_cost: results.totalCost,
            chunks_ingested: results.chunksIngested,
            enhancements_applied: results.enhancementsApplied,
            completion_date: new Date().toISOString()
          }
        })
        .eq('source_type', 'br18');

      if (error) {
        console.error('❌ Error updating ingestion status:', error);
      }

    } catch (error) {
      console.error('❌ Error updating ingestion status:', error);
    }
  }
}

export const enhancedBR18IngestionService = new EnhancedBR18IngestionService(); 