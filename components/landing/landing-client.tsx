"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import {
  ArrowLeftRight,
  ArrowRight,
  Briefcase,
  Camera,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Flame,
  Globe,
  GraduationCap,
  HelpCircle,
  Lock,
  MessageCircle,
  Pencil,
  Refrigerator,
  Search,
  ShieldCheck,
  Soup,
  Sparkles,
  Timer,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Atmosphere, Grain } from "./atmosphere";
import { FoodGlyph, type GlyphName } from "./food-glyphs";
import {
  AppScreen,
  DishCard,
  FifoBadge,
  FloatFifoCard,
  FloatRecipeCard,
  HeroScanLoop,
  IngredientChip,
} from "./app-screen";
import { useLang, useT } from "./i18n";

export type LandingTier = {
  tier: string;
  display_label: string;
  price_vnd: number;
  daily_scan_limit: number;
  suggestions_per_scan: number;
};

/* Structural (language-independent) metadata paired with translated text. */
const PAIN_ICONS = [Refrigerator, ChefHat, Clock];
const USE_ICONS = [Briefcase, Wallet, Flame, GraduationCap];
const STEP_ICONS = [Camera, Sparkles, UtensilsCrossed];
const STAT_META = [
  { Icon: TrendingUp, value: 73.9, decimals: 1, suffix: "%", prefix: "", unit: undefined as string | undefined },
  { Icon: Timer, value: 30, decimals: 0, suffix: "", prefix: "~", unit: "s" as string | undefined },
  { Icon: ChefHat, value: 87.7, decimals: 1, suffix: "%", prefix: "", unit: undefined as string | undefined },
];
const TRUST_ICONS = [ShieldCheck, Zap, Soup, Pencil];
const GALLERY_META: { cookTime: number; difficulty: "easy" | "medium" | "hard"; glyph: GlyphName; variant: 0 | 1 | 2 }[] = [
  { cookTime: 15, difficulty: "easy", glyph: "egg", variant: 0 },
  { cookTime: 12, difficulty: "easy", glyph: "leaf", variant: 1 },
  { cookTime: 10, difficulty: "easy", glyph: "bowl", variant: 2 },
  { cookTime: 18, difficulty: "medium", glyph: "pan", variant: 0 },
  { cookTime: 15, difficulty: "easy", glyph: "tomato", variant: 1 },
  { cookTime: 25, difficulty: "medium", glyph: "fish", variant: 2 },
  { cookTime: 8, difficulty: "easy", glyph: "leaf", variant: 1 },
  { cookTime: 35, difficulty: "medium", glyph: "egg", variant: 0 },
];
const DEMO_META = [
  { variant: "capture" as const, tilt: -2.5 },
  { variant: "confirm" as const, tilt: 0 },
  { variant: "results" as const, tilt: 2.5 },
];
const FOOTER_HREFS: string[][] = [
  ["#features", "#how", "#pricing", "#faq"],
  ["#", "#", "#", "#"],
  ["#", "#", "#", "#"],
];

const expo = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: expo } },
};
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
// once:false → sections re-animate every time they scroll into view (up or down),
// like Obello — not just on first load.
const reveal = (margin = "-70px") => ({
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: false, margin },
  variants: fadeUp,
});
const revealStagger = (margin = "-60px") => ({
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: false, margin },
  variants: container,
});

const SECTION_Y = "py-[clamp(52px,6vw,100px)]";

function vnd(n: number, freeLabel: string) {
  return n === 0 ? freeLabel : `${n.toLocaleString("vi-VN")}đ`;
}

/* ----------------------------------------------------------- small helpers */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
      {children}
    </span>
  );
}

function BandFade({ flip = false }: { flip?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-16 w-full bg-gradient-to-b",
        flip ? "from-[#f6f1e8] to-background" : "from-background to-[#f6f1e8]",
      )}
    />
  );
}

function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  unit,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  unit?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return; // reduced motion shows the final value directly
    let raf = 0;
    const start = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduced]);

  const display = reduced ? value : n;

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
      {unit && <span className="ml-1 text-[0.5em] font-bold text-muted-foreground">{unit}</span>}
    </span>
  );
}

