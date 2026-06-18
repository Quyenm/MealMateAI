import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-user request throttling, separate from the daily quota and the global
 * spend cap. Best-effort: if Upstash isn't configured (env vars missing) the
 * limiters are null and rateLimit() fails open, so the app still works locally.
 */
const configured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (!configured && process.env.NODE_ENV === "production") {
  console.warn("[ratelimit] Upstash env not set — request rate limiting is DISABLED");
}

const redis = configured ? Redis.fromEnv() : null;

function make(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: "mm-rl",
    analytics: false,
  });
}

const LIMITERS = {
  // Vision calls are NOT quota-billed, so this is the main anti-abuse throttle.
  scan: make(15, "1 m"),
  suggest: make(15, "1 m"),
  claim: make(5, "10 m"),
  community: make(8, "10 m"),
  // Analytics beacons (pageview/scroll/click batches) — generous, per IP.
  analytics: make(100, "1 m"),
  // AI chat — anti-burst per user (daily cap is enforced separately by tier).
  chat: make(20, "1 m"),
  // Kitchen-game recipe generation (VIP+ only; bounded further by spend cap).
  kitchen: make(20, "10 m"),
} as const;

export type RateKey = keyof typeof LIMITERS;

/** Returns { ok: false } when the caller exceeded the limit; fails open if unconfigured. */
export async function rateLimit(key: RateKey, id: string): Promise<{ ok: boolean }> {
  const rl = LIMITERS[key];
  if (!rl) return { ok: true };
  try {
    const { success } = await rl.limit(`${key}:${id}`);
    return { ok: success };
  } catch {
    // Never let a limiter outage take down the route.
    return { ok: true };
  }
}
