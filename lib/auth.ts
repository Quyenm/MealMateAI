import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Current request's user, deduped with React `cache()`.
 *
 * Without this, the (app) layout's nav AND each page would every nav pay a
 * separate Supabase auth round-trip. `cache()` memoizes for the lifetime of a
 * single server request, so layout + page share ONE call.
 *
 * NOTE: this does not replace the proxy's getUser() — the proxy still refreshes
 * the session cookie and guards routes on every request (a different context).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
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
