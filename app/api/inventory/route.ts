import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Item = z.object({
  name: z.string().trim().min(1).max(80),
  name_en: z.string().trim().max(80).optional(),
  amount: z.string().max(16).optional(),
  expiry_date: z.string().max(20).optional(),
});

const Body = z.object({
  action: z.enum(["add", "update", "remove", "deduct"]),
  items: z.array(Item).max(60).optional(),
  id: z.string().uuid().optional(),
  expiry_date: z.string().max(20).nullable().optional(),
  names: z.array(z.string().trim().min(1).max(80)).max(60).optional(),
});

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { action, items, id, expiry_date, names } = parsed.data;
  const admin = createAdminClient();

  // The caller's household (shared fridge) if any.
  const { data: hm } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const hid = hm?.household_id ?? null;
  // Filter that scopes a query to the user's own rows OR their household's.
  const scope = hid ? `user_id.eq.${user.id},household_id.eq.${hid}` : null;

  if (action === "add") {
    const rows = (items ?? []).map((it) => ({
      user_id: user.id,
      household_id: hid,
      name: it.name,
      name_en: it.name_en ?? null,
      amount: it.amount ?? null,
      expiry_date: it.expiry_date || null,
    }));
    if (!rows.length) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { data, error } = await admin
      .from("inventory_items")
      .insert(rows)
      .select("id, name, name_en, amount, expiry_date");
    if (error) {
      console.error("/api/inventory add failed", error);
      return NextResponse.json({ error: "add_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, items: data });
  }

  if (action === "update" && id) {
    let q = admin.from("inventory_items").update({ expiry_date: expiry_date || null }).eq("id", id);
    q = scope ? q.or(scope) : q.eq("user_id", user.id);
    await q;
    return NextResponse.json({ ok: true });
  }

  if (action === "remove" && id) {
    let q = admin.from("inventory_items").delete().eq("id", id);
    q = scope ? q.or(scope) : q.eq("user_id", user.id);
    await q;
    return NextResponse.json({ ok: true });
  }

  if (action === "deduct" && names?.length) {
    let sel = admin.from("inventory_items").select("id, name, name_en");
    sel = scope ? sel.or(scope) : sel.eq("user_id", user.id);
    const { data: inv } = await sel;
    const used = names.map(norm).filter((s) => s.length > 1);
    const toRemove = (inv ?? [])
      .filter((row) => {
        const n = norm(row.name);
        const ne = row.name_en ? norm(row.name_en) : "";
        return used.some((u) => n.includes(u) || u.includes(n) || (ne && (ne.includes(u) || u.includes(ne))));
      })
      .map((row) => row.id);
    if (toRemove.length) {
      await admin.from("inventory_items").delete().in("id", toRemove);
    }
    return NextResponse.json({ ok: true, removed: toRemove.length });
  }

  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
