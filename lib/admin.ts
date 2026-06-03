import type { User } from "@supabase/supabase-js";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";

/**
 * Returns the current user only if they are an admin, else null.
 * Uses the request-cached helpers so the /admin page and the (app) layout's
 * nav share the same getUser()/profiles round-trips.
 */
export async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await getIsAdmin()) ? user : null;
}
