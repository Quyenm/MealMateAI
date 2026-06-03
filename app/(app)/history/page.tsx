import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { StarRating } from "@/components/star-rating";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
type Dish = {
  title_vi: string;
  title_en?: string;
  cook_time_min: number;
  why_vi?: string;
  why_en?: string;
  steps_vi?: string[];
  steps_en?: string[];
  why?: string; // legacy
  steps?: string[];
  approx_macros?: Macros;
  cookable_now?: boolean;
  image?: { url: string; photographer: string; credit_url: string };
};
type Scan = {
  id: string;
  created_at: string;
  scan_ingredients: { name_vi: string | null }[];
  // suggestions.scan_id is UNIQUE, so PostgREST embeds it as a single object (not an array).
  suggestions: { dishes: Dish[] } | null;
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const s = STR[locale];
  const t = s.history;
  const dateLocale = locale === "en" ? "en-US" : "vi-VN";
  const en = locale === "en";
  const dTitle = (d: Dish) => (en && d.title_en ? d.title_en : d.title_vi);
  const dWhy = (d: Dish) => (en ? d.why_en || d.why_vi || d.why : d.why_vi || d.why) || "";
  const dSteps = (d: Dish) => (en ? d.steps_en || d.steps_vi || d.steps : d.steps_vi || d.steps) || [];

  const [{ data }, { data: ratingRows }] = await Promise.all([
    supabase
      .from("scans")
      .select("id, created_at, scan_ingredients(name_vi), suggestions(dishes)")
      .eq("user_id", user.id)
      .eq("status", "suggested")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("ratings").select("scan_id, dish_index, stars").eq("user_id", user.id),
  ]);
  const scans = (data ?? []) as unknown as Scan[];
  const ratingOf = new Map<string, number>();
  (ratingRows ?? []).forEach((r) => ratingOf.set(`${r.scan_id}:${r.dish_index}`, r.stars));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>

      {scans.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">{t.empty}</p>
          <Link href="/scan" className={buttonVariants({ className: "shadow-float" })}>
            {t.firstScan}
          </Link>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {scans.map((sc) => {
        const ingredients = sc.scan_ingredients.map((g) => g.name_vi).filter(Boolean);
        const dishes = sc.suggestions?.dishes ?? [];
        return (
          <div
            key={sc.id}
            className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border/60"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {new Date(sc.created_at).toLocaleString(dateLocale, { timeZone: "Asia/Ho_Chi_Minh" })}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">{t.ingredients}: </span>
              {ingredients.join(", ") || "—"}
            </p>
            <div className="flex flex-col gap-2">
              {dishes.map((d, i) => (
                <details key={i} className="group rounded-xl bg-background p-3 ring-1 ring-border/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                    <span>
                      {dTitle(d)}
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {d.cook_time_min}′
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                  </summary>
                  {d.image && (
                    <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.image.url} alt="" className="h-full w-full object-cover" />
                      <a
                        href={d.image.credit_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-1 right-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm"
                      >
                        Pexels
                      </a>
                    </div>
                  )}
                  {dWhy(d) && <p className="mt-2 text-xs text-muted-foreground">{dWhy(d)}</p>}
                  {d.approx_macros && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ≈ {d.approx_macros.kcal} {s.scan.kcalUnit} · {d.approx_macros.protein_g}g{" "}
                      {s.scan.macroProtein} · {d.approx_macros.carbs_g}g {s.scan.macroCarbs} ·{" "}
                      {d.approx_macros.fat_g}g {s.scan.macroFat}
                    </p>
                  )}
                  {dSteps(d).length > 0 && (
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {dSteps(d).map((st, j) => (
                        <li key={j} className="flex gap-2 text-sm">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {j + 1}
                          </span>
                          <span className="pt-0.5">{st}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="mt-3">
                    <StarRating
                      scanId={sc.id}
                      dishIndex={i}
                      dishTitle={d.title_vi}
                      initial={ratingOf.get(`${sc.id}:${i}`) ?? 0}
                    />
                  </div>
                </details>
              ))}
              {dishes.length === 0 && <p className="text-sm text-muted-foreground">{t.noDish}</p>}
            </div>
          </div>
        );
      })}
      </div>
    </main>
  );
}
