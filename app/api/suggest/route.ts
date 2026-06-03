import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { suggestDishes, type Ingredient } from "@/lib/ai/openai";
import { fetchDishImage } from "@/lib/images";
import { underSpendCap, recordSpend } from "@/lib/spend-guard";
import { getQuota, commitScan } from "@/lib/quota";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SuggestBody = z.object({
  ingredients: z
    .array(
      z.object({
        name_vi: z.string().min(1).max(80),
        name_en: z.string().max(80).optional(),
        confidence: z.number().optional(),
        expiring: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(40),
  prefs: z.record(z.string(), z.unknown()).optional(),
});

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

  if (!(await rateLimit("suggest", user.id)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SuggestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "no_ingredients" }, { status: 400 });
  }
  const ingredients = parsed.data.ingredients as Ingredient[];

  // Personalize: saved taste + dishes the user rated highly (lean toward them) +
  // recently-suggested dishes (push for variety). All read server-side.
  const [{ data: prefs }, { data: liked }, { data: recentSug }] = await Promise.all([
    supabase
      .from("profiles")
      .select("dietary_pref, cook_time_pref, spice_pref, allergies, never_suggest")
      .eq("id", user.id)
      .single(),
    supabase
      .from("ratings")
      .select("dish_title")
      .eq("user_id", user.id)
      .gte("stars", 4)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("suggestions")
      .select("dishes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const likedTitles = [...new Set((liked ?? []).map((r) => r.dish_title).filter(Boolean))].slice(0, 10);
  const recentTitles = [
    ...new Set(
      (recentSug ?? []).flatMap((s) => {
        const arr = Array.isArray(s.dishes) ? (s.dishes as { title_vi?: string }[]) : [];
        return arr.map((d) => d?.title_vi).filter((x): x is string => !!x);
      }),
    ),
  ].slice(0, 15);

  // Quota pre-check (no token spend if already at the limit).
  const quota = await getQuota(user.id);
  if (quota && quota.remaining <= 0) {
    return NextResponse.json({ error: "quota_exceeded", quota }, { status: 402 });
  }
  if (!(await underSpendCap())) {
    return NextResponse.json({ error: "service_paused" }, { status: 503 });
  }

  let result;
  try {
    result = await suggestDishes(ingredients, prefs ?? parsed.data.prefs, {
      liked: likedTitles,
      recent: recentTitles,
    });
    await recordSpend(result.cost);
  } catch (e) {
    console.error("/api/suggest failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  // Commit the billable scan atomically (guards against races).
  const committed = await commitScan(user.id);
  if (!committed.ok) {
    return NextResponse.json({ error: "quota_exceeded" }, { status: 402 });
  }

  // Rank cookable-now first (nothing missing beyond staples), then near-cookable
  // (missing ~1 common item) so a sparse fridge still gets options. The near ones
  // keep their missing_ingredients so the UI can show "also needs X".
  const nonStapleMissing = (d: (typeof result.dishes)[number]) =>
    (d.missing_ingredients ?? []).filter((m) => !isStaple(m)).length;
  // Drop clearly-nonsense dishes that don't actually use anything in the pantry
  // (accent-insensitive fuzzy match). Falls back to all if it would empty out.
  const norm = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
  const pantry = ingredients.map((g) => norm(g.name_vi)).filter((s) => s.length > 1);
  const usesPantry = (d: (typeof result.dishes)[number]) =>
    (d.uses_ingredients ?? []).some((u) => {
      const un = norm(u);
      return un.length > 1 && pantry.some((p) => p.includes(un) || un.includes(p));
    });
  const sane = result.dishes.filter(usesPantry);
  const pool = sane.length ? sane : result.dishes;
  // Protein/"meat" dishes first (accented match — avoids cá/cà, gà/gạo collisions).
  const MEAT = ["thịt", "bò", "gà", "heo", "lợn", "cá", "tôm", "vịt", "cua", "mực", "trứng", "băm", "sườn", "nạc", "ba chỉ", "giò", "chả", "xúc xích", "ngao", "nghêu"];
  const usesMeat = (d: (typeof result.dishes)[number]) =>
    (d.uses_ingredients ?? []).some((u) => {
      const u0 = u.toLowerCase();
      return MEAT.some((m) => u0.includes(m));
    });
  const ranked = [...pool].sort(
    (a, b) =>
      nonStapleMissing(a) - nonStapleMissing(b) ||
      (usesMeat(b) ? 1 : 0) - (usesMeat(a) ? 1 : 0),
  );
  const admin = createAdminClient();
  // Attach a real dish photo (YouTube thumbnail, cached in dish_images, fetched
  // in parallel). Returns null when no key/match — the UI shows a branded
  // placeholder rather than an unrelated stock photo.
  const dishes = await Promise.all(
    ranked
      .slice(0, 10)
      .map(async (d) => ({
        ...d,
        cookable_now: nonStapleMissing(d) === 0,
        image: (await fetchDishImage(d.title_vi, d.title_en, admin)) ?? undefined,
      })),
  );

  // Persist (text only — never the photo).
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
  return NextResponse.json({
    scanId: scan?.id ?? null,
    dishes,
    quota: newQuota,
    noMatch: dishes.length === 0,
  });
}
