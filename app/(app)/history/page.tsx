import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Dish = { title_vi: string; cook_time_min: number; why?: string; steps?: string[] };
type Scan = {
  id: string;
  created_at: string;
  scan_ingredients: { name_vi: string | null }[];
  suggestions: { dishes: Dish[] }[];
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].history;
  const dateLocale = locale === "en" ? "en-US" : "vi-VN";

  const { data } = await supabase
    .from("scans")
    .select("id, created_at, scan_ingredients(name_vi), suggestions(dishes)")
    .eq("user_id", user.id)
    .eq("status", "suggested")
    .order("created_at", { ascending: false })
    .limit(30);
  const scans = (data ?? []) as unknown as Scan[];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>

      {scans.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">{t.empty}</p>
          <Link href="/scan" className={buttonVariants({ className: "shadow-float" })}>
            {t.firstScan}
          </Link>
        </div>
      )}

      {scans.map((sc) => {
        const ingredients = sc.scan_ingredients.map((g) => g.name_vi).filter(Boolean);
        const dishes = sc.suggestions?.[0]?.dishes ?? [];
        return (
          <div
            key={sc.id}
            className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border/60"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {new Date(sc.created_at).toLocaleString(dateLocale)}
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
                      {d.title_vi}
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {d.cook_time_min}′
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                  </summary>
                  {d.why && <p className="mt-2 text-xs text-muted-foreground">{d.why}</p>}
                  {d.steps && d.steps.length > 0 && (
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {d.steps.map((st, j) => (
                        <li key={j} className="flex gap-2 text-sm">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {j + 1}
                          </span>
                          <span className="pt-0.5">{st}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              ))}
              {dishes.length === 0 && <p className="text-sm text-muted-foreground">{t.noDish}</p>}
            </div>
          </div>
        );
      })}
    </main>
  );
}
