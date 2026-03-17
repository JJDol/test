/**
 * Delete Semantic Document Route
 * 
 * PURPOSE: Delete AI document from database and vector storage
 * - Removes document from ai_documents table
 * - Cleans up vector embeddings in pgvector
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
import { vectorStoreService } from '@/lib/services/integrations/vector-store';

async function deleteDocumentChunks(documentId: string): Promise<number> {
  try {
    console.log(`🔍 Searching for chunks with document_id: ${documentId}`);

    const chunks = await vectorStoreService.findDocumentPoints(documentId);

    if (!chunks || chunks.length === 0) {
      console.log(`📝 No chunks found for document ${documentId}`);
      return 0;
    }

    const chunkIds = chunks.map((chunk: any) => chunk.id);
    console.log(`🗑️ Deleting ${chunkIds.length} chunks...`);
    await vectorStoreService.deleteDocumentPoints(chunkIds);
    console.log(`✅ Successfully deleted ${chunkIds.length} chunks`);

    return chunkIds.length;
  } catch (error) {
    console.error('❌ Error in deleteDocumentChunks:', error);
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

    // Delete from vector store first - find and delete all chunks for this document
    // Only attempt if document was successfully processed (has chunks)
    if (document.ingestion_status === 'completed' && document.chunks_count > 0) {
      console.log(`🔍 Document was processed, attempting vector store deletion...`);
      try {
        const deletedCount = await deleteDocumentChunks(documentId);
        console.log(`✅ Deleted ${deletedCount} chunks for document ${documentId}`);
      } catch (vectorError) {
        console.error('❌ Error deleting from vector store:', vectorError);
      }
    } else {
      console.log(`📝 Document not fully processed (status: ${document.ingestion_status}, chunks: ${document.chunks_count}), skipping vector store deletion`);
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