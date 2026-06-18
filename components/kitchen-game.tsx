"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RotateCcw, X, ChefHat, Star } from "lucide-react";
import { useLang, useT } from "@/components/landing/i18n";
import { FoodGlyph, type GlyphName } from "@/components/landing/food-glyphs";
import type { CookStep, Recipe } from "@/lib/kitchen/recipes";

const GLYPH: Record<CookStep["kind"], GlyphName> = {
  chop: "tomato",
  add: "egg",
  stirfry: "pan",
  season: "sauce",
  plate: "bowl",
};

/** Tap-when-in-the-green-zone mini-game (chop / stir-fry / season). */
function TimingBar({ zone, reps, onDone }: { zone: number; reps: number; onDone: (n: number) => void }) {
  const reduced = useReducedMotion();
  const { lang } = useLang();
  const [pos, setPos] = useState(0.5);
  const [hits, setHits] = useState<number[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const posRef = useRef(0.5);
  const dirRef = useRef(1);
  const hitsRef = useRef<number[]>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    if (reduced) return; // marker parked centre (in zone) — still tappable
    let raf = 0;
    let last = 0;
    const speed = 0.8;
    const tick = (t: number) => {
      if (!last) last = t;
      const dt = (t - last) / 1000;
      last = t;
      let p = posRef.current + dirRef.current * speed * dt;
      if (p >= 1) { p = 1; dirRef.current = -1; }
      if (p <= 0) { p = 0; dirRef.current = 1; }
      posRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  function tap() {
    if (doneRef.current) return;
    const d = Math.abs(posRef.current - 0.5);
    const half = zone / 2;
    const score = d <= half ? Math.round(100 - (d / half) * 25) : Math.max(0, Math.round(70 - (d - half) * 240));
    setFlash(score >= 85 ? "perfect" : score >= 55 ? "good" : "miss");
    setTimeout(() => setFlash(null), 500);
    const next = [...hitsRef.current, score];
    hitsRef.current = next;
    setHits(next);
    if (next.length >= reps) {
      doneRef.current = true;
      setTimeout(() => onDone(Math.round(next.reduce((a, b) => a + b, 0) / next.length)), 350);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative h-6 w-full max-w-xs overflow-hidden rounded-full bg-[#efe2cf] ring-1 ring-black/5">
        <div
          className="absolute inset-y-0 rounded-full bg-[#bfe0a0]"
          style={{ left: `${(0.5 - zone / 2) * 100}%`, width: `${zone * 100}%` }}
        />
        <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-[#2f2a25]" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: reps }).map((_, i) => (
          <span key={i} className={`size-2.5 rounded-full transition ${i < hits.length ? "bg-primary" : "bg-[#e0d6c6]"}`} />
        ))}
      </div>
      <div className="relative">
        {flash && (
          <motion.span
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -28 }}
            className={`pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-sm font-extrabold ${
              flash === "perfect" ? "text-[#3b6d11]" : flash === "good" ? "text-[#b85a2e]" : "text-[#c8102e]"
            }`}
          >
            {flash === "perfect" ? "Perfect!" : flash === "good" ? "Good" : "Miss"}
          </motion.span>
        )}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            tap();
          }}
          className="rounded-2xl bg-gradient-to-br from-[#f7b267] to-[#ef6c3a] px-12 py-4 text-lg font-extrabold text-white shadow-float transition active:scale-95"
        >
          {lang === "en" ? "Tap!" : "Chạm!"}
        </button>
      </div>
    </div>
  );
}

