import { createAdminClient } from "@/lib/supabase/server";

export type DishImage = { url: string; credit_url?: string };

// Exact dish photos are resolved AFTER the AI decides the dish name, by image-
// searching that exact title. Order: Google Custom Search (best match for VN
// dishes) → YouTube cooking-video thumbnail → branded placeholder. All keyed/
// env-gated; we never show a generic-stock or wrong-page photo.
const G_KEY = process.env.GOOGLE_IMAGE_API_KEY;
const G_CX = process.env.GOOGLE_IMAGE_CX;
const YT_KEY = process.env.YOUTUBE_API_KEY;
const HAS_SOURCE = (!!G_KEY && !!G_CX) || !!YT_KEY;

const normKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

// Google Programmable Search (Image mode). Returns the top image result for the
// dish title; "quota" on 403/429 so we don't poison the cache on a transient cap.
async function googleImage(query: string): Promise<DishImage | "quota" | null> {
  if (!G_KEY || !G_CX) return null;
  try {
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${G_KEY}&cx=${G_CX}` +
      `&searchType=image&num=3&safe=active&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.status === 403 || res.status === 429) return "quota";
    if (!res.ok) return null;
    const data = await res.json();
    const items: Array<{ link?: string; image?: { contextLink?: string } }> = data?.items ?? [];
    const hit = items.find((it) => typeof it.link === "string" && /^https:\/\//.test(it.link));
    if (!hit?.link) return null;
    return { url: hit.link, credit_url: hit.image?.contextLink ?? hit.link };
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

async function resolve(query: string): Promise<DishImage | "quota" | null> {
  const g = await googleImage(query);
  if (g && g !== "quota") return g;
  const y = await youtubeThumb(query);
  if (y && y !== "quota") return y;
  if (g === "quota" || y === "quota") return "quota"; // transient — don't cache a miss
  return null;
}

// Collapse concurrent resolves of the same dish (one /api/suggest fans out ~10
// in parallel) so an identical title is searched once, not once per caller.
const inFlight = new Map<string, Promise<DishImage | "quota" | null>>();
function resolveOnce(query: string, key: string): Promise<DishImage | "quota" | null> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = resolve(query).finally(() => inFlight.delete(key));
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
  const r = await resolveOnce(query, key);
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
