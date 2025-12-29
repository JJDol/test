import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';
import { del } from '@vercel/blob';

// Since we are using formidable for parsing the form data,
// we need to export a configuration for the API route
export const dynamic = 'force-dynamic';

async function updateTemplateHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { originalName, name, description, category } = body as {
      originalName: string;
      name: string;
      description?: string | null;
      category?: string;
    };

    if (!originalName) {
      return NextResponse.json({ message: 'originalName is required' }, { status: 400 });
    }

    // Sanitize new name if provided
    // TODO: This sanitazion should be use as utility function in utils/sanitize.ts
    const sanitizedName = (name ?? originalName)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);

    if (description && description.length > 500) {
      return NextResponse.json({
        message: 'Description too long',
        details: `Description must be 500 characters or less (current: ${description.length})`
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Ensure user context
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    // Optional: prevent duplicate name if renaming
    if (sanitizedName !== originalName) {
      const { data: dup, error: dupError } = await supabase
        .from('document_templates')
        .select('name')
        .eq('name', sanitizedName)
        .maybeSingle();
      if (dupError) {
        // continue; RLS may block but we only need existence
        console.warn('Duplicate check error (non-fatal):', dupError.message);
      }
      if (dup) {
        return NextResponse.json({
          message: 'A template with this name already exists',
        }, { status: 400 });
      }
    }

    const payload: Record<string, any> = {};
    if (sanitizedName) payload.name = sanitizedName;
    if (typeof description !== 'undefined') payload.description = description || null;
    if (category) payload.category = category;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('document_templates')
      .update(payload)
      .eq('name', originalName)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Template updated', template: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({
      message: 'Failed to update template',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function getTemplatesHandler(request: AuthenticatedRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const isPublic = searchParams.get('isPublic');
  const isPrivate = searchParams.get('isPrivate');

  // TODO: add category validation and length check/limit
  
  try {
    const supabase = await createClient();
    
    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement)
    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    let query = supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply view mode filtering
    // TODO: 3 levels of access, public, private, and company-wide
    if (isPublic === 'true') {
      query = query.eq('is_public', true);
    } else if (isPrivate === 'true') {
      query = query.eq('is_public', false).eq('user_id', request.user.id);
    }
    // For 'all' view mode, rely on RLS to return all visible (company public + user's private)
    // TODO: We should not rely only on RLS

    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) throw error;
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function createTemplateHandler(request: AuthenticatedRequest) {
  // Declare variables in outer scope for error logging
  let name: string = '';
  let category: string = '';
  let variables: any[] = [];
  let fileBuffer: ArrayBuffer = new ArrayBuffer(0);
  let blobUrl: string = '';
  
  try {
    
    // Handle both direct file upload and blob URL
    const data = await request.formData();
    const file = data.get('file') as File;
    blobUrl = data.get('blobUrl') as string;
    const fileName = data.get('fileName') as string;
    name = data.get('name') as string;
    category = data.get('category') as string;
    const description = data.get('description') as string;
    // Try to get variables from either 'variablesWithTypes' (new format) or 'variables' (legacy)
    // TODO: We dont need the legacy variables, we can remove it
    const variablesWithTypes = data.get('variablesWithTypes') as string;
    const legacyVariables = data.get('variables') as string;
    variables = JSON.parse(variablesWithTypes || legacyVariables || '[]');
    

    
    console.log('Template creation - Variables received:', {
      variablesWithTypes: !!variablesWithTypes,
      legacyVariables: !!legacyVariables,
      parsedVariables: variables,
      variableCount: variables.length,
      hasFile: !!file,
      hasBlobUrl: !!blobUrl
    });
    const isPublic = (data.get('isPublic') as string) === 'true';

    // Validate required fields - either file or blobUrl must be provided
    if ((!file && !blobUrl) || !name || !category) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        details: {
          file: !file,
          blobUrl: !blobUrl,
          name: !name,
          category: !category
        }
      }, { status: 400 });
    }
    
    // Validate field lengths for production safety
    if (name.length > 100) {
      return NextResponse.json({ 
        message: 'Template name too long',
        details: `Template name must be 100 characters or less (current: ${name.length})`
      }, { status: 400 });
    }
    
    if (category.length > 50) {
      return NextResponse.json({ 
        message: 'Category too long',
        details: `Category must be 50 characters or less (current: ${category.length})`
      }, { status: 400 });
    }
    
    if (description && description.length > 500) {
      return NextResponse.json({ 
        message: 'Description too long',
        details: `Description must be 500 characters or less (current: ${description.length})`
      }, { status: 400 });
    }

    // Use the server-side Supabase client that maintains user session
    const supabase = await createClient();
    
    // Get user's company for multi-tenancy (auth middleware already verified user)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    // Ensure user has a company_id (multi-tenancy requirement)
    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }
    
    // Sanitize file name - get from file or fileName parameter
    const originalFilename = file?.name || fileName || 'template.docx';
    let sanitizedFileName = originalFilename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[æøåÆØÅ]/g, (match) => {
        const replacements: { [key: string]: string } = {
          'æ': 'ae', 'ø': 'o', 'å': 'a',
          'Æ': 'AE', 'Ø': 'O', 'Å': 'A'
        };
        return replacements[match] || match;
      })
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit length to 100 characters

    // Also sanitize the template name for database
    const sanitizedTemplateName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit to 100 characters
    
    console.log('Filename sanitization:', {
      original: originalFilename,
      sanitized: sanitizedFileName,
      originalName: name,
      sanitizedName: sanitizedTemplateName
    });
    
    // Use company-specific storage with the new storage service
    let filePath = sanitizedFileName;
    if (!isPublic) {
      filePath = `${request.user.id}/${sanitizedFileName}`;
    }

    // Check if template with this name already exists
    // TODO: public means public for the company, not public for the world
    let existingTemplateQuery = supabase
      .from('document_templates')
      .select('name, is_public, user_id')
      .eq('name', sanitizedTemplateName);

    // Only check for duplicates within the same visibility scope
    // For private templates: check if user already has a private template with this name
    // For public templates: check if a public template with this name exists
    
    if (!isPublic) {
      existingTemplateQuery = existingTemplateQuery
        .eq('is_public', false)
        .eq('user_id', request.user.id);
    } else {
      existingTemplateQuery = existingTemplateQuery
        .eq('is_public', true);
    }
    
    const { data: existingTemplates } = await existingTemplateQuery;

    if (existingTemplates && existingTemplates.length > 0) {
      console.log('Template with this name already exists in this scope:', existingTemplates);
      return NextResponse.json({ 
        message: 'A template with this name already exists', 
        details: `A ${isPublic ? 'public' : 'private'} template with the name "${sanitizedTemplateName}" already exists.`
      }, { status: 400 });
    }

    // Check if a template with the same filename already exists in the database
    
    let existingFilenameQuery = supabase
      .from('document_templates')
      .select('name, file_name, is_public, user_id')
      .eq('file_name', filePath);

    // Only check for duplicates within the same visibility scope
    if (!isPublic) {
      existingFilenameQuery = existingFilenameQuery
        .eq('is_public', false)
        .eq('user_id', request.user.id);
    } else {
      existingFilenameQuery = existingFilenameQuery
        .eq('is_public', true);
    }
    
    const { data: existingFilenameTemplates } = await existingFilenameQuery;

    if (existingFilenameTemplates && existingFilenameTemplates.length > 0) {
      console.log('Template with this filename already exists in this scope:', existingFilenameTemplates);
      return NextResponse.json({ 
        message: 'A template with this filename already exists', 
        details: `A ${isPublic ? 'public' : 'private'} template with the filename "${originalFilename}" already exists. Please rename the file or choose a different template name.`,
        errorType: 'DUPLICATE_FILENAME'
      }, { status: 400 });
    }

    // Get file buffer - either from direct upload or blob download
    let fileBuffer: ArrayBuffer;
    
    if (file) {
      // Direct file upload (small files)
      fileBuffer = await file.arrayBuffer();
    } else if (blobUrl) {
      // Download from Vercel Blob (large files) - preserve binary integrity
      console.log('Downloading file from blob:', blobUrl);
      
      try {
        const blobResponse = await fetch(blobUrl);
        
        if (!blobResponse.ok) {
          throw new Error(`Failed to download file from blob: ${blobResponse.status} ${blobResponse.statusText}`);
        }
        
        // Use arrayBuffer() directly to preserve binary data integrity
        fileBuffer = await blobResponse.arrayBuffer();
        
        console.log('Downloaded file from blob successfully:', {
          size: fileBuffer.byteLength,
          originalFilename,
          isValidBuffer: fileBuffer instanceof ArrayBuffer
        });
        
        // Verify the file is still a valid DOCX by checking the ZIP signature
        const uint8Array = new Uint8Array(fileBuffer);
        const isValidZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B; // "PK" ZIP signature
        
        if (!isValidZip) {
          throw new Error('Downloaded file does not have valid ZIP signature - file may be corrupted');
        }
        
        console.log('File integrity check passed - valid ZIP signature detected');
        
      } catch (fetchError) {
        console.error('Error fetching from blob URL:', fetchError);
        throw new Error(`Blob download failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('No file or blob URL provided');
    }

    // Check if file already exists in storage before uploading
    const { exists: fileExists, error: checkError } = await storageService.fileExists(
      {
        companyId: currentUserProfile.company_id,
        isPublic: isPublic
      },
      filePath
    );
    
    if (checkError) {
      console.warn('Error checking file existence (continuing with upload):', checkError);
    } else if (fileExists) {
      return NextResponse.json({ 
        message: 'A file with this name already exists in storage',
        details: `The file "${originalFilename}" already exists. Please rename the file or choose a different template name.`,
        errorType: 'DUPLICATE_FILE'
      }, { status: 400 });
    }

    // Upload file to storage using the new storage service
    console.log('Uploading file to storage:', {
      filePath,
      fileSize: fileBuffer.byteLength,
      companyId: currentUserProfile.company_id,
      isPublic
    });
    
    const { error: uploadError } = await storageService.uploadFile(
      {
        companyId: currentUserProfile.company_id,
        isPublic: isPublic
      },
      filePath,
      fileBuffer,
      {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      }
    );

    if (uploadError) {
      console.error('Storage error:', uploadError);
      
      // Handle specific storage errors with user-friendly messages
      if (uploadError.message?.includes('already exists') || uploadError.message?.includes('duplicate')) {
        return NextResponse.json({ 
          message: 'A file with this name already exists in storage',
          details: `The file "${originalFilename}" already exists. Please rename the file or choose a different template name.`,
          errorType: 'DUPLICATE_FILE'
        }, { status: 400 });
      }
      
      // Handle other storage errors
      return NextResponse.json({ 
        message: 'Failed to upload file to storage',
        details: uploadError.message || 'Storage upload failed',
        errorType: 'STORAGE_ERROR'
      }, { status: 500 });
    }

    // Create template record
    console.log('Creating template record in database:', {
      name: sanitizedTemplateName,
      category,
      variablesCount: variables.length,
      filePath,
      originalFilename,
      isPublic,
      userId: !isPublic ? request.user.id : null,
      companyId: currentUserProfile.company_id
    });
    
    const { error: dbError } = await supabase
      .from('document_templates')
      .insert({
        name: sanitizedTemplateName,
        description: description || null,
        category,
        variables,
        file_name: filePath,
        original_file_name: originalFilename,
        is_public: isPublic,
        user_id: !isPublic ? request.user.id : null,
        company_id: currentUserProfile.company_id // Always set company_id for multi-tenancy
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert failed (only for non-blob files)
      if (!blobUrl) {
        await storageService.deleteFile(
          {
            companyId: currentUserProfile.company_id,
            isPublic: isPublic
          },
          filePath
        );
      }
      throw dbError;
    }

    // Clean up temporary blob file if it was used
    if (blobUrl) {
      try {
        console.log('Cleaning up temporary blob file:', blobUrl);
        await del(blobUrl);
        console.log('Blob file cleaned up successfully');
      } catch (cleanupError) {
        console.warn('Failed to clean up blob file (non-critical):', cleanupError);
        // Don't throw error for cleanup failure - template was created successfully
      }
    }

    return NextResponse.json({ 
      message: 'Template uploaded successfully',
      template: {
        name: sanitizedTemplateName,
        category,
        description,
        is_public: isPublic,
        file_name: filePath
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating template:', error);
    console.error('Error details:', {
      name: typeof name,
      category: typeof category,
      variablesCount: variables?.length,
      fileSize: fileBuffer?.byteLength,
      hasBlobUrl: !!blobUrl,
      errorType: error?.constructor?.name,
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({ 
      message: 'Failed to create template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply authentication wrappers
export const GET = withAuth(getTemplatesHandler);
export const POST = withAuth(createTemplateHandler); 
export const PATCH = withAuth(updateTemplateHandler);