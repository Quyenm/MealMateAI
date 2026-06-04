"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Dietary = "none" | "keto" | "eat_clean" | "muscle_gain";
type CookTime = "5min" | "15min" | "30min_plus";
type Spice = "mild" | "medium" | "hot";

function Pick<T extends string>({
  label,
  value,
  opts,
  onChange,
}: {
  label: string;
  value: T;
  opts: Record<string, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">
        {Object.entries(opts).map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v as T)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition ${
              value === v ? "bg-primary text-white ring-primary" : "bg-card text-foreground ring-border hover:ring-primary/50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OnboardingForm() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [dietary, setDietary] = useState<Dietary>("none");
  const [cookTime, setCookTime] = useState<CookTime>("15min");
  const [spice, setSpice] = useState<Spice>("medium");
  const [busy, setBusy] = useState(false);

  async function finish(withPrefs: boolean) {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { onboarding_completed: true };
      if (withPrefs) {
        if (name.trim()) body.display_name = name.trim();
        body.dietary_pref = dietary;
        body.cook_time_pref = cookTime;
        body.spice_pref = spice;
      }
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      router.refresh();
      router.push("/home");
    } catch {
      toast.error(t.scan.toast.netErr);
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl bg-card p-6 shadow-card ring-1 ring-border/60">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.onboarding.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.sub}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.profile.nameLabel}</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.profile.namePlaceholder} maxLength={40} />
      </div>

      <Pick label={t.settings.dietary} value={dietary} opts={t.settings.dietaryOpts} onChange={setDietary} />
      <Pick label={t.settings.cookTime} value={cookTime} opts={t.settings.cookTimeOpts} onChange={setCookTime} />
      <Pick label={t.settings.spice} value={spice} opts={t.settings.spiceOpts} onChange={setSpice} />

      <Button disabled={busy} onClick={() => finish(true)} className="shadow-float">
        {t.onboarding.cta}
      </Button>
      <button
        type="button"
        disabled={busy}
        onClick={() => finish(false)}
        className="text-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        {t.onboarding.skip}
      </button>
    </div>
  );
}
