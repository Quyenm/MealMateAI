import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookData } from "@/lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PayOS payment webhook: verify signature, then flip the user's tier on success. */
export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload?.data || !payload?.signature) {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }
  if (!verifyWebhookData(payload.data, payload.signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  const data = payload.data as Record<string, unknown>;
  const orderCode = data.orderCode as number;
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("payos_order_code", orderCode)
    .maybeSingle();

  if (!payment) return NextResponse.json({ success: true }); // unknown order — just ack
  if (payment.status === "paid") return NextResponse.json({ success: true }); // idempotent

  const paid = data.code === "00" || payload.code === "00" || payload.success === true;
  if (!paid) {
    await admin
      .from("payments")
      .update({ status: "failed", raw_webhook: payload })
      .eq("id", payment.id);
    return NextResponse.json({ success: true });
  }

  const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  // Expire any current active sub, then activate the purchased tier.
  await admin
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", payment.user_id)
    .eq("status", "active");
  await admin.from("subscriptions").insert({
    user_id: payment.user_id,
    tier: payment.tier_purchased,
    status: "active",
    current_period_end: periodEnd,
  });
  // profiles.tier is the source of truth for quota (service role bypasses the tier-pin trigger).
  await admin
    .from("profiles")
    .update({ tier: payment.tier_purchased })
    .eq("id", payment.user_id);
  await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      raw_webhook: payload,
    })
    .eq("id", payment.id);

  return NextResponse.json({ success: true });
}
