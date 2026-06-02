import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin approves/rejects a pending payment. Approve = mark paid + upgrade the user's tier. */
export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { paymentId, action } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "reject") {
    await admin.from("payments").update({ status: "canceled" }).eq("id", paymentId);
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (payment.status !== "paid") {
      const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
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
      await admin
        .from("profiles")
        .update({ tier: payment.tier_purchased })
        .eq("id", payment.user_id);
      await admin
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", paymentId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
