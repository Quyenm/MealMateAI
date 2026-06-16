import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Beacons arrive as a small batch of events (sendBeacon / fetch keepalive).
const Event = z.object({
  vid: z.string().min(8).max(64), // visitor id (localStorage)
  sid: z.string().min(8).max(64), // session id (sessionStorage)
  uid: z.string().uuid().optional(), // signed-in user id, server-rendered into the tracker
  type: z.enum(["pageview", "scroll", "click"]),
  path: z.string().min(1).max(512),
  ref: z.string().max(1024).optional(),
  us: z.string().max(128).optional(),
  um: z.string().max(128).optional(),
  uc: z.string().max(128).optional(),
  sd: z.number().int().min(0).max(100).optional(),
});
const Body = z.object({ events: z.array(Event).min(1).max(30) });

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/** Ingest analytics beacons. Fire-and-forget: bad/over-limit payloads are silently dropped. */
export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const { ok } = await rateLimit("analytics", clientIp(req));
  if (!ok) return new NextResponse(null, { status: 204 });

  const admin = createAdminClient();
  const rows = parsed.data.events.map((e) => ({
    visitor_id: e.vid,
    session_id: e.sid,
    user_id: e.uid ?? null,
    type: e.type,
    path: e.path,
    referrer: e.ref ?? null,
    utm_source: e.us ?? null,
    utm_medium: e.um ?? null,
    utm_campaign: e.uc ?? null,
    scroll_depth: e.sd ?? null,
  }));

  const { error } = await admin.from("analytics_events").insert(rows);
  if (error) console.error("/api/analytics/track insert failed", error);

  return new NextResponse(null, { status: 204 });
}
