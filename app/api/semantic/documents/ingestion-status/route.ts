/**
 * Semantic Document Ingestion Status Route
 * 
 * PURPOSE: Check processing status of multiple AI documents in batch
 * - Returns ingestion status, progress, and errors for document IDs
 * - Used by frontend to show progress indicators during document processing
 * - Supports batch queries for efficient status checking
 * 
 * SECURITY:
 * - Authentication required
 * - Company isolation enforced
 * - Users can only access their own documents or company-wide documents
 * - Input validation prevents injection attacks
 * TODO:
 * - Add rate limiting to prevent abuse (max 50 documents per request)
 * - Add input validation for document IDs (UUID format)
 * - Consider caching for frequently checked documents
 * - Add pagination for large document lists
 * 
 * ROUTE: POST /api/semantic/documents/ingestion-status
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function getIngestionStatusHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // User is already authenticated via middleware
    const user = request.user;

    const { document_ids } = await request.json();
    
    // Validate input: document_ids must be an array
    if (!document_ids || !Array.isArray(document_ids)) {
      return NextResponse.json({ error: 'Invalid document_ids - must be an array' }, { status: 400 });
    }

    // TODO: Add rate limiting - max 50 documents per request
    if (document_ids.length > 50) {
      return NextResponse.json({ error: 'Too many documents requested - max 50 allowed' }, { status: 400 });
    }

    // Get user's company info for access control
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('User not found in database:', user.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Query document statuses with proper access control
    // Users can only see their own documents or company-wide documents
    const { data: documents, error: documentsError } = await supabase
      .from('ai_documents')
      .select('id, ingestion_status, ingestion_progress, ingestion_error')
      .in('id', document_ids)
      .eq('company_id', userData.company_id)
      .or(`is_company_wide.eq.true,user_id.eq.${user.id}`);

    if (documentsError) {
      console.error('Error fetching document statuses:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch document statuses' }, { status: 500 });
    }

    // Map documents to status response format
    const statuses = documents?.map((doc: any) => ({
      document_id: doc.id,
      status: doc.ingestion_status,
      progress: doc.ingestion_progress,
      error: doc.ingestion_error
    })) || [];

    console.log(`📊 Retrieved status for ${statuses.length} documents`);
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Error in ingestion status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(getIngestionStatusHandler); 