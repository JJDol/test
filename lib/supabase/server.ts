import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type CookieOptions } from '@supabase/ssr'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

// This client is for App Router (app directory)
export const createClient = async () => {
  console.log('[SUPABASE] Creating server client...');
  try {
    const cookieStore = await cookies();
    console.log('[SUPABASE] Cookie store obtained');

        const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, '', options)
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    console.log('[SUPABASE] Server client created successfully');
    return client;
  } catch (error) {
    console.error('[SUPABASE] Error creating server client:', error);
    console.error('[SUPABASE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};

// This client is for API Routes in the App Router (app/api directory)
export const createApiClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )
}