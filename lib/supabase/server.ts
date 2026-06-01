import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client bound to the request's cookies (RLS-gated, acts as the user).
 * Use in Server Components, Route Handlers, and Server Actions.
 * NOTE: Next.js 16 — `cookies()` is async and must be awaited.
 */
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
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component (cookies are read-only there).
            // Safe to ignore — the proxy refreshes the session cookie on each request.
          }
        },
      },
    },
  )
}

/**
 * Service-role client (server ONLY, bypasses RLS). Never expose to the browser.
 * Use for quota counters, the PayOS webhook, and other privileged writes (M2+).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
