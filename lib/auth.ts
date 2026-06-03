import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };

/**
 * Current request's user, deduped per request with React `cache()`.
 *
 * Uses getClaims() (verifies the JWT locally when the project has asymmetric
 * signing keys → no network round-trip) instead of getUser(). The proxy still
 * calls getUser() on every request, which refreshes the session cookie, so by
 * the time a page renders the access token is already fresh — getClaims just
 * reads it. Falls back to getUser() if claims are unavailable, so it's never
 * less correct than before, just faster on the happy path.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims as { sub?: string; email?: string } | undefined;
    if (!error && claims?.sub) {
      return { id: claims.sub, email: claims.email ?? "" };
    }
  } catch {
    // fall through to getUser()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? "" } : null;
});

/** Whether the current request's user is an admin (deduped per request). */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return !!data?.is_admin;
});
