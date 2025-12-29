/**
 * Document Template Variable Extraction - Blob Upload Route
 * 
 * PURPOSE: Handle blob-based file uploads for template variable extraction
 * - Processes file uploads through Vercel Blob storage
 * - Validates file types and upload paths for security
 * - Generates secure upload tokens with user context
 * - Supports large file processing with extended timeout
 * TODO:
 * - Add file content validation for malicious content
 * - Consider implementing upload progress tracking
 * - Add upload analytics and monitoring
 * - Consider cleanup of temporary uploads
 * 
 * ROUTE: POST /api/document-templates/extract-variables-blob
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for processing large files

// Configure the route for large requests
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

async function extractVariablesBlobHandler(request: AuthenticatedRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate file type and path structure
        if (!pathname.toLowerCase().endsWith('.docx')) {
          throw new Error('Invalid file type. Only .docx files are allowed.');
        }

        // Validate that the path starts with temp-uploads/
        if (!pathname.startsWith('temp-uploads/')) {
          throw new Error('Invalid upload path. Must use temp-uploads/ prefix.');
        }

        console.log('Generating upload token for:', {
          pathname,
          userId: request.user.id,
        });

        // Return upload configuration
        return {
          allowedContentTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          tokenPayload: JSON.stringify({
            userId: request.user.id,
            uploadedAt: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('File uploaded to Vercel Blob:', {
          blobUrl: blob.url,
          pathname: blob.pathname,
          userId: request.user.id,
        });
        // onUploadCompleted must return void
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error in blob upload handler:', error);
    return NextResponse.json({ 
      message: 'Failed to handle file upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuth(extractVariablesBlobHandler); 