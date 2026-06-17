"use client";

import { useState } from "react";
import { DishCover } from "@/components/dish-cover";
import { Plus, X, Sparkles, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { useT, useLang } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";

type Dish = { title_vi: string; title_en?: string; image?: { url: string } };
type Item = { id: string; plan_date: string; dish: Dish };
type Fav = { id: string; dish: Dish };

export function MealPlan({
  days,
  initial,
  favorites,
  todayStr,
}: {
  days: string[];
  initial: Item[];
  favorites: Fav[];
  todayStr: string;
}) {
  const t = useT();
  const { lang } = useLang();
  const en = lang === "en";
  const loc = en ? "en-US" : "vi-VN";
  const [items, setItems] = useState(initial);
  const [pickFor, setPickFor] = useState<string | null>(null);

  const dTitle = (d: Dish) => (en && d.title_en ? d.title_en : d.title_vi);
  const label = (date: string) =>
    new Date(date + "T00:00:00").toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "numeric" });
  const plannedCount = days.filter((d) => items.some((x) => x.plan_date === d)).length;

  async function add(date: string, dish: Dish) {
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", plan_date: date, dish }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.item) setItems((xs) => [...xs, d.item]);
    } else {
      toast.error(t.scan.toast.netErr);
    }
  }
  async function remove(it: Item) {
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id: it.id }),
    });
  }
  async function autoFill() {
    if (!favorites.length) {
      toast.error(t.mealPlan.noFav);
      return;
    }
    for (let i = 0; i < days.length; i++) {
      if (items.some((x) => x.plan_date === days[i])) continue;
      await add(days[i], favorites[i % favorites.length].dish);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <CalendarCheck className="size-4 text-primary" /> {plannedCount}/{days.length}
          </span>
          {favorites.length > 0 && (
            <Button variant="outline" onClick={autoFill} className="gap-1.5">
              <Sparkles className="size-4" /> {t.mealPlan.autoFill}
            </Button>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {days.map((date) => {
            const dayItems = items.filter((x) => x.plan_date === date);
            const isToday = date === todayStr;
            return (
              <div
                key={date}
                className={`flex flex-col gap-2.5 rounded-3xl bg-card p-4 shadow-card ring-1 ${
                  isToday ? "ring-2 ring-primary" : "ring-white/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize">{label(date)}</span>
                  {isToday && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {t.mealPlan.today}
                    </span>
                  )}
                </div>
                {dayItems.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setPickFor(date)}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border py-5 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="size-4" /> {t.mealPlan.add}
                  </button>
                ) : (
                  <>
                    {dayItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-2.5 rounded-2xl bg-background p-2 ring-1 ring-white/60"
                      >
                        <div className="size-11 shrink-0 overflow-hidden rounded-xl">
                          <DishCover image={it.dish.image} className="h-full w-full" iconClassName="size-4" />
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{dTitle(it.dish)}</span>
                        <button
                          type="button"
                          onClick={() => remove(it)}
                          aria-label="remove"
                          className="-m-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition hover:text-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPickFor(date)}
                      className="-ml-1 flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary transition hover:bg-primary/5"
                    >
                      <Plus className="size-4" /> {t.mealPlan.add}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* pick-a-dish bottom sheet (z above the chat FAB so it never gets overlapped) */}
      {pickFor && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            onClick={() => setPickFor(null)}
            className="absolute inset-0 animate-in fade-in bg-black/40 backdrop-blur-sm"
          />
          <div className="relative flex max-h-[80vh] flex-col rounded-t-3xl bg-card shadow-float duration-300 animate-in slide-in-from-bottom-4">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <span className="font-bold tracking-tight">{t.mealPlan.pick}</span>
              <button
                type="button"
                onClick={() => setPickFor(null)}
                aria-label={t.mealPlan.close}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-8">
              {favorites.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t.mealPlan.noFav}</p>
              ) : (
                <div className="mx-auto grid max-w-2xl gap-2 sm:grid-cols-2">
                  {favorites.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        add(pickFor, f.dish);
                        setPickFor(null);
                      }}
                      className="flex items-center gap-3 rounded-2xl bg-background p-3 text-left ring-1 ring-white/60 transition hover:bg-primary/5 hover:ring-primary/30"
                    >
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl">
                        <DishCover image={f.dish.image} className="h-full w-full" iconClassName="size-5" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{dTitle(f.dish)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
