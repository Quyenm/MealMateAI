import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  tier: z.enum(["free", "vip", "svip", "family"]),
  display_label: z.string().trim().min(1).max(40),
  price_vnd: z.number().int().min(0).max(100_000_000),
  daily_scan_limit: z.number().int().min(0).max(100_000),
  suggestions_per_scan: z.number().int().min(1).max(10),
});

/** Admin: edit a plan's price / quota / suggestions. Read live by the app. */
export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { tier, ...fields } = parsed.data;

  const { error } = await createAdminClient().from("tier_limits").update(fields).eq("tier", tier);
  if (error) {
    console.error("/api/admin/tier-limits failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
