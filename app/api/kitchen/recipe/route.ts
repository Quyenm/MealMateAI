import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateRecipeScript } from "@/lib/ai/openai";
import { underSpendCap, recordSpend } from "@/lib/spend-guard";
import { rateLimit } from "@/lib/ratelimit";
import type { Recipe } from "@/lib/kitchen/recipes";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const PAID = new Set(["vip", "svip", "family"]);

const Step = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("chop"), item: z.string().min(1).max(40), slices: z.coerce.number().int().min(2).max(6) }),
  z.object({ kind: z.literal("add"), item: z.string().min(1).max(40) }),
  z.object({ kind: z.literal("stirfry"), seconds: z.coerce.number().int().min(4).max(20) }),
  z.object({ kind: z.literal("season"), item: z.string().min(1).max(40) }),
  z.object({ kind: z.literal("plate"), garnish: z.string().max(40).optional() }),
]);

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "dish";
}

/** Generate a cooking-game script for an arbitrary dish (VIP+ only). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("tier").eq("id", user.id).single();
  if (!PAID.has((prof?.tier as string) ?? "free")) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  if (!(await rateLimit("kitchen", user.id)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = z
    .object({ title: z.string().min(1).max(80) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (!(await underSpendCap())) return NextResponse.json({ error: "service_paused" }, { status: 503 });

  let raw;
  try {
    raw = await generateRecipeScript(parsed.data.title);
    await recordSpend(raw.cost);
  } catch (e) {
    console.error("/api/kitchen/recipe failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  const steps = z.array(Step).min(2).max(8).safeParse(raw.steps);
  if (!steps.success || steps.data.length < 2) {
    return NextResponse.json({ error: "bad_script" }, { status: 502 });
  }

  const recipe: Recipe = {
    id: slug(parsed.data.title),
    title_vi: parsed.data.title,
    steps: steps.data,
  };
  return NextResponse.json({ recipe });
}
