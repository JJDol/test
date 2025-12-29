/**
 * Collections Debug Route
 * 
 * PURPOSE: Inspect Qdrant vector database collections
 * - Inspects vector database collections
 * - Verifies document embeddings are stored correctly
 * - Debugs search functionality
 * - Checks data structure and content
 * 
 * SECURITY: Admin only, development only
 * ROUTE: /api/debug/collections
 */
import { NextResponse } from 'next/server';
import { withAdmin, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { qdrantService } from '@/lib/services/integrations/qdrant-client';
import { AI_CONFIG } from '@/lib/config/ai-config';

async function debugCollectionsHandler(request: AuthenticatedRequest) {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug routes disabled in production' }, { status: 404 });
  }
  try {
    const client = (qdrantService as any).getClient();
    
    // Get all collections
    const collections = await client.getCollections();
    console.log('📊 Available collections:', collections.collections.map((c: any) => c.name));
    
    const collectionInfo = [];
    
    // Check each collection
    for (const collection of collections.collections) {
      try {
        const info = await client.getCollection(collection.name);
        
        // Get a sample of points to see the data structure
        let samplePoints = [];
        if (info.points_count > 0) {
          const scrollResult = await client.scroll(collection.name, {
            limit: 3,
            with_payload: true,
            with_vector: false
          });
          samplePoints = scrollResult.points || [];
        }
        
        collectionInfo.push({
          name: collection.name,
          points_count: info.points_count,
          config: info.config,
          sample_points: samplePoints.map((point: any) => ({
            id: point.id,
            payload_keys: Object.keys(point.payload || {}),
            sample_payload: {
              company_id: point.payload?.company_id,
              source_type: point.payload?.source_type,
              document_id: point.payload?.document_id,
              text_preview: point.payload?.text?.substring(0, 100) + '...'
            }
          }))
        });
      } catch (error) {
        collectionInfo.push({
          name: collection.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      configured_collection: AI_CONFIG.qdrant.collection.name,
      available_collections: collectionInfo
    });
    
  } catch (error) {
    console.error('❌ Error checking collections:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const GET = withAdmin(debugCollectionsHandler); 