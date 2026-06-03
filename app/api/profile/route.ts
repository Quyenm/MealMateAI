import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  dietary_pref: z.enum(["none", "keto", "eat_clean", "muscle_gain"]),
  cook_time_pref: z.enum(["5min", "15min", "30min_plus"]),
  spice_pref: z.enum(["mild", "medium", "hot"]),
  allergies: z.array(z.string().trim().min(1).max(40)).max(30),
  never_suggest: z.array(z.string().trim().min(1).max(40)).max(30),
});

/** Save the signed-in user's taste preferences (own row; tier/is_admin are pinned by a trigger). */
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

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    console.error("/api/profile update failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