/* ----------------------------------------------------------------- header */

function Header({ authed }: { authed: boolean }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: expo }}
      className={cn(
        "sticky top-0 z-40 backdrop-blur-xl transition-[background-color,border-color,box-shadow,height] duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 shadow-[0_1px_0_rgba(47,42,37,0.04)]"
          : "border-b border-transparent bg-background/60",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center justify-between px-5 transition-[height] duration-300",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="MealMate AI" className="h-9 w-9 rounded-xl ring-1 ring-border" />
          <span className="text-[15px] font-semibold tracking-tight">MealMate AI</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:block">
            {t.nav.how}
          </a>
          <a href="#features" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:block">
            {t.nav.features}
          </a>
          <a href="#pricing" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            {t.nav.pricing}
          </a>
          <details className="group relative hidden sm:block">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium uppercase text-muted-foreground transition-colors hover:text-foreground">
              <Globe className="size-4" /> {lang}
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border bg-popover p-1 shadow-card">
              {(["vi", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    lang === l ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {t.langName[l]}
                  {lang === l && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>
          </details>
          {authed ? (
            <Link href="/home" className={buttonVariants({ size: "sm" })}>{t.nav.app}</Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>{t.nav.login}</Link>
              <Link href="/signup" className={buttonVariants({ size: "sm" })}>{t.nav.start}</Link>
            </>
          )}
        </nav>
      </div>
    </motion.header>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  const t = useT();
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const phoneShift = useTransform(scrollY, [0, 600], [0, -54]);
  const phoneY = useSpring(phoneShift, { stiffness: 100, damping: 30 });

  return (
    <section className="relative isolate overflow-hidden">
      <Atmosphere drift />
      <Grain opacity={0.045} />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] lg:gap-8 lg:pb-24 lg:pt-20">
        <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col items-start gap-6">
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground shadow-sm backdrop-blur"
          >
            <Sparkles className="size-3.5 text-primary" /> {t.hero.eyebrow}
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="text-balance text-[length:var(--text-hero)] font-extrabold leading-[1.02] tracking-[-0.03em]"
          >
            {t.hero.h1a}
            <span className="text-primary">{t.hero.h1b}</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="max-w-[46ch] text-pretty text-[17px] leading-relaxed text-muted-foreground">
            {t.hero.body}
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
            <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "group gap-2 px-8 shadow-float" })}>
              {primaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#demo" className={buttonVariants({ variant: "outline", size: "lg", className: "bg-white/60 backdrop-blur" })}>{t.hero.watch}</a>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            {t.hero.trust.map((label, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border backdrop-blur"
                >
                  <Icon className="size-3.5 text-primary" /> {label}
                </span>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: expo, delay: 0.15 }}
          style={{ y: reduced ? 0 : phoneY }}
          className="relative"
        >
          <div aria-hidden className="absolute -bottom-8 left-1/2 -z-10 h-24 w-72 -translate-x-1/2 rounded-[50%] bg-primary/25 blur-3xl" />

          {/* Phone centered; feature cards sit IN THE SIDE GAPS, not over the screen.
              Adjust positions here: right card = `right-0 top-10`, left card = `left-0 bottom-16`.
              Side gap width is set by the container `lg:max-w-[620px]` vs phone `w-[248px]`. */}
          <div className="relative mx-auto w-[248px] lg:w-full lg:max-w-[640px]">
            <motion.div
              className="relative z-20 mx-auto w-[248px]"
              animate={reduced ? undefined : { y: [0, -10, 0] }}
              transition={reduced ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <HeroScanLoop />
            </motion.div>

            <motion.div
              className="absolute right-1 top-10 z-30 hidden rotate-[3deg] lg:block"
              animate={reduced ? undefined : { y: [0, -8, 0] }}
              transition={reduced ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <FloatRecipeCard />
            </motion.div>
            <motion.div
              className="absolute bottom-16 left-1 z-30 hidden -rotate-[3deg] lg:block"
              animate={reduced ? undefined : { y: [0, -7, 0] }}
              transition={reduced ? undefined : { duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            >
              <FloatFifoCard />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- problem */

function ProblemVisual() {
  const t = useT();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-5 shadow-card ring-1 ring-white/60">
      <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] text-muted-foreground">
        <Search className="size-4 shrink-0" /> {t.problem.overloadSearch}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {t.problem.overloadOptions.map((o) => (
          <div key={o} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5">
            <span className="size-9 shrink-0 rounded-lg bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground/80">{o}</p>
              <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-muted" />
            </div>
            <HelpCircle className="size-4 shrink-0 text-muted-foreground/50" />
          </div>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/90 to-transparent" />
      <div className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-medium text-background shadow-lg">
        <Clock className="size-3.5" /> {t.problem.overloadTimer}
      </div>
    </div>
  );
}

function Problem() {
  const t = useT();
  return (
    <>
      <BandFade />
      <section className="relative isolate overflow-hidden bg-[#f6f1e8]">
        <FoodGlyph name="bowl" className="pointer-events-none absolute -right-10 top-10 -z-10 size-72 text-[#e0843f]/[0.05]" />
        <div className={cn("mx-auto w-full max-w-6xl px-5", SECTION_Y)}>
          <motion.div {...reveal()} className="max-w-2xl">
            <SectionLabel>{t.problem.label}</SectionLabel>
            <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold leading-[1.08] tracking-[-0.02em]">
              {t.problem.h2}
            </h2>
          </motion.div>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
            <div>
              <motion.div {...reveal()}>
                <p className="text-[length:var(--text-stat)] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                  15–30<span className="ml-2 align-baseline text-2xl font-bold text-muted-foreground">{t.problem.statUnit}</span>
                </p>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">{t.problem.statSub}</p>
              </motion.div>

              <motion.div {...revealStagger()} className="mt-6 flex flex-col">
                {t.problem.pains.map((p, i) => {
                  const Icon = PAIN_ICONS[i];
                  return (
                    <motion.div
                      key={p.title}
                      variants={fadeUp}
                      className={cn(
                        "flex items-start gap-4 py-4",
                        i !== t.problem.pains.length - 1 && "border-b border-border/70",
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-snug">{p.title}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{p.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <motion.div {...reveal()} className="relative mx-auto w-full max-w-sm">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                {t.problem.oldWay}
              </span>
              <ProblemVisual />
            </motion.div>
          </div>
        </div>
      </section>
      <BandFade flip />
    </>
  );
}

/* ----------------------------------------------------------- how it works */

function StepFragment({ index }: { index: number }) {
  const t = useT();
  if (index === 0) {
    return (
      <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#7cc1ec] via-[#bfe0f5] to-[#f9c489] ring-1 ring-black/5">
        <Refrigerator className="size-10 text-white/75" strokeWidth={1.4} />
        <span className="absolute left-3 top-3 size-4 rounded-tl-md border-l-2 border-t-2 border-white/85" />
        <span className="absolute right-3 top-3 size-4 rotate-90 rounded-tl-md border-l-2 border-t-2 border-white/85" />
        <span className="absolute bottom-3 right-3 size-4 rotate-180 rounded-tl-md border-l-2 border-t-2 border-white/85" />
        <span className="absolute bottom-3 left-3 size-4 -rotate-90 rounded-tl-md border-l-2 border-t-2 border-white/85" />
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex h-28 flex-col justify-center gap-2 rounded-2xl bg-muted/50 p-4">
        <div className="flex flex-wrap gap-1.5">
          <IngredientChip label={t.app.ing.tomato} glyph="tomato" />
          <IngredientChip label={t.app.ing.eggs} glyph="egg" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FifoBadge label={t.app.ing.waterSpinach} days={2} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-28 items-center gap-3 rounded-2xl bg-muted/50 p-3">
      <div className="flex h-full w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff1df] to-[#ffce9e]">
        <FoodGlyph name="egg" className="size-10 text-[#b85a2e]" />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold leading-tight">{t.app.dishes.eggTomato.title}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <Clock className="size-3" /> 15&apos; · easy
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-primary">
          <Check className="size-3" /> {t.app.cookableFooter}
        </p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const t = useT();
  return (
    <section id="how" className={cn("mx-auto w-full max-w-6xl scroll-mt-24 px-5", SECTION_Y)}>
      <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
        <SectionLabel>{t.steps.label}</SectionLabel>
        <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.steps.h2}</h2>
        <p className="mt-4 text-muted-foreground">{t.steps.sub}</p>
      </motion.div>

      <div className="relative mt-14">
        <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-border via-primary/40 to-border sm:block" />
        <motion.div {...revealStagger()} className="grid gap-10 sm:grid-cols-3 sm:gap-6">
          {t.steps.items.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.div key={s.title} variants={fadeUp} className="relative flex flex-col items-start gap-4">
                <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-card ring-1 ring-border">
                  <Icon className="size-5" strokeWidth={1.8} />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground tabular-nums">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
                <div className="w-full">
                  <StepFragment index={i} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ demo */

function Demo() {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <>
      <div aria-hidden className="h-16 w-full bg-gradient-to-b from-background to-[#eef7fb]" />
      <section id="demo" className="relative isolate overflow-hidden scroll-mt-24 bg-[#eef7fb]">
        <div className={cn("mx-auto w-full max-w-6xl px-5", SECTION_Y)}>
          <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
            <SectionLabel>{t.demo.label}</SectionLabel>
            <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.demo.h2}</h2>
            <p className="mt-4 text-muted-foreground">{t.demo.sub}</p>
          </motion.div>

          <motion.div {...revealStagger()} className="mt-14 grid items-center gap-8 sm:grid-cols-3 sm:gap-5">
            {DEMO_META.map((d, i) => (
              <motion.div
                key={d.variant}
                variants={fadeUp}
                whileHover={reduced ? undefined : { y: -8, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                style={{ rotate: d.tilt }}
                className={cn("mx-auto w-full max-w-[300px]", i === 1 && "sm:-mt-6")}
              >
                <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-card ring-1 ring-white/60">
                  <AppScreen variant={d.variant} />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-[15px] font-semibold">{i + 1}. {t.demo.items[i].title}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{t.demo.items[i].caption}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      <div aria-hidden className="h-16 w-full bg-gradient-to-b from-[#eef7fb] to-background" />
    </>
  );
}

/* -------------------------------------------------------------- features */

function Features() {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <section id="features" className={cn("relative isolate overflow-hidden mx-auto w-full max-w-6xl px-5 scroll-mt-24", SECTION_Y)}>
      <motion.div {...reveal()} className="max-w-2xl">
        <SectionLabel>{t.features.label}</SectionLabel>
        <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">
          {t.features.h2a}<span className="text-primary">{t.features.h2hl}</span>
        </h2>
      </motion.div>

      <motion.div
        {...revealStagger()}
        className="mt-12 grid auto-rows-[minmax(168px,auto)] grid-cols-1 gap-4 md:grid-cols-3"
      >
        <motion.div
          variants={fadeUp}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-white p-7 shadow-card ring-1 ring-white/60 md:col-span-2 md:row-span-2"
        >
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-6" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 text-xl font-bold tracking-tight">{t.features.aTitle}</h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{t.features.aDesc}</p>
          </div>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <DishCard title={t.gallery.dishes[0].title} cookTime={15} variant={0} glyph="egg" why={t.gallery.dishes[0].why} />
            <DishCard title={t.gallery.dishes[1].title} cookTime={12} variant={1} glyph="leaf" why={t.gallery.dishes[1].why} />
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          whileHover={reduced ? undefined : { y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-warm-50 p-7 shadow-card ring-1 ring-[#f7b267]/40 md:row-span-2"
        >
          <FoodGlyph name="leaf" className="pointer-events-none absolute -right-6 -top-6 size-36 text-[#e0843f]/[0.08]" />
          <div>
            <FifoBadge label={t.features.bBadge} days={2} animated className="text-xs" />
            <h3 className="mt-4 text-xl font-bold tracking-tight text-[#8a4b25]">{t.features.bTitle}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[#8a4b25]">{t.features.bDesc}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-1.5">
            <IngredientChip label={t.app.ing.tomato} glyph="tomato" />
            <FifoBadge label={t.app.ing.waterSpinach} days={2} />
            <FifoBadge label={t.app.ing.tofu} days={1} />
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          whileHover={reduced ? undefined : { y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative flex flex-col justify-center overflow-hidden rounded-3xl border border-border bg-white p-7 shadow-card ring-1 ring-white/60 md:col-span-2"
        >
          <FoodGlyph name="chopsticks" className="pointer-events-none absolute -right-4 bottom-0 size-40 text-[#2ba3d9]/[0.06]" />
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ArrowLeftRight className="size-6" strokeWidth={1.8} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t.features.cTitle}</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {t.features.cDescA}<strong className="font-semibold text-foreground">{t.features.cDescHl}</strong>{t.features.cDescB}
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          whileHover={reduced ? undefined : { y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative flex flex-col justify-center overflow-hidden rounded-3xl border border-border bg-white p-7 shadow-card ring-1 ring-white/60"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Soup className="size-6" strokeWidth={1.8} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t.features.dTitle}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{t.features.dDesc}</p>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ----------------------------------------------------------------- stats */

function Stats() {
  const t = useT();
  return (
    <>
      <BandFade />
      <section className="relative isolate overflow-hidden bg-[#f6f1e8]">
        <Atmosphere />
        <motion.div {...revealStagger()} className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-px overflow-hidden px-5 py-16 text-center sm:grid-cols-3">
          {STAT_META.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={cn("px-6 py-2", i !== STAT_META.length - 1 && "sm:border-r sm:border-border/70")}
            >
              <s.Icon className="mx-auto size-5 text-primary/70" strokeWidth={1.8} />
              <p className="mt-3 text-[length:var(--text-stat)] font-extrabold leading-none tracking-[-0.02em] text-primary">
                <CountUp value={s.value} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} unit={s.unit ? t.stats.unit : undefined} />
              </p>
              <p className="mx-auto mt-3 max-w-[26ch] text-sm text-muted-foreground">{t.stats.labels[i]}</p>
            </motion.div>
          ))}
        </motion.div>
        <p className="pb-10 text-center text-[12px] text-muted-foreground">{t.stats.source}</p>
      </section>
      <BandFade flip />
    </>
  );
}

/* --------------------------------------------------------------- pricing */

function Pricing({ tiers, primaryHref }: { tiers: LandingTier[]; primaryHref: string }) {
  const t = useT();
  return (
    <section id="pricing" className={cn("relative isolate overflow-hidden mx-auto w-full max-w-6xl scroll-mt-24 px-5", SECTION_Y)}>
      <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
        <SectionLabel>{t.pricing.label}</SectionLabel>
        <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.pricing.h2}</h2>
        <p className="mt-4 text-muted-foreground">{t.pricing.sub}</p>
      </motion.div>

      <motion.div {...revealStagger()} className="mt-12 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => {
          const popular = tier.tier === "vip";
          return (
            <motion.div
              key={tier.tier}
              variants={fadeUp}
              className={cn(
                "relative flex h-full flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-white/60",
                popular
                  ? "z-10 shadow-float ring-2 ring-primary/30 lg:scale-[1.04] bg-primary/[0.03]"
                  : "border border-border shadow-card",
              )}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                  {t.pricing.popular}
                </span>
              )}
              <div>
                <h3 className="font-semibold">{tier.display_label}</h3>
                <p className="mt-1">
                  <span className={cn("text-3xl font-extrabold tabular-nums tracking-tight", popular && "bg-gradient-to-r from-[#2ba3d9] to-[#e0843f] bg-clip-text text-transparent")}>
                    {vnd(tier.price_vnd, t.pricing.free)}
                  </span>
                  {tier.price_vnd > 0 && <span className="text-sm text-muted-foreground">{t.pricing.perMonth}</span>}
                </p>
                {popular && <p className="mt-1.5 text-xs font-medium text-primary">{t.pricing.popularSub}</p>}
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {tier.daily_scan_limit} {t.pricing.perScans}</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {tier.suggestions_per_scan} {t.pricing.perDishes}</li>
                {(t.pricing.extras[tier.tier] ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" /> {f}</li>
                ))}
              </ul>
              <Link href={primaryHref} className={buttonVariants({ variant: popular ? "default" : "outline", className: "w-full" })}>
                {tier.price_vnd === 0 ? t.pricing.start : `${t.pricing.choose} ${tier.display_label}`}
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

/* ---------------------------------------------------------------- privacy */

function Privacy() {
  const t = useT();
  return (
    <section className="mx-auto w-full max-w-4xl px-5 pb-[clamp(48px,6vw,90px)]">
      <motion.div
        {...reveal()}
        className="flex flex-col items-center gap-6 rounded-3xl bg-primary/5 p-8 text-center ring-1 ring-primary/15 sm:flex-row sm:text-left"
      >
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="size-7" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">{t.privacy.h3}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t.privacy.text}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {t.hero.trust.map((label, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
                  <Icon className="size-3.5 text-primary" /> {label}
                </span>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------- faq */

function Faq({ primaryHref }: { primaryHref: string }) {
  const t = useT();
  return (
    <>
      <BandFade />
      <section id="faq" className="scroll-mt-24 bg-[#f6f1e8]">
        <div className={cn("mx-auto grid w-full max-w-6xl gap-10 px-5 lg:grid-cols-[minmax(0,36%)_minmax(0,64%)]", SECTION_Y)}>
          <motion.div {...reveal()} className="lg:sticky lg:top-24 lg:self-start">
            <SectionLabel>{t.faq.label}</SectionLabel>
            <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.faq.h2}</h2>
            <p className="mt-4 text-muted-foreground">{t.faq.sub}</p>
            <div className="mt-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-white/60">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageCircle className="size-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 font-semibold">{t.faq.contactH3}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.faq.contactText}</p>
              <Link href={primaryHref} className={buttonVariants({ className: "mt-4 w-full" })}>
                {t.faq.contactCta}
              </Link>
            </div>
          </motion.div>

          <motion.div {...revealStagger()} className="flex flex-col gap-3">
            {t.faq.items.map((f) => (
              <motion.details key={f.q} variants={fadeUp} className="group rounded-2xl bg-white p-5 shadow-card ring-1 ring-white/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </motion.details>
            ))}
          </motion.div>
        </div>
      </section>
      <BandFade flip />
    </>
  );
}

/* -------------------------------------------------------------------- cta */

function Cta({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  const t = useT();
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-5", SECTION_Y)}>
      <motion.div
        {...reveal()}
        className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2ba3d9] to-[#1b7aa8] px-6 py-16 text-center text-white shadow-float"
      >
        <FoodGlyph name="bowl" className="pointer-events-none absolute -left-8 -bottom-8 size-56 text-white/[0.07]" />
        <FoodGlyph name="chopsticks" className="pointer-events-none absolute -right-6 -top-6 size-44 text-white/[0.07]" />
        <h2 className="max-w-xl text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.cta.h2}</h2>
        <p className="max-w-md text-white/90">{t.cta.text}</p>
        <Link
          href={primaryHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-semibold text-[#1b7aa8] shadow-lg transition hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {primaryLabel}
          <ArrowRight className="size-4" />
        </Link>
        <p className="text-xs text-white/80">{t.cta.reassure}</p>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------- use cases */

function UseCases() {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-5", SECTION_Y)}>
      <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
        <SectionLabel>{t.uses.label}</SectionLabel>
        <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.uses.h2}</h2>
        <p className="mt-4 text-muted-foreground">{t.uses.sub}</p>
      </motion.div>
      <motion.div {...revealStagger()} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {t.uses.items.map((u, i) => {
          const Icon = USE_ICONS[i];
          return (
            <motion.div
              key={u.title}
              variants={fadeUp}
              whileHover={reduced ? undefined : { y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-white p-6 shadow-card ring-1 ring-white/60"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold leading-snug">{u.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{u.desc}</p>
              <p className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-3 text-[13px] font-semibold text-primary">
                <ArrowRight className="size-3.5 shrink-0" /> {u.out}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

/* --------------------------------------------------------- dishes gallery */

function DishGallery({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden">
      <Atmosphere />
      <div className={cn("mx-auto w-full max-w-6xl px-5", SECTION_Y)}>
        <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t.gallery.label}</SectionLabel>
          <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.gallery.h2}</h2>
          <p className="mt-4 text-muted-foreground">{t.gallery.sub}</p>
        </motion.div>
        <motion.div {...revealStagger("-40px")} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GALLERY_META.map((d, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={reduced ? undefined : { y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <DishCard
                title={t.gallery.dishes[i].title}
                cookTime={d.cookTime}
                difficulty={d.difficulty}
                why={t.gallery.dishes[i].why}
                glyph={d.glyph}
                variant={d.variant}
              />
            </motion.div>
          ))}
        </motion.div>
        <motion.div {...reveal()} className="mt-10 text-center">
          <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "px-8 shadow-float" })}>{primaryLabel}</Link>
          <p className="mt-3 text-xs text-muted-foreground">{t.gallery.subline}</p>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- compare */

function Comparison() {
  const t = useT();
  return (
    <section className={cn("mx-auto w-full max-w-5xl px-5", SECTION_Y)}>
      <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
        <SectionLabel>{t.compare.label}</SectionLabel>
        <h2 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-[-0.02em]">{t.compare.h2}</h2>
      </motion.div>
      <motion.div {...revealStagger()} className="mt-12 grid items-stretch gap-5 md:grid-cols-2">
        <motion.div variants={fadeUp} className="rounded-3xl border border-border bg-white/50 p-7">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-full bg-muted">
              <X className="size-4" />
            </span>
            <h3 className="font-semibold">{t.compare.oldLabel}</h3>
          </div>
          <ul className="mt-5 flex flex-col gap-3.5">
            {t.compare.old.map((x) => (
              <li key={x} className="flex items-start gap-3 text-sm text-muted-foreground">
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" /> {x}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div variants={fadeUp} className="rounded-3xl bg-primary/[0.04] p-7 shadow-card ring-1 ring-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="size-4" />
            </span>
            <h3 className="font-semibold text-foreground">{t.compare.newLabel}</h3>
          </div>
          <ul className="mt-5 flex flex-col gap-3.5">
            {t.compare.new.map((x) => (
              <li key={x} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {x}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */

function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-border/60 bg-[#faf6ee]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="MealMate AI" className="h-9 w-9 rounded-xl ring-1 ring-border" />
            <span className="text-[15px] font-semibold tracking-tight">MealMate AI</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.footer.tagline}</p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs text-muted-foreground ring-1 ring-primary/15">
            <ShieldCheck className="size-3.5 text-primary" /> {t.footer.trustPill}
          </span>
        </div>
        {t.footer.cols.map((col, ci) => (
          <div key={col.title}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground/70">{col.title}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((label, li) => (
                <li key={label}>
                  <a href={FOOTER_HREFS[ci][li]} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>{t.footer.bottomL}</span>
          <span>{t.footer.bottomR}</span>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------- root */

function LandingContent({ authed, tiers }: { authed: boolean; tiers: LandingTier[] }) {
  const t = useT();
  const primaryHref = authed ? "/home" : "/signup";
  const primaryLabel = authed ? t.ctaApp : t.ctaStart;

  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <Header authed={authed} />
      <Hero primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <Problem />
      <UseCases />
      <HowItWorks />
      <Demo />
      <DishGallery primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <Features />
      <Comparison />
      <Stats />
      <Pricing tiers={tiers} primaryHref={primaryHref} />
      <Privacy />
      <Faq primaryHref={primaryHref} />
      <Cta primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <Footer />
    </div>
  );
}

export function LandingClient({ authed, tiers }: { authed: boolean; tiers: LandingTier[] }) {
  // The LangProvider is mounted once in the root layout (app/layout.tsx) so the
  // language choice carries across the whole app, not just here.
  return <LandingContent authed={authed} tiers={tiers} />;
}
