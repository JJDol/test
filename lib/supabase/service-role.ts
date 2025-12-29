import { createClient as createBrowserClient } from '@supabase/supabase-js'

// Service role client that bypasses RLS policies
// Use this for admin operations like password reset
// WARNING: This client has full database access - use with extreme caution
export const createServiceRoleClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
} 