import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recognizeIngredients } from "@/lib/ai/openai";
import { underSpendCap, recordSpend } from "@/lib/spend-guard";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Vision step: image -> ingredient list. NOT quota-billed (quota is decremented on /api/suggest). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const imageDataUrl: unknown = body?.imageDataUrl;
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
  if (imageDataUrl.length > 2_200_000) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  if (!(await underSpendCap())) {
    return NextResponse.json({ error: "service_paused" }, { status: 503 });
  }

  try {
    const { ingredients, cost } = await recognizeIngredients(imageDataUrl);
    await recordSpend(cost);
    if (!ingredients.length) {
      return NextResponse.json({ error: "vision_unreadable" }, { status: 422 });
    }
    return NextResponse.json({ ingredients });
  } catch (e) {
    console.error("/api/scan failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
