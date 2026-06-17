"use client";

import { useState } from "react";
import { DishCover } from "@/components/dish-cover";
import { Plus, X, Sparkles } from "lucide-react";
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
    new Date(date + "T00:00:00").toLocaleDateString(loc, {
      weekday: "short",
      day: "numeric",
      month: "numeric",
    });

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
      <div className="flex flex-col gap-3">
        {favorites.length > 0 && (
          <Button variant="outline" onClick={autoFill} className="gap-1.5 self-start">
            <Sparkles className="size-4" /> {t.mealPlan.autoFill}
          </Button>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {days.map((date) => {
            const dayItems = items.filter((x) => x.plan_date === date);
            const isToday = date === todayStr;
            return (
              <div
                key={date}
                className={`flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-card ring-1 ${
                  isToday ? "ring-primary" : "ring-white/60"
                }`}
              >
                <span className="font-semibold capitalize">
                  {label(date)}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {t.mealPlan.today}
                    </span>
                  )}
                </span>
                {dayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.mealPlan.empty}</p>
                ) : (
                  dayItems.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-2 rounded-xl bg-background p-2 ring-1 ring-white/60"
                    >
                      <DishCover
                        image={it.dish.image}
                        className="size-9 shrink-0 rounded-lg"
                        iconClassName="size-4"
                      />
                      <span className="flex-1 text-sm font-medium">{dTitle(it.dish)}</span>
                      <button
                        type="button"
                        onClick={() => remove(it)}
                        aria-label="remove"
                        className="-m-2 shrink-0 rounded-md p-2 text-muted-foreground/60 transition hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => setPickFor(date)}
                  className="-ml-2 flex w-fit items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/5"
                >
                  <Plus className="size-4" /> {t.mealPlan.add}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {pickFor && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-bold tracking-tight">{t.mealPlan.pick}</span>
            <button
              type="button"
              onClick={() => setPickFor(null)}
              aria-label={t.mealPlan.close}
              className="text-muted-foreground transition hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {favorites.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t.mealPlan.noFav}</p>
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
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-card ring-1 ring-white/60 transition hover:shadow-float"
                  >
                    <DishCover
                      image={f.dish.image}
                      className="size-12 shrink-0 rounded-lg"
                      iconClassName="size-5"
                    />
                    <span className="text-sm font-medium">{dTitle(f.dish)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
