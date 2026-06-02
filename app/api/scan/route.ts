import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recognizeIngredients } from "@/lib/ai/openai";
import { underSpendCap, recordSpend } from "@/lib/spend-guard";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ScanBody = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(2_200_000),
});

/** Vision step: image -> ingredient list. NOT quota-billed (quota is decremented on /api/suggest). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit("scan", user.id)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Reject oversized payloads before parsing the whole body.
  if (Number(req.headers.get("content-length") || 0) > 3_000_000) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ScanBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
  const { imageDataUrl } = parsed.data;

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
