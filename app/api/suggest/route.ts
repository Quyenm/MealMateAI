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

  // Personalize from the user's saved taste (read server-side, not client-trusted).
  const { data: prefs } = await supabase
    .from("profiles")
    .select("dietary_pref, cook_time_pref, spice_pref, allergies, never_suggest")
    .eq("id", user.id)
    .single();

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
    result = await suggestDishes(ingredients, prefs ?? parsed.data.prefs);
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
  const ranked = [...result.dishes].sort((a, b) => nonStapleMissing(a) - nonStapleMissing(b));
  // Attach an illustrative photo per dish (Pexels, fetched in parallel, cached
  // in the row below). Fails open to no-image if PEXELS_API_KEY is unset.
  const dishes = await Promise.all(
    ranked
      .slice(0, (quota?.suggestions_per_scan ?? 3) + 4)
      .map(async (d) => ({
        ...d,
        cookable_now: nonStapleMissing(d) === 0,
        image: (await fetchDishImage(d.title_en || d.title_vi)) ?? undefined,
      })),
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
  return NextResponse.json({
    scanId: scan?.id ?? null,
    dishes,
    quota: newQuota,
    noMatch: dishes.length === 0,
  });
}
