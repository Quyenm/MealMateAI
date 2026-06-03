import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["add", "toggle", "remove", "clearChecked"]),
  names: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  id: z.string().uuid().optional(),
  checked: z.boolean().optional(),
});

/** Manage the user's shopping list (add items, toggle bought, remove, clear bought). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { action, names, id, checked } = parsed.data;

  const admin = createAdminClient();

  if (action === "add") {
    const rows = (names ?? []).map((name) => ({ user_id: user.id, name }));
    if (!rows.length) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { data, error } = await admin.from("shopping_items").insert(rows).select("id, name, checked");
    if (error) {
      console.error("/api/shopping add failed", error);
      return NextResponse.json({ error: "add_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, items: data });
  }

  if (action === "toggle" && id) {
    await admin.from("shopping_items").update({ checked: !!checked }).eq("user_id", user.id).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "remove" && id) {
    await admin.from("shopping_items").delete().eq("user_id", user.id).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "clearChecked") {
    await admin.from("shopping_items").delete().eq("user_id", user.id).eq("checked", true);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
