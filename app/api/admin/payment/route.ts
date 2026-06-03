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
    // One atomic transaction (see migration 0006): mark paid + upgrade tier +
    // refresh subscription. Idempotent on already-paid payments.
    const { error } = await admin.rpc("approve_payment", { p_payment_id: paymentId });
    if (error) {
      console.error("approve_payment failed", error);
      return NextResponse.json({ error: "approve_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
