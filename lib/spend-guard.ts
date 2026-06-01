import { createAdminClient } from "@/lib/supabase/server";

const CAP_USD = Number(process.env.GLOBAL_DAILY_SPEND_CAP_USD || "5");

function todayHCMC(): string {
  // YYYY-MM-DD in Asia/Ho_Chi_Minh — matches the DB column default.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** Global daily spend circuit-breaker: returns true if we may still call the AI today. */
export async function underSpendCap(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("global_spend_counter")
    .select("spend_usd")
    .eq("usage_date", todayHCMC())
    .maybeSingle();
  const spent = Number(data?.spend_usd ?? 0);
  return spent < CAP_USD;
}

/** Record the cost of an AI call into today's global counter. */
export async function recordSpend(estUsd: number): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("record_ai_spend", { p_est_usd: estUsd });
}
