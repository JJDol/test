/**
 * Project Template Reupload Route
 *
 * PURPOSE: Upload a customized version of a template for a specific project
 * - Extracts variables from uploaded file
 * - Compares with original template to show changes
 * - Stores as project-specific template (doesn't affect global template)
 * - Updates project's custom_templates field
 *
 * ROUTE: POST /api/projects/[id]/reupload-template
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

import { VariableProcessor } from '@/lib/services/processors/project-variable-processor';

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

async function reuploadProjectTemplateHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  let blobUrl: string = '';

  try {
    const { id: projectId } = await params;
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

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', currentUserProfile.company_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Check permissions - only project leader, admin, or company admin can reupload
    const canReupload =
      currentUserProfile.role === 'ADMIN' ||
      currentUserProfile.role === 'COMPANY_ADMIN' ||
      project.leader_id === request.user.id;

    if (!canReupload) {
      return NextResponse.json({
        message: 'You do not have permission to customize templates for this project'
      }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    blobUrl = formData.get('blobUrl') as string;
    const fileName = formData.get('fileName') as string;
    const templateName = formData.get('templateName') as string;

    if (!templateName) {
      return NextResponse.json({ message: 'Template name is required' }, { status: 400 });
    }

    if (!file && !blobUrl) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Get original template to compare variables
    const { data: originalTemplate, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', templateName)
      .single();

    if (templateError || !originalTemplate) {
      return NextResponse.json({ message: 'Original template not found' }, { status: 404 });
    }

    // Get file buffer
    let fileBuffer: ArrayBuffer;
    const originalFilename = file?.name || fileName || `${templateName}.docx`;

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

    // Extract variables from uploaded file
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

    // Compare with original template variables
    const originalVariables = originalTemplate.variables || [];
    const changesSummary = compareVariables(originalVariables, formattedVariables);

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

    // Build file path for project-specific template
    const fileExt = sanitizedFileName.substring(sanitizedFileName.lastIndexOf('.'));
    const fileBase = sanitizedFileName.substring(0, sanitizedFileName.lastIndexOf('.'));
    const projectFileName = `project-templates/${projectId}/${fileBase}_custom${fileExt}`;

    // Upload file to storage
    const { error: uploadError } = await storageService.uploadFile(
      {
        companyId: currentUserProfile.company_id,
        isPublic: false // Project-specific templates are always private
      },
      projectFileName,
      fileBuffer,
      {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true // Allow overwriting if re-customizing
      }
    );

    if (uploadError) {
      console.error('Storage error:', uploadError);
      return NextResponse.json({
        message: 'Failed to upload file to storage',
        details: uploadError.message
      }, { status: 500 });
    }

    // Update project's custom_templates field
    const currentCustomTemplates = project.custom_templates || {};
    const lockedVersion = project.template_version_locks?.[templateName] || originalTemplate.current_version || 1;

    const updatedCustomTemplates = {
      ...currentCustomTemplates,
      [templateName]: {
        file_name: projectFileName,
        variables: formattedVariables,
        original_version: lockedVersion,
        created_at: new Date().toISOString()
      }
    };

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        custom_templates: updatedCustomTemplates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Project update error:', updateError);
      // Clean up uploaded file
      await storageService.deleteFile(
        { companyId: currentUserProfile.company_id, isPublic: false },
        projectFileName
      );
      throw updateError;
    }

    // Trigger recalculation of general variables as variables might have changed
    try {
      const variableProcessor = new VariableProcessor();
      await variableProcessor.updateProjectGeneralVariables(
        projectId,
        currentUserProfile.company_id,
        request.user.id
      );
      console.log('General variables recalculated after template reupload');
    } catch (recalcError) {
      console.error('Failed to recalculate general variables after reupload:', recalcError);
      // We don't fail the whole request because the primary task (uploading) succeeded
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
      message: 'Project template customized successfully',
      templateName,
      changes: changesSummary,
      customTemplate: {
        file_name: projectFileName,
        variables: formattedVariables,
        original_version: lockedVersion
      }
    });

  } catch (error) {
    console.error('Error reuploading project template:', error);
    return NextResponse.json({
      message: 'Failed to customize project template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuthDynamic(reuploadProjectTemplateHandler);
