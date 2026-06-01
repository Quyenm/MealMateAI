import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { payosConfigured, createPaymentLink } from "@/lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!payosConfigured()) {
    return NextResponse.json({ error: "payos_not_configured" }, { status: 503 });
  }

  const { tier } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tier_limits")
    .select("price_vnd, display_label")
    .eq("tier", tier)
    .single();
  if (!t || t.price_vnd <= 0) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  const orderCode = Date.now();
  const origin = new URL(req.url).origin;

  await admin.from("payments").insert({
    user_id: user.id,
    payos_order_code: orderCode,
    amount_vnd: t.price_vnd,
    tier_purchased: tier,
    status: "pending",
  });

  try {
    const { checkoutUrl } = await createPaymentLink({
      orderCode,
      amount: t.price_vnd,
      description: `MealMate ${t.display_label}`.slice(0, 25),
      cancelUrl: `${origin}/upgrade?canceled=1`,
      returnUrl: `${origin}/upgrade/result`,
    });
    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    console.error("payos create-link failed", e);
    return NextResponse.json({ error: "payos_error" }, { status: 502 });
  }
}
