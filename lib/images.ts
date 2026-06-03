const PEXELS_KEY = process.env.PEXELS_API_KEY;

export type DishImage = { url: string; photographer: string; credit_url: string };

/**
 * One illustrative food photo for a dish, from Pexels (searched by English name).
 * Returns null if no key is configured or nothing matches — callers MUST handle
 * null and fall back gracefully (no image). Fetched once at suggest-time and
 * cached in the suggestion row, so viewing history never re-hits the API.
 */
export async function fetchDishImage(query: string): Promise<DishImage | null> {
  if (!PEXELS_KEY || !query) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query + " food dish",
      )}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.photos?.[0];
    if (!p?.src) return null;
    return {
      url: p.src.landscape ?? p.src.medium ?? p.src.original,
      photographer: p.photographer ?? "",
      credit_url: p.url ?? "https://www.pexels.com",
    };
  } catch {
    return null;
  }
}
