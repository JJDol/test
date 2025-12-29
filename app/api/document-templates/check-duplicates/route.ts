/**
 * Document Template Duplicate Check Route
 * 
 * PURPOSE: Check for naming and file conflicts when uploading templates
 * - Validates template name uniqueness within user/company scope
 * - Checks for filename conflicts in storage
 * - Supports both personal and public template validation
 * 
 * TODO:
 * - Consider moving sanitization logic to utils for reuse
 * - Add more comprehensive conflict checking
 * - Consider template versioning support
 * - Add conflict resolution suggestions
 * 
 * ROUTE: GET /api/document-templates/check-duplicates
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

async function checkDuplicatesHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateName = searchParams.get('name');
    const fileName = searchParams.get('fileName');
    const isPublic = searchParams.get('isPublic') === 'true';

    // Return early if no parameters provided
    if (!templateName || !fileName) {
      return NextResponse.json({ 
        hasNameConflict: false, 
        hasFileConflict: false 
      });
    }

    const supabase = await createClient();
    
    // Get current user profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return NextResponse.json({ 
        hasNameConflict: false, 
        hasFileConflict: false 
      });
    }

    // Sanitize the template name and filename
    const sanitizedTemplateName = sanitizeTemplateName(templateName);
    const sanitizedFileName = sanitizeFileName(fileName);

    // Check for name conflicts
    const nameConflicts = await checkNameConflicts(supabase, sanitizedTemplateName, isPublic, request.user.id);

    // Check for filename conflicts using original_file_name (use original fileName, not sanitized)
    const fileConflicts = await checkFileConflicts(supabase, fileName, isPublic, request.user.id, currentUserProfile.company_id);

    return NextResponse.json({
      hasNameConflict: nameConflicts && nameConflicts.length > 0,
      hasFileConflict: fileConflicts && fileConflicts.length > 0
    });

  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({ 
      hasNameConflict: false, 
      hasFileConflict: false 
    });
  }
}
//TODO: Consider moving this to utils
function sanitizeTemplateName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

function sanitizeFileName(fileName: string): string {
  return fileName
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
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}

async function checkNameConflicts(supabase: any, templateName: string, isPublic: boolean, userId: string) {
  let nameQuery = supabase
    .from('document_templates')
    .select('name')
    .eq('name', templateName);

  if (!isPublic) {
    nameQuery = nameQuery
      .eq('is_public', false)
      .eq('user_id', userId);
  } else {
    nameQuery = nameQuery
      .eq('is_public', true);
  }

  const { data: nameConflicts } = await nameQuery;
  return nameConflicts;
}

async function checkFileConflicts(supabase: any, originalFileName: string, isPublic: boolean, userId: string, companyId: string) {
  let fileQuery = supabase
    .from('document_templates')
    .select('original_file_name, name')
    .eq('original_file_name', originalFileName)
    .eq('company_id', companyId);

  if (!isPublic) {
    fileQuery = fileQuery
      .eq('is_public', false)
      .eq('user_id', userId);
  } else {
    fileQuery = fileQuery
      .eq('is_public', true);
  }

  const { data: fileConflicts } = await fileQuery;
  return fileConflicts;
}

export const GET = withAuth(checkDuplicatesHandler);
