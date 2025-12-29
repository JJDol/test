import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('Middleware executing for path:', request.nextUrl.pathname);
  
  // Initialize response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in middleware:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
      
      // If we can't authenticate, allow the request but log the issue
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production'
            })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            })
          },
        },
      }
    )

    // Always redirect root path to sign-in
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Get the session and user data
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const user = session?.user || null

    // Check if session is expired
    let sessionValid = false
    if (session && session.expires_at) {
      const now = Math.floor(Date.now() / 1000)
      sessionValid = session.expires_at > now
    } else if (session) {
      sessionValid = true // No expiry time means it's valid
    }

    // Debug logging
    console.log('Auth state:', {
      path: request.nextUrl.pathname,
      hasSession: !!session,
      sessionValid,
      hasUser: !!user,
      userEmail: user?.email,
      sessionExpiry: session?.expires_at
    })

    // Define route types
    const isPublicRoute = ['/sign-in', '/sign-up', '/auth/callback', '/forgot-password', '/reset-password'].includes(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/reset-password/')
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/')
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/protected/')
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin/')
    const isStaticRoute = request.nextUrl.pathname.match(/^\/(_next|images|favicon\.ico)/)

    // Allow static routes to pass through
    if (isStaticRoute) {
      return response
    }

    // Allow API routes to pass through - they have their own auth middleware
    if (isApiRoute) {
      return response
    }

    // Handle auth callback route
    if (request.nextUrl.pathname === '/auth/callback') {
      return response
    }

    // Redirect unauthenticated users or users with invalid sessions trying to access protected routes
    if ((!user || !sessionValid) && (isProtectedRoute || isAdminRoute)) {
      const redirectUrl = new URL('/sign-in', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      redirectUrl.searchParams.set('reason', sessionValid ? 'auth_required' : 'session_expired')
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and session is valid
    if (user && sessionValid) {
      // Allow sign-in page to show if there's an inactivity reason (for dialog display)
      if (request.nextUrl.pathname === '/sign-in' && request.nextUrl.searchParams.get('reason') === 'inactivity') {
        return response
      }
      
      // Only redirect from sign-in/sign-up pages if there's no redirect parameter AND no reason parameter
      // This prevents redirect loops when user is being redirected due to auth issues
      if ((request.nextUrl.pathname === '/sign-in' || request.nextUrl.pathname === '/sign-up') 
          && !request.nextUrl.searchParams.has('redirect')
          && !request.nextUrl.searchParams.has('reason')) {
        return NextResponse.redirect(new URL('/protected/dashboard', request.url))
      }

      // Handle admin routes
      if (isAdminRoute) {
        try {
          const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

          if (roleError || !userData || userData.role !== 'ADMIN') {
            console.log('Access denied: Not an admin', {
              userId: user.id,
              role: userData?.role,
              error: roleError
            })
            return NextResponse.redirect(new URL('/protected/dashboard', request.url))
          }
        } catch (dbError) {
          console.error('Database error checking admin role:', dbError)
          // Redirect to dashboard on database error to be safe
          return NextResponse.redirect(new URL('/protected/dashboard', request.url))
        }
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // On critical error, still allow the request to proceed but log the issue
    return response
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
