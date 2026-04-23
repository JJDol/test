import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js Middleware - Session gating for page routes
 *
 * Design notes:
 * - Static assets, API routes, and the OAuth callback short-circuit BEFORE any
 *   Supabase call. API routes run their own auth via `withAuth` in each handler,
 *   so running `getSession()` here is pure duplication and triggers unnecessary
 *   token-refresh races on Vercel serverless (multiple instances refreshing in
 *   parallel can corrupt the refresh-token rotation).
 * - We intentionally do NOT access `session.user` here. Using `getSession()` only
 *   for existence/expiry checks avoids Supabase's "insecure" warning and avoids
 *   unnecessary round-trips to the Auth server. Admin routes fall back to the
 *   authoritative `getUser()` because role checks must be trustworthy.
 * - Cookie options are left to Supabase defaults; forcing `httpOnly: true` would
 *   prevent the browser client from hydrating the session.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;

  // Route type detection (no Supabase call required)
  const isStaticRoute = !!path.match(/^\/(_next|images|favicon\.ico)/) || path === '/sw.js';
  const isApiRoute = path.startsWith('/api/');
  const isAuthCallback = path === '/auth/callback';
  const isProtectedRoute = path.startsWith('/protected/');
  const isAdminRoute = path.startsWith('/admin/');
  const isSignInOrUp = path === '/sign-in' || path === '/sign-up';

  // Fast paths - no session check needed
  if (isStaticRoute || isApiRoute || isAuthCallback) {
    return response;
  }

  // Redirect root to sign-in (preserves existing behavior)
  if (path === '/') {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in middleware');
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    // Only check for session existence/expiry here — do NOT read session.user.
    // That avoids Supabase's "insecure" warning and doesn't require contacting
    // the Auth server on every page navigation.
    const { data: { session } } = await supabase.auth.getSession();
    const now = Math.floor(Date.now() / 1000);
    const hasValidSession = !!session && (!session.expires_at || session.expires_at > now);

    // Gate protected/admin routes for unauthenticated users
    if (!hasValidSession && (isProtectedRoute || isAdminRoute)) {
      const redirectUrl = new URL('/sign-in', request.url);
      redirectUrl.searchParams.set('redirect', path);
      redirectUrl.searchParams.set('reason', session ? 'session_expired' : 'auth_required');
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from sign-in/sign-up, unless they
    // arrived with a specific reason (e.g. inactivity, session_expired) or a
    // post-auth redirect target.
    if (hasValidSession && isSignInOrUp) {
      if (request.nextUrl.searchParams.has('redirect') || request.nextUrl.searchParams.has('reason')) {
        return response;
      }
      return NextResponse.redirect(new URL('/protected/dashboard', request.url));
    }

    // Admin routes need authoritative role validation — use getUser() here
    // because it verifies the JWT with the Supabase Auth server.
    if (hasValidSession && isAdminRoute) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.redirect(new URL('/sign-in?reason=auth_required', request.url));
      }
      try {
        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (roleError || !userData || userData.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/protected/dashboard', request.url));
        }
      } catch (dbError) {
        console.error('Database error checking admin role:', dbError);
        return NextResponse.redirect(new URL('/protected/dashboard', request.url));
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     * Note: API routes now have their own dedicated auth middleware
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
