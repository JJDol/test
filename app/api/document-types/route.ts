import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * API endpoint to fetch document types from document_default_variables
 * Used by the Word add-in to show available document types by category
 */

// Map from API category names to database category names
const categoryDbNameMap: Record<string, string> = {
  'ARCHITECTURE': 'ARCHITECTURE',
  'CONSTRUCTIONS': 'CONSTRUCTION',
  'FIRE': 'FIRE',
  'AUTHORITY_PROCESSING': 'AUTHORITY PROCESSING',
  'ENERGY': 'ENERGY',
  'HVAC': 'HVAC',
  'EXECUTION_CONTROL': 'EXECUTION CONTROL'
};

async function getDocumentTypesHandler(request: AuthenticatedRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('document_default_variables')
      .select('id, category, document_type, description, variables')
      .neq('category', 'GLOBAL'); // Exclude global variables

    if (category) {
      // Map API category name to database category name
      const dbCategoryName = categoryDbNameMap[category] || category;
      query = query.eq('category', dbCategoryName);
    }

    const { data, error } = await query.order('document_type');

    if (error) throw error;

    // Transform to a cleaner format for the add-in
    const documentTypes = (data || []).map(item => ({
      id: item.id,
      name: item.document_type,
      category: item.category,
      description: item.description,
      variables: item.variables || []
    }));

    return NextResponse.json(documentTypes);
  } catch (error: any) {
    console.error('Error fetching document types:', error);
    const errorMessage = error?.message || error?.details || JSON.stringify(error) || 'Unknown error';
    return NextResponse.json({ 
      message: 'Failed to fetch document types',
      details: errorMessage
    }, { status: 500 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export const GET = withAuth(getDocumentTypesHandler);
