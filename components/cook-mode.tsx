"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Check,
  PartyPopper,
  ImagePlus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downscale } from "@/lib/client-image";

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

  // Post-cook celebration + share-to-community.
  const [celebrating, setCelebrating] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await downscale(file, 1080, 0.72));
    } catch {
      toast.error(t.cook.photoError);
    }
  }

  async function share() {
    if (!photo) return;
    setPosting(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish_title: title, note: note.trim() || undefined, image: photo }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.cook.posted);
      onClose();
    } catch {
      toast.error(t.cook.postError);
    } finally {
      setPosting(false);
    }
  }

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

  if (celebrating) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-end border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cook.close}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto p-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#176f9c] text-white shadow-float">
            <PartyPopper className="size-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t.cook.celebrateTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.cook.celebrateSub} <span className="font-semibold text-foreground">{title}</span>
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-card p-5 text-left shadow-card ring-1 ring-border/60">
            <span className="text-sm font-semibold">{t.cook.shareTitle}</span>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pickPhoto}
              className="hidden"
            />
            {photo ? (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="overflow-hidden rounded-2xl ring-1 ring-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <ImagePlus className="size-7" />
                <span className="text-sm font-medium">{t.cook.addPhoto}</span>
              </button>
            )}
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.cook.notePlaceholder}
              maxLength={280}
            />
            <Button onClick={share} disabled={!photo || posting} className="gap-1.5 shadow-float">
              <Send className="size-4" /> {posting ? t.cook.posting : t.cook.shareCta}
            </Button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t.cook.later}
          </button>
        </div>
      </div>
    );
  }

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
          {/* Live fine-tune — works even while the timer runs, for dishes that
              take longer than expected. */}
          <div className="flex items-center gap-1.5">
            {[
              { label: "−1′", d: -60 },
              { label: "+1′", d: 60 },
              { label: "+5′", d: 300 },
            ].map(({ label, d }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSecs((s) => Math.max(0, s + d))}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[3, 5, 10, 15, 20, 30, 45].map((m) => (
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
              setCelebrating(true);
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
