"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";

type Tier = {
  tier: string;
  display_label: string;
  price_vnd: number;
  daily_scan_limit: number;
  suggestions_per_scan: number;
};

function Field({
  label,
  value,
  onChange,
  type = "number",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none transition focus:border-primary"
      />
    </label>
  );
}

export function AdminConfig({ tiers }: { tiers: Tier[] }) {
  const t = useT();
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, Tier>>(
    () => Object.fromEntries(tiers.map((x) => [x.tier, x])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  const edit = (tier: string, key: keyof Tier, raw: string) =>
    setDraft((d) => ({
      ...d,
      [tier]: { ...d[tier], [key]: key === "display_label" ? raw : Number(raw) },
    }));

  async function save(tier: string) {
    const row = draft[tier];
    setBusy(tier);
    try {
      const res = await fetch("/api/admin/tier-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          display_label: row.display_label,
          price_vnd: Number(row.price_vnd) || 0,
          daily_scan_limit: Number(row.daily_scan_limit) || 0,
          suggestions_per_scan: Number(row.suggestions_per_scan) || 1,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.admin.cfgSaved);
      router.refresh();
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {tiers.map((x) => {
        const row = draft[x.tier];
        return (
          <div
            key={x.tier}
            className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border/60"
          >
            <span className="font-bold uppercase tracking-tight">{x.tier}</span>
            <div className="flex flex-wrap gap-2">
              <Field label={t.admin.cfgLabel} type="text" value={row.display_label} onChange={(v) => edit(x.tier, "display_label", v)} />
              <Field label={t.admin.cfgPrice} value={row.price_vnd} onChange={(v) => edit(x.tier, "price_vnd", v)} />
              <Field label={t.admin.cfgScans} value={row.daily_scan_limit} onChange={(v) => edit(x.tier, "daily_scan_limit", v)} />
              <Field label={t.admin.cfgDishes} value={row.suggestions_per_scan} onChange={(v) => edit(x.tier, "suggestions_per_scan", v)} />
            </div>
            <Button size="sm" className="self-end" disabled={busy === x.tier} onClick={() => save(x.tier)}>
              {t.admin.cfgSave}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
