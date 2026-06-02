import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** User claims they transferred money -> create a pending payment for the admin to review. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { tier } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tier_limits")
    .select("price_vnd")
    .eq("tier", tier)
    .single();
  if (!t || t.price_vnd <= 0) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  await admin.from("payments").insert({
    user_id: user.id,
    payos_order_code: Date.now(),
    amount_vnd: t.price_vnd,
    tier_purchased: tier,
    status: "pending",
    method: "manual_qr",
  });

  return NextResponse.json({ ok: true });
}
