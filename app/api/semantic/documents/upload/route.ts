/**
 * Semantic Document Upload Route
 * 
 * PURPOSE: Handle file uploads for AI document processing
 * - Accepts file uploads with metadata (description, tags, company-wide flag)
 * - Validates file type, size, and format
 * - Creates database record in ai_documents table
 * - Initiates background processing for AI ingestion (chunking, embedding)
 * - Returns immediate response while processing continues asynchronously
 * 

 * TODO:
 * - Add rate limiting to prevent abuse (max 10 uploads per minute)
 * - Add filename sanitization to prevent path traversal
 * - Add input validation for description length and tag format
 * - Consider implementing queue system for background processing reliability
 * - Add file content validation (check for malicious content)
 * - Add progress callbacks for real-time status updates
 * 
 * ROUTE: POST /api/semantic/documents/upload
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { enhancedDocumentProcessor } from '@/lib/services/ai/ai-document-processor';
import { openaiService } from '@/lib/services/ai/openai-client';
import { randomUUID } from 'crypto';
import mammoth from 'mammoth';

// Import from pdf-parse/lib/pdf-parse.js directly to avoid the top-level
// test-file load in the package's index.js that breaks Next.js builds.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function uploadDocumentHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();
    
    // User is already authenticated via middleware
    const user = request.user;

    // Get user's company info for access control
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, name')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('User not found in database:', user.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse form data from multipart request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const isCompanyWide = formData.get('is_company_wide') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type against allowed document formats
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Validate file size (max 50MB for processing efficiency)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Generate unique document ID for tracking
    const documentId = randomUUID();

    // Parse and clean tags from comma-separated string
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Create document record in ai_documents table with initial status
    // TODO: Consider add ingestion_error field and remove uploaded_by_name and uploaded_by fields
    const { data: documentRecord, error: insertError } = await supabase
      .from('ai_documents')
      .insert({
        id: documentId,
        name: file.name,
        size: file.size,
        type: file.type,
        company_id: userData.company_id,
        user_id: user.id,
        is_company_wide: isCompanyWide,
        description: description || null,
        tags: parsedTags.length > 0 ? parsedTags : null,
        ingestion_status: 'pending',
        ingestion_progress: 0,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating document record:', insertError);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Start background processing for AI ingestion (chunking, embedding)
    processDocumentInBackground(documentId, file, userData.company_id, isCompanyWide ? null : user.id, supabase);

    // Return success response with document details for frontend
    return NextResponse.json({
      message: 'Document uploaded successfully and queued for processing',
      document: {
        id: documentId,
        name: file.name,
        size: file.size,
        type: file.type,
        company_id: userData.company_id,
        user_id: isCompanyWide ? null : user.id,
        is_company_wide: isCompanyWide,
        description: description || null,
        tags: parsedTags.length > 0 ? parsedTags : null,
        ingestion_status: 'pending',
        ingestion_progress: 0,
        uploaded_by: user.id,
        uploaded_by_name: userData.name,
        created_at: documentRecord.created_at,
        updated_at: documentRecord.updated_at
      }
    });
  } catch (error) {
    console.error('Error in document upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(uploadDocumentHandler);

const MAX_KEYWORDS = 20;

async function extractDocumentKeywords(text: string): Promise<string[]> {
  try {
    const sample = text.slice(0, 3000);
    const response = await openaiService.generateChatResponse([
      {
        role: 'system',
        content: 'You extract keywords from documents. Return ONLY a JSON array of lowercase strings, no other text.',
      },
      {
        role: 'user',
        content: `Extract 10-20 single-word or short-phrase keywords/topics from this document.
Return them as a JSON array of lowercase strings.
Focus on the main subjects, fields, and concepts — not generic words like "the", "and", "is".

Document text:
${sample}`,
      },
    ], 200);

    const parsed = JSON.parse(response.content);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        .map(k => k.toLowerCase().trim())
        .slice(0, MAX_KEYWORDS);
    }
    return [];
  } catch (error) {
    console.error('Keyword extraction failed, continuing without keywords:', error);
    return [];
  }
}

// TODO: consider if this should be here or in utils
/**
 * Background document processing function
 * 
 * PURPOSE: Process uploaded documents for AI ingestion
 * - Updates document status throughout processing
 * - Converts file content to text
 * - Processes document with enhanced processor (chunking, embedding)
 * - Updates final status and metadata
 * 
 * TODO:
 * - Consider moving to a proper job queue system (Redis, Bull, etc.)
 * - Add retry logic for failed processing
 * - Add progress callbacks for real-time updates
 * - Consider implementing streaming for large files
 */
async function processDocumentInBackground(
  documentId: string,
  file: File,
  companyId: string,
  userId: string | null,
  supabase: any
) {
  try {
    // Update document status to processing
    await supabase
      .from('ai_documents')
      .update({
        ingestion_status: 'processing',
        ingestion_progress: 10, // TODO: Make this dynamic based on the file size
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    // Extract text content based on file type
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let fileContent: string;

    if (file.type === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      fileContent = pdfData.text;
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      fileContent = result.value;
    } else {
      fileContent = buffer.toString('utf-8');
    }

    if (!fileContent || fileContent.trim().length === 0) {
      await supabase
        .from('ai_documents')
        .update({
          ingestion_status: 'failed',
          ingestion_error: 'Could not extract text content from the file',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      return;
    }

    const result = await enhancedDocumentProcessor.processDocument(
      documentId,
      companyId,
      'upload',
      fileContent,
      {
        document_name: file.name,
        document_type: file.type,
        is_company_wide: userId === null,
        uploaded_by: userId
      }
    );

    const extractedKeywords = await extractDocumentKeywords(fileContent);

    // Update document with completion status and metadata
    const { error: updateError } = await supabase
      .from('ai_documents')
      .update({
        ingestion_status: 'completed',
        ingestion_progress: 100,
        chunks_count: result.chunksProcessed,
        extracted_keywords: extractedKeywords.length > 0 ? extractedKeywords : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error(`Error updating document ${documentId}:`, updateError);
    } else {
      console.log(`✅ Document ${documentId} processed successfully with ${result.chunksProcessed} chunks`);
    }
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    
    // Update document with error status and error message
    await supabase
      .from('ai_documents')
      .update({
        ingestion_status: 'failed',
        ingestion_error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
  }
} 