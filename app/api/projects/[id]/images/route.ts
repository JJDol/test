import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';
import { createClient } from '@/lib/supabase/server';

/**
 * Project Images API Routes
 * 
 * PURPOSE: Manage project-related images for document templates
 * - Upload images for use in document variables
 * - Retrieve images for document generation
 * - Delete images when no longer needed
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function uploadImageHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext
) {
  try {
    const { id: projectId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const variableName = formData.get('variableName') as string;
    const templateName = formData.get('templateName') as string;

    if (!file || !variableName || !templateName) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, variableName, templateName' 
      }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'File must be an image' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id, leader_id, workers')
      .eq('id', projectId)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check permissions (project leader, company admin, global admin, or project worker)
    const canUpload = currentUserProfile.role === 'ADMIN' || 
                     currentUserProfile.role === 'COMPANY_ADMIN' ||
                     project.leader_id === request.user.id ||
                     (project.workers && project.workers.includes(request.user.id));

    if (!canUpload) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const sanitizedVariableName = variableName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedTemplateName = templateName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedTemplateName}_${sanitizedVariableName}_${timestamp}.${fileExtension}`;
    
    // Create file path: projects/projectId/images/fileName
    const filePath = `projects/${projectId}/images/${fileName}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to storage
    const { error: uploadError } = await storageService.uploadFile(
      {
        companyId: currentUserProfile.company_id,
        isPublic: false
      },
      filePath,
      fileBuffer,
      {
        contentType: file.type,
        upsert: true
      }
    );

    if (uploadError) {
      console.error('Storage error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload image',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Return the file path for storage in the database
    return NextResponse.json({
      success: true,
      filePath: filePath,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Error uploading project image:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getImageHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext
) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const filePath = url.searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json({ error: 'Missing filePath parameter' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Download from storage
    const { data: fileData, error: downloadError } = await storageService.downloadFile(
      {
        companyId: currentUserProfile.company_id,
        isPublic: false
      },
      filePath
    );

    if (downloadError || !fileData) {
      return NextResponse.json({ 
        error: 'Failed to download image',
        details: downloadError?.message 
      }, { status: 500 });
    }

    // Determine content type from file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (extension) {
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Return the image
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Error getting project image:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function deleteImageHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const { filePath, templateName, variableName } = await request.json();
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    console.log(`Deleting image: ${filePath} for project ${id}`);
    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Delete the file from storage
    const { error } = await storageService.deleteFile(
      {
        companyId: currentUserProfile.company_id,
        isPublic: false
      },
      filePath
    );

    if (error) {
      console.error('Error deleting image from storage:', error);
      return NextResponse.json({ error: 'Failed to delete image from storage' }, { status: 500 });
    }

    console.log(`Successfully deleted image: ${filePath}`);
    return NextResponse.json({ success: true, message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuthDynamic(uploadImageHandler);
export const GET = withAuthDynamic(getImageHandler); 
export const DELETE = withAuthDynamic(deleteImageHandler);