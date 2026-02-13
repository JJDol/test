/**
 * Document Template Reupload Route
 *
 * PURPOSE: Upload a new version of an existing document template
 * - Extracts variables from new file
 * - Compares with existing version to generate changes summary
 * - Creates new version record in template_versions
 * - Updates the main template record
 *
 * ROUTE: POST /api/document-templates/[name]/reupload
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';
import { extractTemplateVariables } from '@/lib/services/extractors/enhanced-variable-extractor';
import { del } from '@vercel/blob';
import { Buffer } from 'buffer';
import { DocumentVariable } from '@/lib/types/variable-types';
import { VersionChangesSummary, VariableChange } from '@/lib/types/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Compare two variable arrays and generate a changes summary
 * Detects changes in both type and scope
 */
function compareVariables(
  oldVars: DocumentVariable[],
  newVars: DocumentVariable[]
): VersionChangesSummary {
  const oldMap: Record<string, DocumentVariable> = {};
  const newMap: Record<string, DocumentVariable> = {};

  oldVars.forEach(v => { oldMap[v.name] = v; });
  newVars.forEach(v => { newMap[v.name] = v; });

  const added: VariableChange[] = [];
  const removed: VariableChange[] = [];
  const modified: VariableChange[] = [];

  // Find added and modified variables
  for (const name of Object.keys(newMap)) {
    const newVar = newMap[name];
    const oldVar = oldMap[name];
    
    // Get scope values (default to 'local' if not set)
    const newScope = (newVar as any).scope || 'local';
    const oldScope = oldVar ? ((oldVar as any).scope || 'local') : undefined;
    
    if (!oldVar) {
      // New variable added
      added.push({ name, type: newVar.type });
    } else {
      // Check for type or scope changes
      const typeChanged = oldVar.type !== newVar.type;
      const scopeChanged = oldScope !== newScope;
      
      if (typeChanged || scopeChanged) {
        modified.push({
          name,
          ...(typeChanged && { oldType: oldVar.type, newType: newVar.type }),
          ...(scopeChanged && { oldScope, newScope })
        });
      }
    }
  }

  // Find removed variables
  for (const name of Object.keys(oldMap)) {
    if (!newMap[name]) {
      removed.push({ name, type: oldMap[name].type });
    }
  }

  return { added, removed, modified };
}

