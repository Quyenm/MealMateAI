import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ClaimBody = z.object({ tier: z.string().min(1).max(32) });

/** User claims they transferred money -> create a pending payment for the admin to review. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit("claim", user.id)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = ClaimBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }
  const { tier } = parsed.data;

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tier_limits")
    .select("price_vnd")
    .eq("tier", tier)
    .single();
  if (!t || t.price_vnd <= 0) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  // Dedup: reuse an existing pending claim instead of stacking the admin queue.
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, pending: true });
  }

  // Collision-resistant numeric order code (column is bigint).
  const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const { error } = await admin.from("payments").insert({
    user_id: user.id,
    payos_order_code: orderCode,
    amount_vnd: t.price_vnd,
    tier_purchased: tier,
    status: "pending",
    method: "manual_qr",
  });
  if (error) {
    // A unique-violation here means a concurrent request already created one.
    if (error.code === "23505") return NextResponse.json({ ok: true, pending: true });
    console.error("/api/payments/claim insert failed", error);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
