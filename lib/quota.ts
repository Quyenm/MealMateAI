import { createAdminClient } from "@/lib/supabase/server";

export type Quota = {
  tier: string;
  used: number;
  scan_limit: number;
  remaining: number;
  suggestions_per_scan: number;
};

export async function getQuota(userId: string): Promise<Quota | null> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("get_quota_status", { p_user: userId });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as Quota) ?? null;
}

/**
 * Atomically commit one billable scan (increments today's counter if under the tier limit).
 * Returns { ok: false } when the tier limit is reached.
 */
export async function commitScan(userId: string): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("increment_scan_usage", { p_user: userId });
  if (error) {
    if (error.message?.includes("quota_exceeded")) return { ok: false };
    throw error;
  }
  return { ok: true };
}
