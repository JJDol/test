/**
 * Delete Semantic Document Route
 * 
 * PURPOSE: Delete AI document from database and vector storage
 * - Removes document from ai_documents table
 * - Cleans up vector embeddings in Qdrant
 * - Enforces proper access control and permissions
 * 
 * SECURITY: 
 * - Authentication required
 * - Only document owner or company admin can delete
 * - Company isolation enforced
 * - BR18 documents protected from deletion

 * ROUTE: DELETE /api/semantic/documents/[id]
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { qdrantService } from '@/lib/services/integrations/qdrant-client';

async function deleteDocumentFromQdrant(documentId: string): Promise<number> {
  try {
    console.log(`🔍 Searching for points with document_id: ${documentId}`);

    // Ensure collection and indexes exist before attempting deletion
    console.log(`🔧 Ensuring collection and indexes exist...`);
    await qdrantService.ensureCollection();

    // Get collection info using the service method
    const collectionInfo = await qdrantService.getCollectionInfo();
    console.log(`📊 Collection info: ${collectionInfo.points_count} total points`);

    // // First, let's try to scroll without filtering to see if there are any points
    // console.log(`🔍 Attempting to scroll all points to check collection...`);
    // try {
    //   const allPointsResult = await client.scroll(collectionName, {
    //     limit: 10, // Just get a few to see structure
    //     with_payload: true,
    //     with_vector: false
    //   });
      
    //   console.log(`📊 Sample points in collection:`, {
    //     totalFound: allPointsResult.points?.length || 0,
    //     samplePayload: allPointsResult.points?.[0]?.payload,
    //     payloadKeys: allPointsResult.points?.[0]?.payload ? Object.keys(allPointsResult.points[0].payload) : []
    //   });
    // } catch (scrollError) {
    //   console.error('❌ Error scrolling all points:', scrollError);
    // }

    // Now try to find points for this specific document
    console.log(`🔍 Searching for points with document_id: ${documentId}`);
    
    // Use the service method to find points for this specific document
    const points = await qdrantService.findDocumentPoints(documentId);
    
    const scrollResult = {
      points: points
    };

    console.log(`📊 Scroll result:`, {
      pointsFound: scrollResult.points?.length || 0,
      samplePayload: scrollResult.points?.[0]?.payload
    });

    if (!scrollResult.points || scrollResult.points.length === 0) {
      console.log(`📝 No points found for document ${documentId} in Qdrant`);
      return 0;
    }

    // Extract point IDs
    const pointIds = scrollResult.points.map((point: any) => point.id);
    console.log(`🔍 Found ${pointIds.length} points to delete:`, pointIds.slice(0, 3));

    // Delete the points
    console.log(`🗑️ Deleting ${pointIds.length} points from Qdrant...`);
    await qdrantService.deleteDocumentPoints(pointIds);
    console.log(`✅ Successfully deleted ${pointIds.length} points from Qdrant`);
    
    return pointIds.length;
  } catch (error) {
    console.error('❌ Error in deleteDocumentFromQdrant:', error);
    console.error('❌ Error details:', error);
    throw error;
  }
}

async function deleteDocumentHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const resolvedParams = await params;
    console.log(`🗑️ DELETE request received for document: ${resolvedParams.id}`);
    
    const supabase = await createClient();
    
    // User is already authenticated via middleware
    const user = request.user;

    const documentId = resolvedParams.id;
    console.log(`👤 User ${user.email} requesting deletion of document: ${documentId}`);

    // Prevent deletion of BR18 documents
    // TODO: this check should be done by type field in ai_documents table
    if (documentId.startsWith('br18-')) {
      console.log('❌ Attempted to delete BR18 document');
      return NextResponse.json({ error: 'BR18 documents cannot be deleted' }, { status: 403 });
    }

    // Get user's company info
    console.log(`🔍 Getting user company info for user: ${user.id}`);
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.log('❌ User not found in database:', userDataError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`👤 User company: ${userData.company_id}`);

    // Check if document exists and user has access
    console.log(`🔍 Checking document access for: ${documentId}`);
    const { data: document, error: documentError } = await supabase
      .from('ai_documents')
      .select('*')
      .eq('id', documentId)
      .eq('company_id', userData.company_id)
      .or(`is_company_wide.eq.true,user_id.eq.${user.id}`)
      .single();

    if (documentError || !document) {
      console.log('❌ Document not found or access denied:', documentError);
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    console.log(`📄 Document found: ${document.name}, uploaded by: ${document.uploaded_by}`);
    console.log(`📊 Document processing status: ${document.ingestion_status}, progress: ${document.ingestion_progress}%`);
    console.log(`📊 Document chunks count: ${document.chunks_count}`);

    // Check if user can delete (only uploaded by user or company admin)
    console.log(`🔐 Checking permissions: user ${user.id} vs document owner ${document.uploaded_by}`);
    if (document.uploaded_by !== user.id) {
      console.log(`🔍 User is not owner, checking admin role...`);
      // Check if user is company admin
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      console.log(`👤 User role: ${userRole?.role}`);
      if (userRole?.role !== 'COMPANY_ADMIN' && userRole?.role !== 'ADMIN') {
        console.log('❌ Permission denied - not owner or admin');
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    console.log('✅ Permission granted, proceeding with deletion');

    // Delete from Qdrant first - find and delete all points for this document
    // Only attempt if document was successfully processed (has chunks)
    if (document.ingestion_status === 'completed' && document.chunks_count > 0) {
      console.log(`🔍 Document was processed, attempting Qdrant deletion...`);
      try {
        const deletedCount = await deleteDocumentFromQdrant(documentId);
        console.log(`✅ Deleted ${deletedCount} points for document ${documentId} from Qdrant`);
      } catch (qdrantError) {
        console.error('❌ Error deleting from Qdrant:', qdrantError);
        // Continue with database deletion even if Qdrant fails
      }
    } else {
      console.log(`📝 Document not fully processed (status: ${document.ingestion_status}, chunks: ${document.chunks_count}), skipping Qdrant deletion`);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('ai_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Error deleting document from database:', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error in document deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Apply authentication wrapper
export const DELETE = withAuthDynamic(deleteDocumentHandler); 