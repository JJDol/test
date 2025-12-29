/**
 * Document Template Blob Processing Route
 * 
 * PURPOSE: Process uploaded blob files to extract template variables
 * - Downloads files from Vercel Blob storage for processing
 * - Extracts variables and content controls from .docx files
 * - Validates file integrity and size before processing
 * - Provides comprehensive variable extraction results
 * TODO:
 * - Add blob URL validation and security checks
 * - Consider implementing file caching for performance
 * - Add processing analytics and monitoring
 * - Consider cleanup of processed blob files
 * 
 * ROUTE: POST /api/document-templates/process-blob
 */
import { NextResponse } from 'next/server';
import { extractTemplateVariables } from '@/lib/services/extractors/enhanced-variable-extractor';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for processing large files

async function processBlobHandler(request: AuthenticatedRequest) {
  try {
    const { blobUrl, filename, size } = await request.json();
    
    if (!blobUrl || !filename) {
      return NextResponse.json({ 
        message: 'Blob URL and filename are required' 
      }, { status: 400 });
    }

    // Validate file type
    if (!filename.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ 
        message: 'Invalid file type. Only .docx files are allowed.' 
      }, { status: 400 });
    }

    console.log('Processing blob file:', {
      blobUrl,
      filename,
      size,
      userId: request.user.id,
    });

    // Download the file from Vercel Blob
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file from blob: ${response.statusText}`);
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());
    
    // Validate file size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileBuffer.length > maxSize) {
      return NextResponse.json({ 
        message: 'File too large. Maximum size is 50MB.' 
      }, { status: 400 });
    }

    // Process the file to extract variables using unified function
    const variablesWithTypes = extractTemplateVariables(fileBuffer);
    
    console.log('Variable extraction completed:', {
      filename,
      fileSize: fileBuffer.length,
      extractedVariables: variablesWithTypes,
      variableCount: variablesWithTypes.length,
      userId: request.user.id,
    });

    return NextResponse.json({ 
      variables: variablesWithTypes,
      message: 'File processed successfully',
      blobInfo: {
        url: blobUrl,
        size: fileBuffer.length,
        processedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error processing blob file:', error);
    return NextResponse.json({ 
      message: 'Failed to process file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuth(processBlobHandler); 