"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Prefs = {
  dietary_pref: "none" | "keto" | "eat_clean" | "muscle_gain";
  cook_time_pref: "5min" | "15min" | "30min_plus";
  spice_pref: "mild" | "medium" | "hot";
  allergies: string[];
  never_suggest: string[];
};

/** Segmented pill control for a single-choice enum preference. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition ${
              value === o.value
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tag/chip input for a string[] preference. */
function Chips({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <span className="-mt-1 text-xs text-muted-foreground">{hint}</span>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-3 pr-1.5 text-sm"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-muted-foreground/60 hover:text-foreground"
                aria-label="remove"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        placeholder={placeholder}
      />
    </div>
  );
}

export function SettingsForm({ initial }: { initial: Prefs }) {
  const t = useT().settings;
  const router = useRouter();
  const [p, setP] = useState<Prefs>(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(t.saved);
      router.refresh();
    } catch {
      toast.error(t.saveError);
    }
    setSaving(false);
  }

  const opt = <T extends string>(rec: Record<T, string>) =>
    (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl bg-card p-5 shadow-card ring-1 ring-white/60 lg:p-6">
        <Segmented
          label={t.dietary}
          value={p.dietary_pref}
          options={opt(t.dietaryOpts)}
          onChange={(v) => setP({ ...p, dietary_pref: v })}
        />
        <Segmented
          label={t.cookTime}
          value={p.cook_time_pref}
          options={opt(t.cookTimeOpts)}
          onChange={(v) => setP({ ...p, cook_time_pref: v })}
        />
        <Segmented
          label={t.spice}
          value={p.spice_pref}
          options={opt(t.spiceOpts)}
          onChange={(v) => setP({ ...p, spice_pref: v })}
        />
        <Chips
          label={t.allergies}
          hint={t.allergiesHint}
          values={p.allergies}
          onChange={(v) => setP({ ...p, allergies: v })}
          placeholder={t.addPlaceholder}
        />
        <Chips
          label={t.neverSuggest}
          hint={t.neverSuggestHint}
          values={p.never_suggest}
          onChange={(v) => setP({ ...p, never_suggest: v })}
          placeholder={t.addPlaceholder}
        />
      </div>

      <Button className="self-start shadow-float" onClick={save} disabled={saving}>
        {saving ? t.saving : t.save}
      </Button>
    </div>
  );
}