async function reuploadTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ name: string }>
) {
  let blobUrl: string = '';

  try {
    const { name: templateName } = await params;
    const supabase = await createClient();

    // Get current user profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) throw profileError;

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Get existing template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', templateName)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Check permissions - only owner can update personal templates, admins/managers for public
    if (!template.is_public && template.user_id !== request.user.id) {
      return NextResponse.json({
        message: 'You do not have permission to update this template'
      }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    blobUrl = formData.get('blobUrl') as string;
    const fileName = formData.get('fileName') as string;
    const variableMappings = formData.get('variableMappings') as string;

    // Parse variable mappings if provided (for renamed variables)
    let mappings: Record<string, string> = {};
    if (variableMappings) {
      try {
        mappings = JSON.parse(variableMappings);
      } catch (e) {
        console.warn('Failed to parse variable mappings:', e);
      }
    }

    if (!file && !blobUrl) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Get file buffer
    let fileBuffer: ArrayBuffer;
    const originalFilename = file?.name || fileName || template.original_file_name || 'template.docx';

    if (file) {
      fileBuffer = await file.arrayBuffer();
    } else if (blobUrl) {
      const blobResponse = await fetch(blobUrl);
      if (!blobResponse.ok) {
        throw new Error(`Failed to download file from blob: ${blobResponse.status}`);
      }
      fileBuffer = await blobResponse.arrayBuffer();

      // Verify ZIP signature
      const uint8Array = new Uint8Array(fileBuffer);
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
        throw new Error('Downloaded file does not have valid ZIP signature');
      }
    } else {
      throw new Error('No file or blob URL provided');
    }

    // Extract variables from new file
    const buffer = Buffer.from(fileBuffer);
    const newVariables = extractTemplateVariables(buffer);

    if (!newVariables) {
      return NextResponse.json({
        message: 'Failed to extract variables from uploaded file'
      }, { status: 500 });
    }

    // Format variables
    const formattedVariables: DocumentVariable[] = newVariables.map((variable: DocumentVariable) => ({
      name: variable.name,
      type: variable.type,
      scope: 'scope' in variable ? variable.scope : 'local', // Include scope (defaults to 'local')
      originalTag: 'originalTag' in variable ? variable.originalTag : undefined,
      id: 'id' in variable ? variable.id : undefined,
      title: 'title' in variable ? variable.title : undefined,
      dateFormat: 'dateFormat' in variable ? variable.dateFormat : undefined,
      dropdownOptions: 'dropdownOptions' in variable ? variable.dropdownOptions : undefined,
      currentContent: 'currentContent' in variable ? variable.currentContent : undefined,
    }));

    // Compare with existing variables
    const oldVariables = template.variables || [];
    const changesSummary = compareVariables(oldVariables, formattedVariables);

    // Add variable mappings to changes summary
    if (Object.keys(mappings).length > 0) {
      for (const removedVar of changesSummary.removed) {
        if (mappings[removedVar.name]) {
          removedVar.mappedTo = mappings[removedVar.name];
        }
      }
    }

    // Calculate new version number
    const currentVersion = template.current_version || 1;
    const newVersion = currentVersion + 1;

    // Sanitize filename for storage
    let sanitizedFileName = originalFilename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[æøåÆØÅ]/g, (match: string) => {
        const replacements: { [key: string]: string } = {
          'æ': 'ae', 'ø': 'o', 'å': 'a',
          'Æ': 'AE', 'Ø': 'O', 'Å': 'A'
        };
        return replacements[match] || match;
      })
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);

    // Add version to filename to avoid conflicts
    const fileExt = sanitizedFileName.substring(sanitizedFileName.lastIndexOf('.'));
    const fileBase = sanitizedFileName.substring(0, sanitizedFileName.lastIndexOf('.'));
    const versionedFileName = `${fileBase}_v${newVersion}${fileExt}`;

    // Build file path
    let filePath = versionedFileName;
    if (!template.is_public) {
      filePath = `${request.user.id}/${versionedFileName}`;
    }

    // Upload new file to storage
    // Use upsert: true to handle cases where a previous upload attempt failed
    // and left a partial file with the same version number
    const { error: uploadError } = await storageService.uploadFile(
      {
        companyId: currentUserProfile.company_id,
        isPublic: template.is_public
      },
      filePath,
      fileBuffer,
      {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      }
    );

    if (uploadError) {
      console.error('Storage error:', uploadError);
      return NextResponse.json({
        message: 'Failed to upload file to storage',
        details: uploadError.message
      }, { status: 500 });
    }

    // Create version record
    const { error: versionError } = await supabase
      .from('template_versions')
      .insert({
        template_name: templateName,
        version: newVersion,
        file_name: filePath,
        original_file_name: originalFilename,
        variables: formattedVariables,
        changes_summary: changesSummary,
        created_by: request.user.id,
        company_id: currentUserProfile.company_id
      });

    if (versionError) {
      console.error('Version insert error:', versionError);
      // Clean up uploaded file
      await storageService.deleteFile(
        { companyId: currentUserProfile.company_id, isPublic: template.is_public },
        filePath
      );
      throw versionError;
    }

    // Update main template record
    const { error: updateError } = await supabase
      .from('document_templates')
      .update({
        file_name: filePath,
        original_file_name: originalFilename,
        variables: formattedVariables,
        current_version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('name', templateName);

    if (updateError) {
      console.error('Template update error:', updateError);
      throw updateError;
    }

    // Clean up blob if used
    if (blobUrl) {
      try {
        await del(blobUrl);
      } catch (cleanupError) {
        console.warn('Failed to clean up blob file:', cleanupError);
      }
    }

    return NextResponse.json({
      message: 'Template updated successfully',
      version: newVersion,
      changes: changesSummary,
      template: {
        name: templateName,
        current_version: newVersion,
        variables: formattedVariables
      }
    });

  } catch (error) {
    console.error('Error reuploading template:', error);
    return NextResponse.json({
      message: 'Failed to reupload template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(reuploadTemplateHandler);
