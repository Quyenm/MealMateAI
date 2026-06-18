"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useT, useLang } from "@/components/landing/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KitchenGame } from "@/components/kitchen-game";
import { CURATED, type Recipe } from "@/lib/kitchen/recipes";

export function KitchenHome() {
  const t = useT().kitchen;
  const { lang } = useLang();
  const en = lang === "en";
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    const title = q.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/kitchen/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.status === 403) {
        toast.error(t.locked);
        return;
      }
      if (!res.ok) {
        toast.error(t.genErr);
        return;
      }
      const d = await res.json();
      setRecipe(d.recipe as Recipe);
    } catch {
      toast.error(t.genErr);
    } finally {
      setBusy(false);
    }
  }

  if (recipe) {
    return (
      <KitchenGame
        recipe={recipe}
        onExit={() => {
          setRecipe(null);
          setQ("");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), generate())}
          placeholder={t.anyPlaceholder}
          maxLength={80}
        />
        <Button onClick={generate} disabled={busy || !q.trim()} className="gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {t.cook}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t.popular}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CURATED.map((r) => (
            <button
              key={r.id}
              onClick={() => setRecipe(r)}
              className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-left shadow-card ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-float"
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f7b267] to-[#ef6c3a] text-white">
                <ChefHat className="size-5" />
              </span>
              <span className="text-sm font-semibold tracking-tight">{en && r.title_en ? r.title_en : r.title_vi}</span>
              <span className="text-xs text-muted-foreground">
                {r.steps.length} {t.steps}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
