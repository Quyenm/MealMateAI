export type DishImage = { url: string; credit_url: string };

/**
 * One photo for a dish from Wikipedia (the actual dish when it has a page).
 * Unlike generic stock search this won't return an unrelated photo — if there's
 * no good match it returns null and the UI shows a branded placeholder instead.
 */
async function wiki(lang: "vi" | "en", title: string): Promise<DishImage | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search` +
        `&gsrsearch=${encodeURIComponent(title)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640&origin=*`,
      { headers: { "User-Agent": "MealMateAI/1.0 (cooking app)" }, signal: AbortSignal.timeout(3500) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages as Record<string, { thumbnail?: { source?: string } }> | undefined;
    if (!pages) return null;
    for (const id of Object.keys(pages)) {
      const thumb = pages[id]?.thumbnail?.source;
      if (thumb) return { url: thumb, credit_url: `https://${lang}.wikipedia.org/?curid=${id}` };
    }
    return null;
  } catch {
    return null;
  }
}

/** Try the Vietnamese dish name (vi.wikipedia) first, then the English name. */
export async function fetchDishImage(titleVi: string, titleEn?: string): Promise<DishImage | null> {
  if (titleVi) {
    const v = await wiki("vi", titleVi);
    if (v) return v;
  }
  if (titleEn) {
    const e = await wiki("en", titleEn);
    if (e) return e;
  }
  return null;
}
