"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import { useT, useLang } from "@/components/landing/i18n";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  image?: { url: string; photographer: string; credit_url: string };
};
type Step = "capture" | "recognizing" | "confirm" | "suggesting" | "results";

async function downscale(file: File, maxEdge = 1024, quality = 0.7): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function youtubeSearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent("cách làm " + query)}`;
}

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
  const [openDish, setOpenDish] = useState<number | null>(0);
  const [scanId, setScanId] = useState<string | null>(null);

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
      setOpenDish(0);
      setStep("results");
      if (data.noMatch) {
        toast.message(t.scan.toast.noMatch, { description: t.scan.toast.noMatchDesc });
      }
    } catch {
      toast.error(t.scan.toast.netErr);
      setStep("confirm");
    }
  }

  function reset() {
    setStep("capture");
    setPreview(null);
    setImageData(null);
    setIngredients([]);
    setDishes([]);
    setScanId(null);
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
              <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="aspect-[4/3] w-full object-cover" />
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
        </div>
      )}

      {/* STEP: results */}
      {step === "results" && (
        <div className="flex flex-col gap-3">
          {dishes.length === 0 && (
            <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
              {t.scan.resultsEmpty}
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          {dishes.map((d, i) => {
            const open = openDish === i;
            return (
              <div key={i} className="overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-border/60">
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
                <button
                  type="button"
                  onClick={() => setOpenDish(open ? null : i)}
                  className="flex w-full flex-col gap-1.5 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold tracking-tight">{dishTitle(d)}</span>
                      {d.cookable_now === false && (
                        <span className="rounded-full bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-[#b85a2e]">
                          {t.scan.almostBadge}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warm-50 px-2 py-0.5 text-xs font-medium text-[#b85a2e]">
                      <Clock className="size-3" />
                      {d.cook_time_min}′ · {diffLabel(d.difficulty)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{dishWhy(d)}</p>
                </button>
                {open && (
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    {dishMissing(d).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t.scan.needMore}: {dishMissing(d).join(", ")}
                      </p>
                    )}
                    {d.approx_macros && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {d.approx_macros.kcal} {t.scan.kcalUnit} · {d.approx_macros.protein_g}g{" "}
                        {t.scan.macroProtein} · {d.approx_macros.carbs_g}g {t.scan.macroCarbs} ·{" "}
                        {d.approx_macros.fat_g}g {t.scan.macroFat}
                      </p>
                    )}
                    <ol className="flex flex-col gap-2">
                      {dishSteps(d).map((s, j) => (
                        <li key={j} className="flex gap-2.5 text-sm">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {j + 1}
                          </span>
                          <span className="pt-0.5">{s}</span>
                        </li>
                      ))}
                    </ol>
                    <a
                      href={youtubeSearch(d.title_vi)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff0033]/10 px-4 py-2.5 text-sm font-semibold text-[#c8102e] transition hover:bg-[#ff0033]/15"
                    >
                      <PlayCircle className="size-[18px]" /> {t.scan.watchVideo}
                    </a>
                    {scanId && (
                      <StarRating scanId={scanId} dishIndex={i} dishTitle={d.title_vi} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="size-4" /> {t.scan.scanAgain}
          </Button>
        </div>
      )}
    </main>
  );
}
