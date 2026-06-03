import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().uuid().optional(),
  scan_id: z.string().uuid().optional(),
  dish_index: z.number().int().min(0).max(20).optional(),
  dish: z.record(z.string(), z.unknown()).optional(),
  saved: z.boolean(),
});

/** Toggle a saved/favorite dish. saved=true upserts (needs scan_id+dish_index+dish);
 *  saved=false removes by id (favorites page) or by scan_id+dish_index (toggle). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { id, scan_id, dish_index, dish, saved } = parsed.data;

  const admin = createAdminClient();

  if (saved) {
    if (!scan_id || dish_index === undefined || !dish) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const { error } = await admin
      .from("saved_dishes")
      .upsert(
        { user_id: user.id, scan_id, dish_index, dish },
        { onConflict: "user_id,scan_id,dish_index" },
      );
    if (error) {
      console.error("/api/favorites save failed", error);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // remove
  let q = admin.from("saved_dishes").delete().eq("user_id", user.id);
  if (id) q = q.eq("id", id);
  else if (scan_id && dish_index !== undefined) q = q.eq("scan_id", scan_id).eq("dish_index", dish_index);
  else return NextResponse.json({ error: "invalid" }, { status: 400 });
  await q;
  return NextResponse.json({ ok: true });
}
