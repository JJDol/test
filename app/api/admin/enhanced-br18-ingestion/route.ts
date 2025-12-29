/**
 * BR18 Ingestion API
 * 
 * PURPOSE: Document ingestion for BR18 construction standards
 * - POST: Process BR18 documents with enhanced AI processing
 * - GET: Check ingestion status and statistics
 * 
 * FEATURES: Single page processing, test mode, cost tracking
 * ACCESS: Company Admin only
 * ROUTE: /api/admin/enhanced-br18-ingestion
 * 
 * NOTE: BR18 is static content handled by developers only.
 * Users will only need to re-ingest their uploaded documents, not BR18.
 */
import { NextResponse } from 'next/server';
import { withCompanyAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { enhancedBR18IngestionService } from '@/lib/services/integrations/br18-ingestion';

async function enhancedBR18IngestionHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    const singlePage = searchParams.get('page');

    console.log(`🚀 Enhanced BR18 ingestion request from admin ${request.user.id}`);
    console.log(`   - Test mode: ${testMode}`);
    console.log(`   - Single page: ${singlePage || 'all pages'}`);

    let result;

    if (singlePage) {
      // Process single page
      const pageNumber = parseInt(singlePage);
      if (isNaN(pageNumber) || pageNumber < 2 || pageNumber > 22) {
        return NextResponse.json(
          { error: 'Invalid page number. Must be between 2 and 22.' },
          { status: 400 }
        );
      }

      result = await enhancedBR18IngestionService.ingestSingleBR18Page(pageNumber);
      
      return NextResponse.json({
        success: result.success,
        message: `Enhanced processing of BR18 page ${pageNumber} completed`,
        data: {
          pageNumber,
          chunksProcessed: result.chunksProcessed,
          enhancementsApplied: result.enhancementsApplied,
          totalCost: result.totalCost,
          errors: result.errors
        },
        metadata: {
          processingMethod: 'enhanced_pipeline',
          timestamp: new Date().toISOString()
        }
      });

    } else {
      // Process all pages
      result = await enhancedBR18IngestionService.ingestAllBR18(testMode);
      
      return NextResponse.json({
        success: result.success,
        message: `Enhanced BR18 ${testMode ? 'test' : 'full'} ingestion completed`,
        data: {
          documentsProcessed: result.documentsProcessed,
          chunksIngested: result.chunksIngested,
          enhancementsApplied: result.enhancementsApplied,
          totalCost: result.totalCost,
          errors: result.errors,
          costPerDocument: result.documentsProcessed > 0 
            ? result.totalCost / result.documentsProcessed 
            : 0,
          chunksPerDocument: result.documentsProcessed > 0 
            ? result.chunksIngested / result.documentsProcessed 
            : 0
        },
        metadata: {
          processingMethod: 'enhanced_pipeline',
          testMode,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('❌ Enhanced BR18 ingestion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Enhanced BR18 ingestion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingMethod: 'enhanced_pipeline',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

async function getIngestionStatusHandler(request: AuthenticatedRequest) {
  try {
    console.log(`📊 Enhanced BR18 status check from admin ${request.user.id}`);

    const status = await enhancedBR18IngestionService.checkIngestionStatus();

    return NextResponse.json({
      status: 'success',
      data: {
        isIngested: status.isIngested,
        documentCount: status.documentCount,
        lastIngestion: status.lastIngestion,
        totalChunks: status.totalChunks,
        ingestionMethod: 'enhanced_pipeline'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error checking enhanced BR18 status:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to check ingestion status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const POST = withCompanyAdmin(enhancedBR18IngestionHandler);
export const GET = withCompanyAdmin(getIngestionStatusHandler); 