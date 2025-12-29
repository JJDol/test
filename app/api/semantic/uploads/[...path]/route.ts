import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { validateFilename } from '@/utils/security/filename-validation';

/**
 * Semantic File Upload Retrieval API Route
 * 
 * PURPOSE: Serve uploaded files for semantic search and chat sessions with security validation
 * - Retrieves files uploaded during chat conversations and search operations
 * - Supports various file types (PDF, images, documents)
 * - Enforces company isolation for file access

 * TODO:
 * - Consider consolidating with other file operations
 * - Evaluate storage strategy (local vs cloud)
 * - Add file access analytics
 * 
 * ROUTE: /api/semantic/uploads/[...path]
 */

async function getUploadedFileHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ path: string[] }>
) {
  try {
    const { path: pathSegments } = await params;
    
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // 1. Security: Validate path segments to prevent path traversal attacks
    const fileName = pathSegments.join('/');
    const validation = validateFilename(fileName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error || 'Invalid file path' }, { status: 400 });
    }

    // 2. Get current user and company context
    const supabase = await createClient();
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) {
      console.error('User profile error:', currentUserError);
      return NextResponse.json({ error: 'Failed to retrieve user profile' }, { status: 500 });
    }

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // 3. Build file path with company isolation for multi-tenancy
    const companyId = currentUserProfile.company_id || 'admin';
    const normalizedPath = path.normalize(fileName);
    const filePath = path.join(process.cwd(), 'uploads', companyId, normalizedPath);

    // 4. Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 5. Perform file operation (read file)
    try {
      const fileBuffer = await readFile(filePath);
      
      // Determine content type based on file extension
      const ext = path.extname(normalizedPath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.txt':
          contentType = 'text/plain';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
      }

      // Create response with file data
      const response = new NextResponse(fileBuffer as BodyInit);
      response.headers.set('Content-Type', contentType);
      response.headers.set('Content-Disposition', `inline; filename="${path.basename(normalizedPath)}"`);
      
      return response;
    } catch (error) {
      console.error('File read error:', error);
      return NextResponse.json({ 
        error: 'Failed to read file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error serving uploaded file:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply dynamic authentication wrapper
export const GET = withAuthDynamic(getUploadedFileHandler);

// TODO: Consider extracting common file operations into utilities when the team grows
// 
// NOTE: This route is part of a chatbot application that is still in development.
// The route is implemented with proper security and is actively used for serving
// uploaded documents in the FileList component.
//