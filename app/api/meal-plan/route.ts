import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["add", "remove"]),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dish: z.record(z.string(), z.unknown()).optional(),
  id: z.string().uuid().optional(),
});

/** Add or remove a dish on a day of the meal plan. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { action, plan_date, dish, id } = parsed.data;
  const admin = createAdminClient();

  if (action === "add" && plan_date && dish) {
    const { data, error } = await admin
      .from("meal_plan_items")
      .insert({ user_id: user.id, plan_date, dish })
      .select("id, plan_date, dish")
      .single();
    if (error) {
      console.error("/api/meal-plan add failed", error);
      return NextResponse.json({ error: "add_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, item: data });
  }
  if (action === "remove" && id) {
    await admin.from("meal_plan_items").delete().eq("user_id", user.id).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
