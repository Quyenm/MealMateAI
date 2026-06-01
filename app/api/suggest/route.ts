import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { suggestDishes, type Ingredient } from "@/lib/ai/openai";
import { underSpendCap, recordSpend } from "@/lib/spend-guard";
import { getQuota, commitScan } from "@/lib/quota";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STAPLES = [
  "muối", "dầu", "nước mắm", "đường", "tiêu", "nước", "bột ngọt", "hạt nêm",
  "salt", "oil", "fish sauce", "sugar", "pepper", "water",
];

function isStaple(name: string): boolean {
  const n = name.toLowerCase();
  return STAPLES.some((s) => n.includes(s));
}

/** Recipe step (the billable action): confirmed ingredients -> up to 3 Vietnamese dishes. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ingredients: Ingredient[] = Array.isArray(body?.ingredients) ? body.ingredients : [];
  if (!ingredients.length) {
    return NextResponse.json({ error: "no_ingredients" }, { status: 400 });
  }

  // Quota pre-check (no token spend if already at the limit).
  const quota = await getQuota(user.id);
  console.log("[suggest] pre-check quota", JSON.stringify(quota));
  if (quota && quota.remaining <= 0) {
    return NextResponse.json({ error: "quota_exceeded", quota }, { status: 402 });
  }
  if (!(await underSpendCap())) {
    return NextResponse.json({ error: "service_paused" }, { status: 503 });
  }

  let result;
  try {
    result = await suggestDishes(ingredients, body?.prefs);
    await recordSpend(result.cost);
  } catch (e) {
    console.error("/api/suggest failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  // Commit the billable scan atomically (guards against races).
  const committed = await commitScan(user.id);
  console.log("[suggest] committed", committed.ok);
  if (!committed.ok) {
    return NextResponse.json({ error: "quota_exceeded" }, { status: 402 });
  }

  // Drop dishes needing a non-staple ingredient the user doesn't have.
  const cookable = result.dishes.filter(
    (d) => (d.missing_ingredients ?? []).filter((m) => !isStaple(m)).length === 0,
  );
  const dishes = (cookable.length ? cookable : result.dishes).slice(
    0,
    quota?.suggestions_per_scan ?? 3,
  );

  // Persist (text only — never the photo).
  const admin = createAdminClient();
  const { data: scan } = await admin
    .from("scans")
    .insert({
      user_id: user.id,
      status: "suggested",
      ai_model: process.env.OPENAI_MODEL ?? "gpt-4o",
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (scan) {
    await admin.from("scan_ingredients").insert(
      ingredients.map((g, i) => ({
        scan_id: scan.id,
        user_id: user.id,
        name_vi: g.name_vi,
        name_en: g.name_en,
        is_expiring: !!g.expiring,
        position: i,
      })),
    );
    await admin.from("suggestions").insert({
      scan_id: scan.id,
      user_id: user.id,
      dishes,
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      est_cost_usd: result.cost,
      prioritized_expiring: ingredients.some((g) => g.expiring),
    });
  }

  const newQuota = await getQuota(user.id);
  return NextResponse.json({ dishes, quota: newQuota, noMatch: dishes.length === 0 });
}
