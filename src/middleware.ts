import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This middleware refreshes the user's session and adds the supabase-auth-token cookie
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = await createClient()
  
  // Refresh the user's session if needed
  const { data: { session } } = await supabase.auth.getSession()
  
  // If the user is not logged in and trying to access a protected route, redirect to sign-in
  if (!session && !req.nextUrl.pathname.startsWith('/auth/')) {
    const redirectUrl = new URL('/auth/sign-in', req.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  return res
}

// Add a matcher for API routes and private pages, but exclude authentication routes
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|auth/sign-in|auth/sign-up).*)',
  ],
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}