/** Single satisfying tap (add to pan / plate up). */
function TapTarget({ glyph, onDone }: { glyph: GlyphName; onDone: (n: number) => void }) {
  const [hit, setHit] = useState(false);
  return (
    <motion.button
      animate={hit ? { scale: 0.2, opacity: 0, y: 40 } : { scale: [1, 1.06, 1] }}
      transition={hit ? { duration: 0.4 } : { duration: 1.2, repeat: Infinity }}
      onPointerDown={() => {
        if (hit) return;
        setHit(true);
        setTimeout(() => onDone(100), 380);
      }}
      className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-[#f7b267] to-[#ef6c3a] text-white shadow-float active:scale-95"
    >
      <FoodGlyph name={glyph} className="size-12" />
    </motion.button>
  );
}

export function KitchenGame({ recipe, onExit }: { recipe: Recipe; onExit: () => void }) {
  const t = useT().kitchen;
  const { lang } = useLang();
  const en = lang === "en";
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const recTitle = en && recipe.title_en ? recipe.title_en : recipe.title_vi;
  const step = recipe.steps[idx];

  function complete(points: number) {
    const s = [...scores, points];
    setScores(s);
    if (idx + 1 >= recipe.steps.length) setDone(true);
    else setIdx(idx + 1);
  }
  function restart() {
    setIdx(0);
    setScores([]);
    setDone(false);
  }

  if (done) {
    const total = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const stars = total >= 85 ? 3 : total >= 55 ? 2 : 1;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-float ring-1 ring-white/60"
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#f7b267] to-[#ef6c3a] text-white shadow-float">
          <ChefHat className="size-10" />
        </span>
        <div className="flex gap-1">
          {[1, 2, 3].map((n) => (
            <Star key={n} className={`size-8 ${n <= stars ? "fill-[#f5a623] text-[#f5a623]" : "text-[#e0d6c6]"}`} />
          ))}
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-tight">{recTitle}</p>
          <p className="text-sm text-muted-foreground">
            {t.score}: {total}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            onClick={restart}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-float transition active:scale-95"
          >
            <RotateCcw className="size-4" /> {t.again}
          </button>
          <button onClick={onExit} className="rounded-2xl bg-muted py-3 text-sm font-semibold transition hover:bg-primary/10">
            {t.other}
          </button>
        </div>
      </motion.div>
    );
  }

  const itemOf = (s: Extract<CookStep, { item: string }>) => (en && s.item_en ? s.item_en : s.item);
  let prompt = "";
  let hint = "";
  if (step.kind === "chop") {
    prompt = `${en ? "Chop" : "Thái"} ${itemOf(step)}`;
    hint = en ? "Tap when the line hits green" : "Chạm khi vạch vào vùng xanh";
  } else if (step.kind === "add") {
    prompt = `${en ? "Add" : "Cho"} ${itemOf(step)}${en ? "" : " vào chảo"}`;
    hint = en ? "Tap to add" : "Chạm để cho vào";
  } else if (step.kind === "stirfry") {
    prompt = en ? "Stir-fry!" : "Đảo đều tay!";
    hint = en ? "Tap on the beat" : "Chạm đúng nhịp";
  } else if (step.kind === "season") {
    prompt = `${en ? "Season:" : "Nêm"} ${itemOf(step)}`;
    hint = en ? "Stop on the green mark" : "Canh đúng vạch xanh";
  } else {
    prompt = en ? "Plate it up" : "Bày ra đĩa";
    hint = en ? "Tap to plate" : "Chạm để bày";
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted-foreground">{recTitle}</span>
        <button
          onClick={onExit}
          aria-label={t.other}
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex gap-1">
        {recipe.steps.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < idx ? "bg-primary" : i === idx ? "bg-primary/40" : "bg-[#e7ddcd]"}`}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-b from-[#f7e6cf] to-[#f0d3ad] p-6 shadow-card ring-1 ring-white/40">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-white/70 text-[#b85a2e] shadow-card">
          <FoodGlyph name={GLYPH[step.kind]} className="size-8" />
        </span>
        <div className="text-center">
          <p className="text-lg font-extrabold tracking-tight text-[#2f2a25]">{prompt}</p>
          <p className="text-xs text-[#8a7a64]">{hint}</p>
        </div>
        {step.kind === "add" || step.kind === "plate" ? (
          <TapTarget key={idx} glyph={GLYPH[step.kind]} onDone={complete} />
        ) : (
          <TimingBar
            key={idx}
            reps={
              step.kind === "chop"
                ? step.slices
                : step.kind === "stirfry"
                  ? Math.min(4, Math.max(2, Math.round(step.seconds / 4)))
                  : 1
            }
            zone={step.kind === "season" ? 0.16 : step.kind === "stirfry" ? 0.3 : 0.24}
            onDone={complete}
          />
        )}
      </div>
    </div>
  );
}
