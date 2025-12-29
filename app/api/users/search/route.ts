import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';

/**
 * User Search API Route
 * 
 * PURPOSE: Provide secure user search functionality within company boundaries
 * - Searches users by email and name within the same company
 * - Enforces multi-tenant isolation through company_id filtering
 * - Limits search results for performance and security
 * - Supports real-time user discovery for collaboration features
 * 
 * TODO:
 * - Implement advanced search filters (role, department, project assignment)
 * - Add search result ranking and relevance scoring
 * - Consider implementing full-text search with PostgreSQL extensions
 * - Add search result caching for frequently searched terms
 * - Implement search analytics and popular search tracking
 * - Add search result export functionality
 * - Consider implementing search suggestions and autocomplete
 * - Add search result pagination for large result sets
 * - Implement search result highlighting and context
 * - Add search permission controls for sensitive user data
 * 
 * ROUTE: /api/users/search
 */

async function searchUsersHandler(request: AuthenticatedRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ message: "Search query is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    
    // Get current user and their company for multi-tenancy validation (auth middleware already has this)
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

    console.log('Searching users with query:', query);

    // Search for users within the same company only
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('company_id', currentUserProfile.company_id) // 🔑 MULTI-TENANT FILTER
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(5);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // If no results found, try to get all users in the company (for debugging)
    if (!users || users.length === 0) {
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('company_id', currentUserProfile.company_id); // 🔑 MULTI-TENANT FILTER
      
      console.log('No results found.');
      if (allError) console.error('Error fetching all users:', allError);
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json({ message: "Failed to search users" }, { status: 500 });
  }
}

// Apply authentication wrapper
export const GET = withAuth(searchUsersHandler); 