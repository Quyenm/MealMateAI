import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// All fields optional — the Taste screen sends prefs, the Profile screen sends a
// display_name; only the provided keys are updated. (tier/is_admin are pinned by
// a DB trigger regardless.)
const Body = z.object({
  display_name: z.string().trim().min(1).max(40).optional(),
  dietary_pref: z.enum(["none", "keto", "eat_clean", "muscle_gain"]).optional(),
  cook_time_pref: z.enum(["5min", "15min", "30min_plus"]).optional(),
  spice_pref: z.enum(["mild", "medium", "hot"]).optional(),
  allergies: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  never_suggest: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
});

/** Save the signed-in user's profile / taste prefs (own row). */
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
  const fields = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  if (!Object.keys(fields).length) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
  if (error) {
    console.error("/api/profile update failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
