import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { unlink } from 'fs/promises';
import { validateFilename } from '@/utils/security/filename-validation';
import { createClient } from '@/lib/supabase/server';

/**
 * Semantic File Management API Route
 * 
 * PURPOSE: Delete semantic search and chat-related files with security validation
 * - Removes uploaded files from chat sessions and search results
 * - Enforces company isolation for file access
 * - Prevents path traversal attacks
 * TODO:
 * - Consider extracting common file operations into utilities
 * - Complete integration with file-service.ts
 * - Add file analytics and usage tracking
 * 
 * ROUTE: /api/semantic/files/[fileName]
 */

async function deleteFileHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ fileName: string }>
) {
  try {
    const { fileName } = await params;
    
    if (!fileName) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // 1. Security: Validate filename to prevent path traversal attacks
    const validation = validateFilename(fileName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error || 'Invalid filename' }, { status: 400 });
    }

    // 2. Get current user and company context
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user's company information
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 });
    }

    // 3. Build file path with company isolation for multi-tenancy
    const filePath = `companies/${userProfile.company_id}/files/${fileName}`;

    // 4. Perform file deletion
    try {
      await unlink(filePath);
      return NextResponse.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('File deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error during file deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Apply dynamic authentication wrapper
export const DELETE = withAuthDynamic(deleteFileHandler);

// TODO: Consider extracting common file operations into utilities when the team grows
// and patterns become clearer. 
// 
// NOTE: This route is part of a chatbot application that is still in development.
// The route is implemented with proper security, but the service layer integration
// (file-service.ts) is not yet complete.

