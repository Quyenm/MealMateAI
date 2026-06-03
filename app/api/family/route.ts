import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["create", "join", "leave"]),
  name: z.string().trim().min(1).max(60).optional(),
  code: z.string().trim().min(4).max(12).optional(),
});

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/** Create / join / leave a household (shared fridge). A user is in at most one. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { action, name, code } = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (action === "create") {
    if (existing) return NextResponse.json({ error: "already_member" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "invalid" }, { status: 400 });
    let hid: string | null = null;
    for (let i = 0; i < 5 && !hid; i++) {
      const { data, error } = await admin
        .from("households")
        .insert({ name, join_code: genCode(), created_by: user.id })
        .select("id")
        .single();
      if (!error && data) hid = data.id;
      else if (error && error.code !== "23505") {
        console.error("create household failed", error);
        return NextResponse.json({ error: "create_failed" }, { status: 500 });
      }
    }
    if (!hid) return NextResponse.json({ error: "create_failed" }, { status: 500 });
    await admin.from("household_members").insert({ household_id: hid, user_id: user.id, role: "owner" });
    return NextResponse.json({ ok: true });
  }

  if (action === "join") {
    if (existing) return NextResponse.json({ error: "already_member" }, { status: 400 });
    if (!code) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { data: hh } = await admin
      .from("households")
      .select("id")
      .eq("join_code", code.toUpperCase())
      .maybeSingle();
    if (!hh) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { count } = await admin
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", hh.id);
    if ((count ?? 0) >= 6) return NextResponse.json({ error: "full" }, { status: 400 });
    await admin.from("household_members").insert({ household_id: hh.id, user_id: user.id, role: "member" });
    return NextResponse.json({ ok: true });
  }

  if (action === "leave") {
    if (existing) {
      await admin.from("household_members").delete().eq("user_id", user.id);
      // return this user's contributed items to personal
      await admin
        .from("inventory_items")
        .update({ household_id: null })
        .eq("user_id", user.id)
        .eq("household_id", existing.household_id);
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
