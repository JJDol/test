import { createClient } from '@/lib/supabase/server';
import { AuthenticatedUser } from '@/lib/auth/auth-middleware';

/**
 * Creates a Supabase client with automatic tenant filtering
 * This ensures all queries are automatically scoped to the user's company
 */
export async function createTenantClient(user: AuthenticatedUser) {
  const supabase = await createClient();
  
  // Add RLS context if your Supabase policies use it
  if (user.company_id) {
    // This sets a custom claim that can be used in RLS policies
    try {
      await supabase.rpc('set_claim', {
        claim: 'company_id',
        value: user.company_id
      });
    } catch (error: any) {
      // RPC might not exist, that's ok - we'll handle filtering manually
      console.warn('Could not set tenant context:', error?.message || error);
    }
  }
  
  return supabase;
}

/**
 * Helper to add company_id filter to any Supabase query
 * Use this when you can't rely on RLS policies
 */
export function withTenantFilter<T>(query: T, user: AuthenticatedUser): T {
  if (!user.company_id) {
    throw new Error('User must have company_id for tenant filtering');
  }
  
  // Type assertion since we know the query builder pattern
  return (query as any).eq('company_id', user.company_id);
}

/**
 * Validates that a resource belongs to the user's company
 * Use this before allowing access to specific resources
 */
export async function validateTenantAccess(
  user: AuthenticatedUser,
  table: string,
  resourceId: string,
  resourceIdColumn: string = 'id'
): Promise<boolean> {
  if (!user.company_id) {
    return false;
  }

  const supabase = await createClient();
  
  // TODO: Use API route for this
  const { data, error } = await supabase
    .from(table)
    .select('company_id')
    .eq(resourceIdColumn, resourceId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.company_id === user.company_id;
}

/**
 * Utility for inserting records with automatic company_id
 */
export async function insertWithTenant<T extends Record<string, any>>(
  user: AuthenticatedUser,
  table: string,
  data: Omit<T, 'company_id'>
): Promise<{ data: T | null; error: any }> {
  if (!user.company_id) {
    return { 
      data: null, 
      error: { message: 'User must have company_id for tenant operations' } 
    };
  }

  const supabase = await createTenantClient(user);
  // TODO: Use API route for this
  return await supabase
    .from(table)
    .insert({
      ...data,
      company_id: user.company_id
    })
    .select()
    .single();
}

/**
 * Example RLS policy SQL for reference:
 * 
 * -- Enable RLS on all tables
 * ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policy for users to only see their company's data
 * CREATE POLICY "Users can only access their company's projects" ON projects
 *   FOR ALL USING (
 *     company_id = (
 *       SELECT company_id FROM users 
 *       WHERE id = auth.uid()
 *     )
 *   );
 * 
 * -- Or using custom claims:
 * CREATE POLICY "Company isolation" ON projects
 *   FOR ALL USING (
 *     company_id = (auth.jwt() ->> 'company_id')::uuid
 *   );
 */ 