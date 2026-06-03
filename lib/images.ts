import { createAdminClient } from "@/lib/supabase/server";

export type DishImage = { url: string; credit_url?: string };

// Dish photos are resolved AFTER the AI decides the dish name, by searching that
// exact title. Order: YouTube cooking-video thumbnail (the actual dish, free —
// the Data API stops at its daily cap, it never bills) → Pexels stock (free,
// always returns something but generic) → branded placeholder. All env-gated.
const YT_KEY = process.env.YOUTUBE_API_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const HAS_SOURCE = !!YT_KEY || !!PEXELS_KEY;

const normKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

// Pexels stock search — free with generous limits and never bills. Generic (not
// the exact dish), so it's only a fallback when YouTube has no thumbnail.
async function pexels(query: string): Promise<DishImage | "quota" | null> {
  if (!PEXELS_KEY) return null;
  try {
    const url =
      `https://api.pexels.com/v1/search?per_page=1&orientation=landscape` +
      `&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(4500) });
    if (res.status === 429) return "quota";
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.photos?.[0];
    const src: string | undefined = p?.src?.large || p?.src?.medium || p?.src?.original;
    if (!src) return null;
    return { url: src, credit_url: p?.url };
  } catch {
    return null;
  }
}

// YouTube cooking-video thumbnail (stable Google CDN URL).
async function youtubeThumb(query: string): Promise<DishImage | "quota" | null> {
  if (!YT_KEY) return null;
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1` +
      `&q=${encodeURIComponent("cách làm " + query)}&key=${YT_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.status === 403 || res.status === 429) return "quota";
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0];
    const th = item?.snippet?.thumbnails;
    const thumb: string | undefined = th?.high?.url || th?.medium?.url || th?.default?.url;
    const vid: string | undefined = item?.id?.videoId;
    if (!thumb) return null;
    return { url: thumb, credit_url: vid ? `https://www.youtube.com/watch?v=${vid}` : undefined };
  } catch {
    return null;
  }
}

async function resolve(titleVi: string, titleEn?: string): Promise<DishImage | "quota" | null> {
  const y = await youtubeThumb(titleVi || titleEn || ""); // Vietnamese title searches best
  if (y && y !== "quota") return y;
  const p = await pexels(`${titleEn || titleVi} food`); // Pexels is English-indexed
  if (p && p !== "quota") return p;
  if (y === "quota" || p === "quota") return "quota"; // transient — don't cache a miss
  return null;
}

// Collapse concurrent resolves of the same dish (one /api/suggest fans out ~10
// in parallel) so an identical title is searched once, not once per caller.
const inFlight = new Map<string, Promise<DishImage | "quota" | null>>();
function resolveOnce(
  titleVi: string,
  titleEn: string | undefined,
  key: string,
): Promise<DishImage | "quota" | null> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = resolve(titleVi, titleEn).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/**
 * Resolve a dish photo, cached in dish_images so each distinct dish costs at
 * most one search ever (the free quotas are ~100 searches/day). Returns null
 * (→ branded placeholder) when no source is configured or nothing matches.
 * Never throws — the cache is best-effort, so a missing dish_images table (e.g.
 * migration 0014 not run yet) still serves live images, just without caching.
 */
export async function fetchDishImage(
  titleVi: string,
  titleEn?: string,
  admin?: ReturnType<typeof createAdminClient>,
): Promise<DishImage | null> {
  if (!HAS_SOURCE) return null;
  const query = titleVi || titleEn || "";
  const key = normKey(query);
  if (!key) return null;
  const db = admin ?? createAdminClient();

  // 1) cache read (best-effort)
  try {
    const { data: cached, error } = await db
      .from("dish_images")
      .select("image_url, credit_url")
      .eq("title_key", key)
      .maybeSingle();
    if (error) throw error;
    if (cached) {
      return cached.image_url ? { url: cached.image_url, credit_url: cached.credit_url ?? undefined } : null;
    }
  } catch (e) {
    console.warn("[images] cache read skipped (run migration 0014?):", (e as Error).message);
  }

  // 2) live resolve (deduped across concurrent identical titles)
  const r = await resolveOnce(titleVi, titleEn, key);
  if (r === "quota") return null;

  // 3) cache write (best-effort — never block the image on a cache failure)
  try {
    const { error } = await db
      .from("dish_images")
      .upsert(
        { title_key: key, image_url: r?.url ?? null, credit_url: r?.credit_url ?? null },
        { onConflict: "title_key" },
      );
    if (error) throw error;
  } catch (e) {
    console.warn("[images] cache write skipped (run migration 0014?):", (e as Error).message);
  }
  return r;
}
