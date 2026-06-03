"use client";

import { useState } from "react";
import { Clock, PlayCircle, Heart, ChevronDown, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useT, useLang } from "@/components/landing/i18n";
import { CookMode } from "@/components/cook-mode";
import { Button } from "@/components/ui/button";

type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
type Dish = {
  title_vi: string;
  title_en?: string;
  cook_time_min: number;
  difficulty: "easy" | "medium" | "hard";
  why_vi?: string;
  why_en?: string;
  steps_vi?: string[];
  steps_en?: string[];
  why?: string;
  steps?: string[];
  approx_macros?: Macros;
  image?: { url: string; credit_url: string };
};
export type SavedDish = { id: string; scan_id: string | null; dish_index: number; dish: Dish };

function ytSearch(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent("cách làm " + q)}`;
}

export function FavoritesList({ initial }: { initial: SavedDish[] }) {
  const t = useT();
  const { lang } = useLang();
  const en = lang === "en";
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState<string | null>(initial[0]?.id ?? null);
  const [cookDish, setCookDish] = useState<Dish | null>(null);

  const dTitle = (d: Dish) => (en && d.title_en ? d.title_en : d.title_vi);
  const dWhy = (d: Dish) => (en ? d.why_en || d.why_vi || d.why : d.why_vi || d.why) || "";
  const dSteps = (d: Dish) => (en ? d.steps_en || d.steps_vi || d.steps : d.steps_vi || d.steps) || [];
  const diff = (d: Dish) =>
    d.difficulty === "easy" ? t.scan.diffEasy : d.difficulty === "hard" ? t.scan.diffHard : t.scan.diffMedium;

  async function remove(s: SavedDish) {
    setItems((xs) => xs.filter((x) => x.id !== s.id));
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, saved: false }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      toast.error(t.scan.toast.netErr);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
        {t.favorites.empty}
      </div>
    );
  }

  return (
    <>
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {items.map((s) => {
        const d = s.dish;
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-border/60">
            {d.image && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image.url} alt="" className="h-full w-full object-cover" />
                <a
                  href={d.image.credit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm"
                >
                  Pexels
                </a>
              </div>
            )}
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold tracking-tight">{dTitle(d)}</span>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  aria-label={t.favorites.saved}
                  className="shrink-0 text-[#c8102e] transition hover:opacity-70"
                >
                  <Heart className="size-5" fill="currentColor" />
                </button>
              </div>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-warm-50 px-2 py-0.5 text-xs font-medium text-[#b85a2e]">
                <Clock className="size-3" />
                {d.cook_time_min}′ · {diff(d)}
              </span>
              <p className="text-sm text-muted-foreground">{dWhy(d)}</p>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="flex w-fit items-center gap-1 text-sm font-medium text-primary"
              >
                <ChevronDown className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} /> {t.scan.stepsLabel}
              </button>
              {isOpen && (
                <>
                  {dSteps(d).length > 0 && (
                    <Button onClick={() => setCookDish(d)} className="shadow-float">
                      <ChefHat className="size-4" /> {t.cook.start}
                    </Button>
                  )}
                  <ol className="flex flex-col gap-2">
                    {dSteps(d).map((st, j) => (
                      <li key={j} className="flex gap-2.5 text-sm">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {j + 1}
                        </span>
                        <span className="pt-0.5">{st}</span>
                      </li>
                    ))}
                  </ol>
                  <a
                    href={ytSearch(d.title_vi)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff0033]/10 px-4 py-2.5 text-sm font-semibold text-[#c8102e] transition hover:bg-[#ff0033]/15"
                  >
                    <PlayCircle className="size-[18px]" /> {t.scan.watchVideo}
                  </a>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
      {cookDish && (
        <CookMode
          title={dTitle(cookDish)}
          steps={dSteps(cookDish)}
          defaultMin={cookDish.cook_time_min}
          onClose={() => setCookDish(null)}
        />
      )}
    </>
  );
}
