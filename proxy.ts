import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 `proxy` (replaces the deprecated `middleware`). Runs on the nodejs runtime.
 * Responsibilities:
 *  1. Refresh the Supabase auth session cookie on every request (must call getUser()).
 *  2. Guard the authenticated (app) routes — redirect signed-out users to /login.
 */

// Routes that require an authenticated user.
const PROTECTED_PREFIXES = ['/home', '/scan', '/recipe', '/fridge', '/history', '/favorites', '/plan', '/nutrition', '/shopping', '/family', '/community', '/profile', '/settings', '/upgrade', '/admin']
// Auth pages a signed-in user shouldn't see.
const AUTH_PAGES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: use getUser() (revalidates the token with Supabase), not getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  if (user && AUTH_PAGES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Let `?lang=vi|en` links seed the locale cookie so SSR renders that language.
  const langParam = request.nextUrl.searchParams.get('lang')
  if (langParam === 'vi' || langParam === 'en') {
    response.cookies.set('mm-lang', langParam, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
