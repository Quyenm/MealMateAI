"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  Flame,
  X,
  Plus,
  Clock,
  PlayCircle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChefHat,
  Refrigerator,
} from "lucide-react";
import { useT, useLang } from "@/components/landing/i18n";
import { StarRating } from "@/components/star-rating";
import { SaveDishButton } from "@/components/save-dish-button";
import { CookMode } from "@/components/cook-mode";
import { DishCover } from "@/components/dish-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downscale } from "@/lib/client-image";

type Ingredient = {
  name_vi: string;
  name_en?: string;
  confidence?: number;
  expiring?: boolean;
  amount?: "low" | "medium" | "high";
};
type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
type Dish = {
  title_vi: string;
  title_en: string;
  cook_time_min: number;
  difficulty: "easy" | "medium" | "hard";
  uses_ingredients: string[];
  missing_ingredients: string[];
  missing_ingredients_en?: string[];
  why_vi?: string;
  why_en?: string;
  steps_vi?: string[];
  steps_en?: string[];
  why?: string; // legacy (pre-bilingual rows)
  steps?: string[];
  approx_macros?: Macros;
  cookable_now?: boolean;
  image?: { url: string; credit_url?: string };
};
type Step = "capture" | "recognizing" | "confirm" | "suggesting" | "results";

function youtubeSearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent("cách làm " + query)}`;
}

type FridgeItem = { name: string; name_en?: string | null; amount?: string | null };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

export default function ScanPage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const en = lang === "en";
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newName, setNewName] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<number | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [cooking, setCooking] = useState(false);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);

  const amountLabel = (a?: Ingredient["amount"]) =>
    a === "low" ? t.scan.amountLow : a === "medium" ? t.scan.amountMedium : a === "high" ? t.scan.amountHigh : null;
  const diffLabel = (d: Dish["difficulty"]) =>
    d === "easy" ? t.scan.diffEasy : d === "hard" ? t.scan.diffHard : t.scan.diffMedium;
  // Pick the right language for AI-generated content (falls back to vi / legacy).
  const ingName = (g: Ingredient) => (en && g.name_en ? g.name_en : g.name_vi);
  const dishTitle = (d: Dish) => (en && d.title_en ? d.title_en : d.title_vi);
  const dishWhy = (d: Dish) => (en ? d.why_en || d.why_vi || d.why : d.why_vi || d.why) || "";
  const dishSteps = (d: Dish) => (en ? d.steps_en || d.steps_vi || d.steps : d.steps_vi || d.steps) || [];
  const dishMissing = (d: Dish) =>
    (en ? d.missing_ingredients_en || d.missing_ingredients : d.missing_ingredients) || [];
  const selected = selectedDish !== null ? dishes[selectedDish] : undefined;
  // Fridge items the user hasn't added to this scan yet — shown as a reminder.
  const fridgeNotInList = (() => {
    const have = new Set(ingredients.map((g) => norm(g.name_vi)));
    return fridgeItems.filter((f) => !have.has(norm(f.name)));
  })();

  // Open a dish detail and push a history entry, so the browser/phone Back
  // button returns to the suggestion list (not all the way back to the scan).
  function openDish(i: number) {
    setSelectedDish(i);
    window.history.pushState({ mmDish: i }, "");
  }
  useEffect(() => {
    function onPop() {
      setCooking(false);
      setSelectedDish(null);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await downscale(file);
      setImageData(data);
      setPreview(data);
    } catch {
      toast.error(t.scan.toast.imgError);
    }
  }

  async function analyze() {
    if (!imageData) return;
    setStep("recognizing");
    loadFridge(); // so the confirm step can remind what's already in the fridge
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: imageData }),
      });
      if (res.status === 422) {
        toast.message(t.scan.toast.noRecognize, { description: t.scan.toast.noRecognizeDesc });
        setIngredients([]);
        setStep("confirm");
        return;
      }
      if (!res.ok) {
        toast.error(res.status === 503 ? t.scan.toast.busy : t.scan.toast.recognizeErr);
        setStep("capture");
        return;
      }
      const data = await res.json();
      setIngredients((data.ingredients ?? []).map((g: Ingredient) => ({ ...g, expiring: false })));
      setStep("confirm");
    } catch {
      toast.error(t.scan.toast.netErr);
      setStep("capture");
    }
  }

  function removeAt(i: number) {
    setIngredients((xs) => xs.filter((_, j) => j !== i));
  }
  function toggleExpiring(i: number) {
    setIngredients((xs) => xs.map((g, j) => ({ ...g, expiring: j === i ? !g.expiring : false })));
  }
  function addIngredient() {
    const name = newName.trim();
    if (!name) return;
    setIngredients((xs) => [...xs, { name_vi: name, name_en: name, expiring: false }]);
    setNewName("");
  }

  async function getSuggestions() {
    if (!ingredients.length) {
      toast.error(t.scan.toast.needOne);
      return;
    }
    setStep("suggesting");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      if (res.status === 402) {
        toast.error(t.scan.toast.quotaOut, { description: t.scan.toast.quotaOutDesc });
        router.push("/upgrade");
        return;
      }
      if (!res.ok) {
        toast.error(res.status === 503 ? t.scan.toast.busyShort : t.scan.toast.suggestErr);
        setStep("confirm");
        return;
      }
      const data = await res.json();
      setDishes(data.dishes ?? []);
      setScanId(data.scanId ?? null);
      setSelectedDish(null);
      setStep("results");
      if (data.noMatch) {
        toast.message(t.scan.toast.noMatch, { description: t.scan.toast.noMatchDesc });
      }
    } catch {
      toast.error(t.scan.toast.netErr);
      setStep("confirm");
    }
  }

  async function loadFridge() {
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      if (res.ok) setFridgeItems((await res.json()).items ?? []);
    } catch {
      /* non-blocking */
    }
  }

  function addFromFridge(f: FridgeItem) {
    setIngredients((xs) =>
      xs.some((g) => norm(g.name_vi) === norm(f.name))
        ? xs
        : [...xs, { name_vi: f.name, name_en: f.name_en ?? f.name, expiring: false }],
    );
  }
  function addAllFromFridge() {
    setIngredients((xs) => {
      const have = new Set(xs.map((g) => norm(g.name_vi)));
      const add = fridgeItems
        .filter((f) => !have.has(norm(f.name)))
        .map((f) => ({ name_vi: f.name, name_en: f.name_en ?? f.name, expiring: false }));
      return [...xs, ...add];
    });
  }

  async function saveToFridge() {
    if (!ingredients.length) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stock",
          items: ingredients.map((g) => ({ name: g.name_vi, name_en: g.name_en, amount: g.amount })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(t.fridge.savedToast);
    } catch {
      toast.error(t.scan.toast.netErr);
    }
  }

  // After cooking: the scanned ingredients NOT used by the dish are leftovers —
  // tuck them into the fridge (skips ones already there) so the next scan knows.
  async function stockLeftovers(used: string[]) {
    const u = used.map(norm).filter((s) => s.length > 1);
    const leftovers = ingredients.filter((g) => {
      const n = norm(g.name_vi);
      return n.length > 1 && !u.some((x) => n.includes(x) || x.includes(n));
    });
    if (!leftovers.length) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stock",
          items: leftovers.map((g) => ({ name: g.name_vi, name_en: g.name_en, amount: g.amount })),
        }),
      });
      if (res.ok && (await res.json()).added > 0) toast.success(t.fridge.leftoversSaved);
    } catch {
      /* non-blocking */
    }
  }

  async function deductFromFridge(names: string[]) {
    if (!names.length) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deduct", names }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.removed > 0) toast.success(t.fridge.deductedToast);
      }
    } catch {
      /* non-blocking */
    }
  }

  async function logMacros(dish: Dish) {
    if (!dish.approx_macros) return;
    const log_date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          log_date,
          dish_title: dish.title_vi,
          kcal: dish.approx_macros.kcal,
          protein_g: dish.approx_macros.protein_g,
          carbs_g: dish.approx_macros.carbs_g,
          fat_g: dish.approx_macros.fat_g,
        }),
      });
      if (res.ok) toast.success(t.nutrition.logged);
    } catch {
      /* non-blocking */
    }
  }

  async function addToShopping(names: string[]) {
    if (!names.length) return;
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", names }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(t.shopping.added);
    } catch {
      toast.error(t.scan.toast.netErr);
    }
  }

  function reset() {
    setStep("capture");
    setPreview(null);
    setImageData(null);
    setIngredients([]);
    setDishes([]);
    setScanId(null);
    setSelectedDish(null);
    setCooking(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.scan.title}</h1>

      {/* STEP: capture */}
      {step === "capture" && (
        <div className="flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-card ring-1 ring-border/60">
          {preview ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-72 w-full object-cover" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="size-7" />
              </span>
              <p className="max-w-xs text-sm text-muted-foreground">{t.scan.captureHint}</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPick}
          />
          <Button
            variant={preview ? "outline" : "default"}
            className={preview ? "w-full" : "w-full shadow-float"}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-5" />
            {preview ? t.scan.pickAnother : t.scan.pick}
          </Button>
          {preview && (
            <Button className="w-full shadow-float" onClick={analyze}>
              {t.scan.analyze}
            </Button>
          )}
        </div>
      )}

      {/* STEP: loading */}
      {(step === "recognizing" || step === "suggesting") && (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 shadow-card ring-1 ring-border/60">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="size-7 animate-spin" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            {step === "recognizing" ? t.scan.recognizing : t.scan.suggesting}
          </p>
        </div>
      )}

      {/* STEP: confirm */}
      {step === "confirm" && (
        <div className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
          <div>
            <h2 className="font-bold tracking-tight">{t.scan.confirmTitle}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t.scan.confirmHint}</p>
          </div>

          {/* photo to cross-check against (client-side only — never stored) */}
          {preview && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t.scan.yourPhoto}</span>
              <div className="w-full overflow-hidden rounded-2xl ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="aspect-[16/10] w-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {ingredients.map((g, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-sm transition ${
                  g.expiring
                    ? "border-warm-400/70 bg-warm-50 text-[#8a4b25]"
                    : "border-border bg-background"
                }`}
              >
                <button
                  type="button"
                  title={t.scan.expiring}
                  aria-label={t.scan.expiring}
                  onClick={() => toggleExpiring(i)}
                  className={`flex size-6 items-center justify-center rounded-full transition ${
                    g.expiring ? "text-[#ef6c3a]" : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                >
                  <Flame className="size-4" fill={g.expiring ? "currentColor" : "none"} />
                </button>
                <span className="font-medium">{ingName(g)}</span>
                {amountLabel(g.amount) && (
                  <span className="text-xs text-muted-foreground">· {amountLabel(g.amount)}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="remove"
                  className="ml-0.5 text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            {!ingredients.length && (
              <p className="text-sm text-muted-foreground">{t.scan.emptyIngredients}</p>
            )}
          </div>

          {fridgeNotInList.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-warm-50 p-3 ring-1 ring-warm-400/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8a4b25]">
                <Refrigerator className="size-4" /> {t.scan.fridgeReminder}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fridgeNotInList.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addFromFridge(f)}
                    className="rounded-full border border-warm-400/50 bg-background px-2.5 py-1 text-xs font-medium transition hover:bg-warm-50"
                  >
                    + {en && f.name_en ? f.name_en : f.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addAllFromFridge}
                className="self-start text-xs font-semibold text-primary hover:underline"
              >
                {t.scan.fridgeAddAll}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIngredient())}
              placeholder={t.scan.addPlaceholder}
            />
            <Button variant="outline" size="icon" onClick={addIngredient} aria-label={t.scan.add}>
              <Plus className="size-5" />
            </Button>
          </div>

          <Button className="shadow-float" onClick={getSuggestions}>
            {t.scan.suggest} ({ingredients.length})
          </Button>
          {ingredients.length > 0 && (
            <Button variant="outline" onClick={saveToFridge} className="gap-1.5">
              <Refrigerator className="size-4" /> {t.fridge.saveFromScan}
            </Button>
          )}
        </div>
      )}

      {/* STEP: results — browse the suggested dishes */}
      {step === "results" && selectedDish === null && (
        <div className="flex flex-col gap-3">
          {dishes.length === 0 && (
            <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
              {t.scan.resultsEmpty}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openDish(i)}
                className="group flex flex-col overflow-hidden rounded-3xl bg-card text-left shadow-card ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:shadow-float"
              >
                <DishCover image={d.image} className="aspect-[16/10]">
                  {d.cookable_now === false && (
                    <span className="absolute left-2 top-2 rounded-full bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-[#b85a2e] shadow-sm">
                      {t.scan.almostBadge}
                    </span>
                  )}
                </DishCover>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <span className="font-bold tracking-tight">{dishTitle(d)}</span>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-warm-50 px-2 py-0.5 text-xs font-medium text-[#b85a2e]">
                    <Clock className="size-3" />
                    {d.cook_time_min}′ · {diffLabel(d.difficulty)}
                  </span>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{dishWhy(d)}</p>
                  {d.cookable_now === false && dishMissing(d).length > 0 && (
                    <p className="line-clamp-1 text-xs font-medium text-[#b85a2e]">
                      + {t.scan.needMore}: {dishMissing(d).join(", ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="size-4" /> {t.scan.scanAgain}
          </Button>
        </div>
      )}

      {/* STEP: results — the "cook this" detail screen */}
      {step === "results" && selected && selectedDish !== null && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> {t.scan.backToList}
          </button>

          <div className="overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-border/60">
            <DishCover image={selected.image} className="aspect-[16/9]" credit />
            <div className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">{dishTitle(selected)}</h2>
                  {selected.cookable_now === false && (
                    <span className="rounded-full bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-[#b85a2e]">
                      {t.scan.almostBadge}
                    </span>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warm-50 px-2 py-0.5 text-xs font-medium text-[#b85a2e]">
                  <Clock className="size-3" />
                  {selected.cook_time_min}′ · {diffLabel(selected.difficulty)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{dishWhy(selected)}</p>
              {dishMissing(selected).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    {t.scan.needMore}: {dishMissing(selected).join(", ")}
                  </p>
                  <button
                    type="button"
                    onClick={() => addToShopping(dishMissing(selected))}
                    className="flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="size-3.5" /> {t.shopping.addMissing}
                  </button>
                </div>
              )}
              {selected.approx_macros && (
                <p className="text-xs text-muted-foreground">
                  ≈ {selected.approx_macros.kcal} {t.scan.kcalUnit} ·{" "}
                  {selected.approx_macros.protein_g}g {t.scan.macroProtein} ·{" "}
                  {selected.approx_macros.carbs_g}g {t.scan.macroCarbs} ·{" "}
                  {selected.approx_macros.fat_g}g {t.scan.macroFat}
                </p>
              )}
              {dishSteps(selected).length > 0 && (
                <Button onClick={() => setCooking(true)} className="shadow-float">
                  <ChefHat className="size-4" /> {t.cook.start}
                </Button>
              )}
              <ol className="flex flex-col gap-2">
                {dishSteps(selected).map((s, j) => (
                  <li key={j} className="flex gap-2.5 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {j + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={youtubeSearch(selected.title_vi)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff0033]/10 px-4 py-2.5 text-sm font-semibold text-[#c8102e] transition hover:bg-[#ff0033]/15"
                >
                  <PlayCircle className="size-[18px]" /> {t.scan.watchVideo}
                </a>
                {scanId && (
                  <SaveDishButton scanId={scanId} dishIndex={selectedDish} dish={selected} className="flex-1" />
                )}
              </div>
              {scanId && (
                <StarRating scanId={scanId} dishIndex={selectedDish} dishTitle={selected.title_vi} />
              )}
            </div>
          </div>
          {cooking && (
            <CookMode
              title={dishTitle(selected)}
              steps={dishSteps(selected)}
              defaultMin={selected.cook_time_min}
              onClose={() => setCooking(false)}
              onFinish={() => {
                const used = selected.uses_ingredients ?? [];
                deductFromFridge(used); // remove what the dish consumed...
                stockLeftovers(used); // ...and keep the rest for next time
                logMacros(selected);
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}
