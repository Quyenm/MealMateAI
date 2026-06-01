import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client (uses the public anon key, RLS-gated).
 * Safe to use in Client Components.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
