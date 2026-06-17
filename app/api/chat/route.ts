import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { streamCookChat, estimateCost, type ChatTurn } from "@/lib/ai/openai";
import { underSpendCap, recordSpend } from "@/lib/spend-guard";
import { rateLimit } from "@/lib/ratelimit";
import { getLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .max(8)
    .optional(),
});

const list = (v: unknown): string =>
  Array.isArray(v) ? (v as string[]).filter(Boolean).join(", ") : typeof v === "string" && v ? v : "";

/** Streaming cooking-assistant chat. Plain-text streamed body; metadata via headers. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit("chat", user.id)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createAdminClient();

  // Per-tier daily cap (atomic check + increment). Fail-open if the RPC errors
  // (e.g. migration 0020 not applied yet) so chat still works; the cap engages
  // once the migration is in place.
  const { data: bumpData, error: bumpErr } = await admin.rpc("bump_chat_usage", { p_user: user.id });
  const bump = (Array.isArray(bumpData) ? bumpData[0] : bumpData) as
    | { ok: boolean; used: number; chat_limit: number }
    | null;
  if (bumpErr) {
    console.error("bump_chat_usage failed (allowing this message)", bumpErr);
  } else if (!bump?.ok) {
    return NextResponse.json(
      { error: "chat_limit", used: bump?.used, limit: bump?.chat_limit },
      { status: 402 },
    );
  }

  if (!(await underSpendCap())) {
    return NextResponse.json({ error: "service_paused" }, { status: 503 });
  }

  // Build the user-context block (DATA, not instructions — see CHAT_SYSTEM guardrails).
  const locale = await getLocale();
  const [{ data: inv }, { data: prof }] = await Promise.all([
    admin
      .from("inventory_items")
      .select("name, expiry_date")
      .eq("user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .limit(40),
    admin
      .from("profiles")
      .select("dietary_pref, spice_pref, allergies, never_suggest")
      .eq("id", user.id)
      .single(),
  ]);

  const soon = Date.now() + 3 * 86400000;
  const fridge = (inv ?? []).map((i) => {
    const exp = i.expiry_date ? Date.parse(i.expiry_date as unknown as string) : NaN;
    return !Number.isNaN(exp) && exp <= soon ? `${i.name} (sắp hết hạn)` : i.name;
  });
  const p = (prof ?? {}) as Record<string, unknown>;
  const contextText = [
    `Đồ trong tủ lạnh (${fridge.length}): ${fridge.length ? fridge.join(", ") : "trống / không rõ"}`,
    `Chế độ ăn: ${list(p.dietary_pref) || "không đặt"}; độ cay: ${list(p.spice_pref) || "không đặt"}`,
    `Dị ứng: ${list(p.allergies) || "không"}; món cần tránh: ${list(p.never_suggest) || "không"}`,
    `Ngôn ngữ trả lời: ${locale === "en" ? "English" : "Tiếng Việt"}`,
  ].join("\n");

  const history = (parsed.data.history ?? []) as ChatTurn[];
  const turns: ChatTurn[] = [...history, { role: "user", content: parsed.data.message }];

  let oaStream;
  try {
    oaStream = await streamCookChat(turns, contextText);
  } catch (e) {
    console.error("/api/chat start failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let usage: Parameters<typeof estimateCost>[0];
      try {
        for await (const chunk of oaStream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
          if (chunk.usage) usage = chunk.usage;
        }
      } catch (e) {
        console.error("/api/chat stream error", e);
      }
      controller.close();
      if (usage) {
        try {
          await recordSpend(estimateCost(usage));
        } catch {
          /* spend accounting is best-effort */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Chat-Remaining":
        bump && bump.chat_limit >= 0 ? String(Math.max(0, bump.chat_limit - bump.used)) : "-1",
    },
  });
}
