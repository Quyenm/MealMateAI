"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Check } from "lucide-react";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";

/**
 * Full-screen step-by-step cooking mode with a countdown timer. Steps come from
 * the AI (no per-step durations), so the timer is a manual countdown the user
 * sets per step (pre-filled with the dish cook time).
 */
export function CookMode({
  title,
  steps,
  defaultMin = 5,
  onClose,
  onFinish,
}: {
  title: string;
  steps: string[];
  defaultMin?: number;
  onClose: () => void;
  onFinish?: () => void;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [secs, setSecs] = useState(Math.max(1, Math.round(defaultMin)) * 60);
  const [running, setRunning] = useState(false);
  const total = steps.length;

  useEffect(() => {
    if (!running || secs <= 0) return;
    const id = setTimeout(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [running, secs]);

  useEffect(() => {
    if (running && secs === 0) navigator.vibrate?.([300, 120, 300]);
  }, [running, secs]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const setMinutes = (m: number) => {
    setRunning(false);
    setSecs(m * 60);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="truncate pr-2 font-bold tracking-tight">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.cook.close}
          className="text-muted-foreground transition hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 overflow-y-auto p-6 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          {t.cook.step} {step + 1} {t.cook.of} {total}
        </span>
        <p className="max-w-xl text-2xl font-semibold leading-snug">{steps[step]}</p>

        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.cook.timer}
          </span>
          <span
            className={`font-mono text-5xl font-bold tabular-nums ${
              secs === 0 ? "text-[#ef6c3a]" : ""
            }`}
          >
            {secs === 0 ? t.cook.timeUp : `${mm}:${ss}`}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setRunning((r) => !r)} className="gap-1.5">
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? t.cook.pause : t.cook.startTimer}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMinutes(defaultMin)} className="gap-1.5">
              <RotateCcw className="size-4" /> {t.cook.reset}
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[1, 3, 5, 10, 15, 20].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                {m} {t.cook.min}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-4">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="gap-1"
        >
          <ChevronLeft className="size-4" /> {t.cook.prev}
        </Button>
        {step < total - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(total - 1, s + 1))} className="gap-1 shadow-float">
            {t.cook.next} <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={() => {
              onFinish?.();
              onClose();
            }}
            className="gap-1 shadow-float"
          >
            <Check className="size-4" /> {t.cook.done}
          </Button>
        )}
      </div>
    </div>
  );
}
