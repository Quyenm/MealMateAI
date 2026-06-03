import { getCurrentUser, getIsAdmin, type SessionUser } from "@/lib/auth";

/**
 * Returns the current user only if they are an admin, else null.
 * Uses the request-cached helpers so the /admin page and the (app) layout's
 * nav share the same auth + profiles round-trips.
 */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await getIsAdmin()) ? user : null;
}
