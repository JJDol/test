// TODO: Since the database is mess, we first have to focus on fixing it because we dont know what to fetch from it.
// TODO: The fix right now would be to adapt ai_documents table and use it for all documents related to AI
/**
 * Semantic Documents API
 * 
 * PURPOSE: Manage AI-related documents for semantic search and chat
 * - GET: List all documents (user + company + public)
 * - POST: Create a new document record
 * 
 * DOCUMENT PROCESSING:
 * - Documents are uploaded and processed for AI consumption
 * - Content is chunked and vectorized for storage in pgvector
 * - Chunks serve as knowledge sources for semantic search and chat
 * - Supports company-wide and personal document access
 * 
 * INTEGRATION:
 * - Part of unified semantic system for AI operations
 * - Provides knowledge base for semantic search and chat
 * - Uses Supabase pgvector for vector storage and retrieval
 * 
 * ROUTE: /api/semantic/documents
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Document, DocumentStatus, DocumentCategory } from '@/lib/types/types';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function createDocumentHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    const documentData = await request.json() as Omit<Document, 'id' | 'created_at' | 'updated_at'>;

    // Validate required fields
    if (!documentData.project_id || !documentData.name || !documentData.category) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        details: {
          project_id: !documentData.project_id,
          name: !documentData.name,
          category: !documentData.category
        }
      }, { status: 400 });
    }

    // Verify the project exists and apply company filter only for non-ADMIN users
    let projectCheckQuery = supabase
      .from('projects')
      .select('company_id')
      .eq('id', documentData.project_id);

    if (currentUserProfile.role !== 'ADMIN') {
      projectCheckQuery = projectCheckQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: projectCheck, error: projectCheckError } = await projectCheckQuery.single();

    if (projectCheckError || !projectCheck) {
      return NextResponse.json({ 
        message: currentUserProfile.role === 'ADMIN' 
          ? 'Project not found' 
          : 'Project not found or not accessible in your company' 
      }, { status: 404 });
    }

    // Validate enum values
    if (!Object.values(DocumentCategory).includes(documentData.category)) {
      return NextResponse.json({ 
        message: 'Invalid category value',
        validCategories: Object.values(DocumentCategory)
      }, { status: 400 });
    }

    if (documentData.status && !Object.values(DocumentStatus).includes(documentData.status)) {
      return NextResponse.json({ 
        message: 'Invalid status value',
        validStatuses: Object.values(DocumentStatus)
      }, { status: 400 });
    }

    // Insert document
    const { data: document, error } = await supabase
      .from('documents')
      .insert([{
        ...documentData,
        company_id: currentUserProfile.company_id, // 🔑 MULTI-TENANT ASSIGNMENT
        status: documentData.status || DocumentStatus.NOT_STARTED
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        message: 'Failed to create document',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getDocumentsHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company info
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Query ALL documents (user + company + public) with proper access control
    // This also introduces the name of the user who uploaded the document
    const { data: allDocuments, error: documentsError } = await supabase
      .from('ai_documents')
      .select(`
        *,
        uploaded_by_user:users!ai_documents_uploaded_by_fkey(name)
      `)
      .or(`company_id.eq.${userData.company_id},is_public.eq.true`)
      // for testing is public doesnt exist -> we have to push migrations for it
      // .or(`company_id.eq.${userData.company_id}`)
      .or(`is_company_wide.eq.true,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Format all documents
    const formattedDocuments = allDocuments?.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      size: doc.size,
      type: doc.type,
      company_id: doc.company_id,
      user_id: doc.user_id,
      is_company_wide: doc.is_company_wide,
      description: doc.description,
      tags: doc.tags,
      ingestion_status: doc.ingestion_status,
      ingestion_progress: doc.ingestion_progress,
      ingestion_error: doc.ingestion_error,
      chunks_count: doc.chunks_count,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      uploaded_by: doc.uploaded_by,
      uploaded_by_name: doc.uploaded_by_user?.name || 'Unknown'
    })) || [];

    console.log(`📊 API Response Summary:`);
    console.log(`   - Total documents: ${formattedDocuments.length}`);

    return NextResponse.json({ documents: formattedDocuments });
  } catch (error) {
    console.error('Error in documents API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(createDocumentHandler);
export const GET = withAuth(getDocumentsHandler);




