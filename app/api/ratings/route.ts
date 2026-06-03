import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  scan_id: z.string().uuid(),
  dish_index: z.number().int().min(0).max(20),
  dish_title: z.string().min(1).max(200),
  stars: z.number().int().min(1).max(5),
});

/** Upsert a 1–5 star rating for a dish (identified by scan_id + dish_index). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Service-role write scoped to this user; the scan_id is the user's own (FK +
  // the unique(user_id,scan_id,dish_index) constraint key the upsert).
  const admin = createAdminClient();
  const { error } = await admin
    .from("ratings")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id,scan_id,dish_index" });
  if (error) {
    console.error("/api/ratings upsert failed", error);
    return NextResponse.json({ error: "rate_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
