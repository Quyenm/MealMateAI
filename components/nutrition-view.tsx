"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Log = {
  id: string;
  dish_title: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function NutritionView({ items: initial, goal: initialGoal }: { items: Log[]; goal: number | null }) {
  const t = useT();
  const [items, setItems] = useState(initial);
  const [goal, setGoal] = useState(initialGoal != null ? String(initialGoal) : "");

  const totals = items.reduce(
    (a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.protein_g, c: a.c + x.carbs_g, f: a.f + x.fat_g }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const goalNum = goal ? parseInt(goal, 10) || 0 : 0;
  const pct = goalNum > 0 ? Math.min(100, Math.round((totals.kcal / goalNum) * 100)) : 0;

  async function saveGoal() {
    const g = goal ? parseInt(goal, 10) : null;
    await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setGoal", goal: g }),
    });
    toast.success(t.nutrition.goalSaved);
  }
  async function remove(it: Log) {
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id: it.id }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-[#176f9c] p-5 text-white shadow-float">
        <span className="text-sm text-white/80">{t.nutrition.today}</span>
        <p className="mt-1 text-4xl font-extrabold leading-none">
          {totals.kcal}
          <span className="text-lg font-medium text-white/70">
            {" "}
            {t.scan.kcalUnit}
            {goalNum > 0 ? ` / ${goalNum}` : ""}
          </span>
        </p>
        {goalNum > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className="mt-2 text-xs text-white/80">
          {totals.p}g {t.scan.macroProtein} · {totals.c}g {t.scan.macroCarbs} · {totals.f}g {t.scan.macroFat}
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">{t.nutrition.goal}</span>
          <Input
            type="number"
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="2000"
          />
        </div>
        <Button variant="outline" onClick={saveGoal}>
          {t.nutrition.setGoal}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
          {t.nutrition.empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card ring-1 ring-border/60"
            >
              <span className="flex-1 text-sm font-medium">{it.dish_title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {it.kcal} {t.scan.kcalUnit}
              </span>
              <button
                type="button"
                onClick={() => remove(it)}
                aria-label="remove"
                className="-m-2 shrink-0 rounded-md p-2 text-muted-foreground/60 transition hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
