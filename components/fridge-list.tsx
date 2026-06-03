"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = {
  id: string;
  name: string;
  name_en: string | null;
  amount: string | null;
  expiry_date: string | null;
};

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function FridgeList({ initial }: { initial: Item[] }) {
  const t = useT();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");

  const post = (body: object) =>
    fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const amountLabel = (a: string | null) =>
    a === "low" ? t.scan.amountLow : a === "medium" ? t.scan.amountMedium : a === "high" ? t.scan.amountHigh : null;

  const sorted = [...items].sort((a, b) => {
    const da = daysLeft(a.expiry_date);
    const db = daysLeft(b.expiry_date);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  async function add() {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    const res = await post({ action: "add", items: [{ name }] });
    if (res.ok) {
      const d = await res.json();
      setItems((xs) => [...(d.items ?? []), ...xs]);
    } else {
      toast.error(t.scan.toast.netErr);
    }
  }
  async function remove(it: Item) {
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    await post({ action: "remove", id: it.id });
  }
  async function setExpiry(it: Item, date: string) {
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, expiry_date: date || null } : x)));
    await post({ action: "update", id: it.id, expiry_date: date || null });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={t.fridge.placeholder}
        />
        <Button variant="outline" size="icon" onClick={add} aria-label={t.fridge.add}>
          <Plus className="size-5" />
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
          {t.fridge.empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((it) => {
            const dl = daysLeft(it.expiry_date);
            const expired = dl !== null && dl < 0;
            const soon = dl !== null && dl >= 0 && dl <= 3;
            return (
              <li
                key={it.id}
                className={`flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 shadow-card ring-1 ${
                  expired ? "ring-[#c8102e]/40" : soon ? "ring-warm-400/60" : "ring-border/60"
                }`}
              >
                <span className="font-medium">{it.name}</span>
                {amountLabel(it.amount) && (
                  <span className="text-xs text-muted-foreground">· {amountLabel(it.amount)}</span>
                )}
                {expired && (
                  <span className="rounded-full bg-[#ffe2e9] px-2 py-0.5 text-[11px] font-medium text-[#c8102e]">
                    {t.fridge.expired}
                  </span>
                )}
                {soon && (
                  <span className="rounded-full bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-[#b85a2e]">
                    {t.fridge.soon} · {dl} {t.fridge.daysUnit}
                  </span>
                )}
                <input
                  type="date"
                  value={it.expiry_date ?? ""}
                  onChange={(e) => setExpiry(it, e.target.value)}
                  aria-label={t.fridge.expiry}
                  className="ml-auto rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => remove(it)}
                  aria-label="remove"
                  className="text-muted-foreground/60 transition hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
