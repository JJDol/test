/**
 * Contract File Blob Upload Handler
 * 
 * Handles Vercel Blob client uploads for contract files (PDF, DOCX, TXT)
 * that exceed the 4.5MB serverless function body limit.
 * 
 * ROUTE: POST /api/ai/extract-contract-blob
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

async function contractBlobHandler(request: AuthenticatedRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          throw new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.');
        }
        if (!pathname.startsWith('contract-uploads/')) {
          throw new Error('Invalid upload path.');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: 20 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            userId: request.user.id,
            uploadedAt: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Contract file uploaded to blob:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error in contract blob upload:', error);
    return NextResponse.json({
      error: 'Failed to handle file upload',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const POST = withAuth(contractBlobHandler);
