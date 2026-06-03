import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["add", "remove", "setGoal"]),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dish_title: z.string().trim().max(200).optional(),
  kcal: z.number().int().min(0).max(20000).optional(),
  protein_g: z.number().int().min(0).max(2000).optional(),
  carbs_g: z.number().int().min(0).max(2000).optional(),
  fat_g: z.number().int().min(0).max(2000).optional(),
  id: z.string().uuid().optional(),
  goal: z.number().int().min(0).max(20000).nullable().optional(),
});

/** Log dish macros to a day, remove a log entry, or set the daily kcal goal. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const b = parsed.data;
  const admin = createAdminClient();

  if (b.action === "add" && b.log_date && b.dish_title) {
    const { data, error } = await admin
      .from("macro_log")
      .insert({
        user_id: user.id,
        log_date: b.log_date,
        dish_title: b.dish_title,
        kcal: b.kcal ?? 0,
        protein_g: b.protein_g ?? 0,
        carbs_g: b.carbs_g ?? 0,
        fat_g: b.fat_g ?? 0,
      })
      .select("id, dish_title, kcal, protein_g, carbs_g, fat_g")
      .single();
    if (error) {
      console.error("/api/nutrition add failed", error);
      return NextResponse.json({ error: "add_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, item: data });
  }
  if (b.action === "remove" && b.id) {
    await admin.from("macro_log").delete().eq("user_id", user.id).eq("id", b.id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "setGoal") {
    await admin.from("profiles").update({ daily_kcal_goal: b.goal ?? null }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
