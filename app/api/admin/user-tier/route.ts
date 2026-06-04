import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  userId: z.string().uuid(),
  tier: z.enum(["free", "vip", "svip", "family"]),
});

/** Admin: manually set a user's plan (service role bypasses the tier-pin trigger). */
export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { userId, tier } = parsed.data;

  const { error } = await createAdminClient().from("profiles").update({ tier }).eq("id", userId);
  if (error) {
    console.error("/api/admin/user-tier failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
