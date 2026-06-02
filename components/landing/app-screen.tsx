"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Camera, Check, Clock, Flame, Plus, Refrigerator, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FoodGlyph, type GlyphName } from "./food-glyphs";
import { useT } from "./i18n";

const expo = [0.16, 1, 0.3, 1] as const;
const heroContainer: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.22, delayChildren: 0.25 } } };
const heroItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: expo } },
};

/** Pixel-accurate iOS status-bar glyphs (cellular bars, wifi, battery). */
function IosStatusIcons() {
  return (
    <span className="flex items-center gap-1.5 text-foreground">
      <svg viewBox="0 0 17 11" className="h-[9px] w-auto" fill="currentColor" aria-hidden>
        <rect x="0" y="7" width="3" height="4" rx="0.8" />
        <rect x="4.7" y="4.8" width="3" height="6.2" rx="0.8" />
        <rect x="9.3" y="2.4" width="3" height="8.6" rx="0.8" />
        <rect x="14" y="0" width="3" height="11" rx="0.8" />
      </svg>
      <svg viewBox="0 0 16 12" className="h-[9px] w-auto" fill="currentColor" aria-hidden>
        <path d="M8 2.3c2.9 0 5.6 1.1 7.6 3L14 6.9A9 9 0 0 0 8 4.4 9 9 0 0 0 2 6.9L.4 5.3C2.4 3.4 5.1 2.3 8 2.3Z" />
        <path d="M8 6.2c1.8 0 3.4.7 4.6 1.9L11 9.7A4 4 0 0 0 8 8.4a4 4 0 0 0-3 1.3L3.4 8.1C4.6 6.9 6.2 6.2 8 6.2Z" />
        <path d="M8 10c.7 0 1.3.3 1.7.8L8 12.4 6.3 10.8c.4-.5 1-.8 1.7-.8Z" />
      </svg>
      <svg viewBox="0 0 27 12" className="h-[10px] w-auto" aria-hidden>
        <rect x="0.6" y="0.6" width="22.6" height="10.8" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <rect x="2.1" y="2.1" width="16.5" height="7.8" rx="1.6" fill="currentColor" />
        <path d="M25 4.3v3.4c.8-.3 1.3-1 1.3-1.7S25.8 4.6 25 4.3Z" fill="currentColor" fillOpacity="0.4" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ chrome */

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative w-[252px] rounded-[2.6rem] border-[10px] border-foreground bg-foreground shadow-float",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-30 rounded-[1.9rem] ring-1 ring-white/10" />
      <div className="relative overflow-hidden rounded-[1.9rem] bg-background">
        <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
        <div className="relative flex h-10 items-center justify-between px-5 pt-1 text-[12px] font-semibold text-foreground">
          <span className="tabular-nums tracking-tight">9:41</span>
          <span className="absolute left-1/2 top-[7px] h-[24px] w-[80px] -translate-x-1/2 rounded-full bg-foreground" />
          <IosStatusIcons />
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBar() {
  const t = useT();
  return (
    <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" className="h-6 w-6 rounded-md ring-1 ring-border" />
        <span className="text-[13px] font-semibold tracking-tight">MealMate</span>
      </div>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
        {t.app.quota}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- pieces */

function Corner({ className }: { className: string }) {
  return (
    <span className={cn("absolute size-4 rounded-tl-md border-l-2 border-t-2 border-white/85", className)} />
  );
}

function Viewfinder({ scanning = false, done = false, className }: { scanning?: boolean; done?: boolean; className?: string }) {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <div
      className={cn(
        "relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#7cc1ec] via-[#bfe0f5] to-[#f9c489] ring-1 ring-black/5",
        className,
      )}
    >
      <Refrigerator className="size-14 text-white/70 drop-shadow-sm" strokeWidth={1.4} />
      <Corner className="left-3 top-3" />
      <Corner className="right-3 top-3 rotate-90" />
      <Corner className="bottom-3 right-3 rotate-180" />
      <Corner className="bottom-3 left-3 -rotate-90" />
      {scanning && !reduced && (
        <motion.div
          className="absolute inset-x-3 h-0.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)]"
          initial={{ top: "14%" }}
          animate={{ top: ["14%", "82%", "14%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="absolute bottom-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground/85 px-2.5 py-0.5 text-[11px] font-medium text-background backdrop-blur">
        {done ? (
          <>
            <Check className="size-3 text-[#7ee0a8]" /> {t.app.detected}
          </>
        ) : (
          t.app.detecting
        )}
      </span>
    </div>
  );
}

export function IngredientChip({ label, glyph, removable = false }: { label: string; glyph?: GlyphName; removable?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[13px] text-foreground shadow-[0_1px_2px_rgba(47,42,37,0.05)]">
      {glyph ? <FoodGlyph name={glyph} className="size-3 text-primary" /> : <span className="size-1.5 rounded-full bg-primary" />}
      {label}
      {removable && <X className="size-3 text-muted-foreground/50" />}
    </span>
  );
}

export function FifoBadge({ label, days, animated = false, className }: { label?: string; days?: number; animated?: boolean; className?: string }) {
  const t = useT();
  const reduced = useReducedMotion();
  const flicker = animated && !reduced;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-warm-100 to-warm-400/60 px-2 py-0.5 text-[11px] font-medium text-[#5a2d15] ring-1 ring-[#f7b267]/40",
        className,
      )}
    >
      <motion.span
        animate={flicker ? { rotate: [-4, 4, -4], scale: [1, 1.08, 1] } : undefined}
        transition={flicker ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
        className="inline-flex"
      >
        <Flame className="size-3 text-flame" />
      </motion.span>
      {label ?? t.app.useFirst}
      {typeof days === "number" ? ` · ${days} ${t.app.daysUnit}` : ""}
    </span>
  );
}

const DISH_GRADIENTS = [
  "from-[#fff1df] via-[#ffe2c2] to-[#ffce9e]",
  "from-[#e7f4dd] via-[#d6ecc4] to-[#c2e3a6]",
  "from-[#fde6e0] via-[#fbd3c8] to-[#f6bda9]",
] as const;

export function DishCard({
  title,
  cookTime,
  difficulty = "easy",
  why,
  glyph = "bowl",
  variant = 0,
  expanded = false,
  missing = false,
  steps,
  className,
}: {
  title: string;
  cookTime: number;
  difficulty?: "easy" | "medium" | "hard";
  why?: string;
  glyph?: GlyphName;
  variant?: 0 | 1 | 2;
  expanded?: boolean;
  missing?: boolean;
  steps?: readonly string[];
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-white shadow-card ring-1 ring-white/60", className)}>
      <div className={cn("relative flex h-24 items-center justify-center bg-gradient-to-br", DISH_GRADIENTS[variant])}>
        <FoodGlyph name={glyph} className="size-14 text-[#c0703a]/70" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#b85a2e] shadow-sm backdrop-blur">
          <Clock className="size-3" /> {cookTime}&apos;
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[15px] font-semibold tracking-tight">{title}</h4>
          <span className="shrink-0 text-[11px] capitalize text-muted-foreground">{difficulty}</span>
        </div>
        {why && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{why}</p>}
        {expanded && (
          <div className="mt-2 border-t border-border/70 pt-2">
            {missing && <p className="text-[12px] text-[#b85a2e]">{t.app.alsoNeeds}</p>}
            {steps && (
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[12px] text-muted-foreground">
                {steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        )}
        {!expanded && (
          <div className="mt-1.5 flex items-center gap-1 text-[12px] text-primary">
            <Check className="size-3.5" /> {t.app.cookableFooter}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- AppScreen */

export function AppScreen({ variant }: { variant: "capture" | "confirm" | "results" }) {
  const t = useT();
  const confirmChips: { label: string; glyph?: GlyphName }[] = [
    { label: t.app.ing.tomato, glyph: "tomato" },
    { label: t.app.ing.eggs, glyph: "egg" },
    { label: t.app.ing.springOnion, glyph: "leaf" },
    { label: t.app.ing.beef },
    { label: t.app.ing.garlic },
  ];
  return (
    <div className="w-full">
      <StatusBar />
      <div className="flex flex-col gap-3 p-4">
        {variant === "capture" && (
          <>
            <Viewfinder />
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm">
              <Camera className="size-4" /> {t.app.captureBtn}
            </button>
            <p className="text-center text-[12px] text-muted-foreground">{t.app.captureHint}</p>
          </>
        )}

        {variant === "confirm" && (
          <>
            <p className="text-[13px] font-semibold">{t.app.confirmCount}</p>
            <div className="flex flex-wrap gap-1.5">
              {confirmChips.map((c) => (
                <IngredientChip key={c.label} label={c.label} glyph={c.glyph} removable />
              ))}
              <FifoBadge label={t.app.ing.waterSpinach} days={2} />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
              <Plus className="size-3.5" /> {t.app.addIngredient}
            </div>
            <button className="rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm">
              {t.app.suggestBtn}
            </button>
          </>
        )}

        {variant === "results" && (
          <div className="flex flex-col gap-2.5">
            <DishCard
              title={t.app.dishes.eggTomato.title}
              cookTime={15}
              difficulty="easy"
              variant={0}
              glyph="egg"
              expanded
              why={t.app.dishes.eggTomato.why}
              missing
              steps={t.app.dishes.eggTomato.steps}
            />
            <DishCard title={t.app.dishes.beefSpinach.title} cookTime={12} difficulty="easy" variant={1} glyph="leaf" why={t.app.dishes.beefSpinach.why} />
            <DishCard title={t.app.dishes.tomatoSoup.title} cookTime={10} difficulty="easy" variant={2} glyph="bowl" why={t.app.dishes.tomatoSoup.why} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- floating hero cards */

/** Slim floating card — recipe steps (the cooking-guide feature). */
export function FloatRecipeCard({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("w-[164px] rounded-2xl border border-border bg-white p-3.5 shadow-float ring-1 ring-white/60", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t.app.recipeLabel}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-[#b85a2e]">
          <Clock className="size-3" /> 12&apos;
        </span>
      </div>
      <h4 className="mt-1.5 text-[14px] font-semibold tracking-tight">{t.app.dishes.beefSpinach.title}</h4>
      <ol className="mt-2.5 flex flex-col gap-2 text-[12px] leading-snug text-foreground/80">
        {t.app.dishes.beefSpinach.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Slim floating card — the FIFO "expiring food" feature. */
export function FloatFifoCard({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("w-[156px] rounded-2xl border border-border bg-white p-3.5 shadow-float ring-1 ring-white/60", className)}>
      <FifoBadge label={t.app.ing.waterSpinach} days={2} animated />
      <p className="mt-2 text-[12px] leading-snug text-foreground/80">{t.app.fifoCardText}</p>
    </div>
  );
}

/* ----------------------------------------------------- Hero lead asset */

function DishRow({ title, cookTime, glyph, variant = 0 }: { title: string; cookTime: number; glyph: GlyphName; variant?: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white p-2 shadow-[0_1px_2px_rgba(47,42,37,0.05)]">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", DISH_GRADIENTS[variant])}>
        <FoodGlyph name={glyph} className="size-5 text-[#b85a2e]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
      <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
        <Clock className="size-3" /> {cookTime}&apos;
      </span>
    </div>
  );
}

export function HeroScanLoop() {
  const t = useT();
  const reduced = useReducedMotion();
  const chips: { label: string; glyph?: GlyphName }[] = [
    { label: t.app.ing.tomato, glyph: "tomato" },
    { label: t.app.ing.eggs, glyph: "egg" },
    { label: t.app.ing.springOnion, glyph: "leaf" },
    { label: t.app.ing.beef },
  ];
  return (
    <PhoneFrame className="w-[248px]">
      <StatusBar />
      <div className="relative h-[416px] overflow-hidden">
        <motion.div
          className="flex flex-col gap-2.5 p-3.5"
          variants={heroContainer}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.div variants={heroItem}>
            <Viewfinder scanning done className="h-[88px]" />
          </motion.div>

          <motion.div variants={heroItem} className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <IngredientChip key={c.label} label={c.label} glyph={c.glyph} />
            ))}
            <FifoBadge label={t.app.ing.waterSpinach} days={2} animated />
          </motion.div>

          <motion.p variants={heroItem} className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t.app.heroDishesLabel}
          </motion.p>

          <motion.div variants={heroItem}>
            <DishCard
              title={t.app.dishes.eggTomato.title}
              cookTime={15}
              difficulty="easy"
              variant={0}
              glyph="egg"
              why={t.app.dishes.eggTomato.why}
            />
          </motion.div>
          <motion.div variants={heroItem} className="flex flex-col gap-2">
            <DishRow title={t.app.dishes.beefSpinach.title} cookTime={12} glyph="leaf" variant={1} />
            <DishRow title={t.app.dishes.tomatoSoup.title} cookTime={10} glyph="bowl" variant={2} />
          </motion.div>
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-background to-transparent" />
      </div>
    </PhoneFrame>
  );
}
