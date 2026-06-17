"use client";

import { useState } from "react";
import { Plus, X, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { id: string; name: string; checked: boolean };

export function ShoppingList({ initial }: { initial: Item[] }) {
  const t = useT();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");

  const post = (body: object) =>
    fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  async function add() {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    const res = await post({ action: "add", names: [name] });
    if (res.ok) {
      const d = await res.json();
      setItems((xs) => [...(d.items ?? []), ...xs]);
    } else {
      toast.error(t.scan.toast.netErr);
    }
  }
  async function toggle(it: Item) {
    const nowChecked = !it.checked;
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, checked: nowChecked } : x)));
    await post({ action: "toggle", id: it.id, checked: nowChecked });
    // Bought it → it's now in the fridge (dedup handled server-side).
    if (nowChecked) {
      fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stock", items: [{ name: it.name }] }),
      })
        .then((r) => r.ok && toast.success(t.shopping.bought))
        .catch(() => {});
    }
  }
  async function remove(it: Item) {
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    await post({ action: "remove", id: it.id });
  }
  async function clearChecked() {
    setItems((xs) => xs.filter((x) => !x.checked));
    await post({ action: "clearChecked" });
  }
  const active = items.filter((x) => !x.checked);
  const bought = items.filter((x) => x.checked);
  const ordered = [...active, ...bought]; // still-to-buy first, bought sinks down
  const anyChecked = bought.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={t.shopping.placeholder}
        />
        <Button variant="outline" size="icon" onClick={add} aria-label={t.shopping.add}>
          <Plus className="size-5" />
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-white/60">
          {t.shopping.empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((it) => (
            <li
              key={it.id}
              className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card ring-1 ring-white/60 transition ${
                it.checked ? "opacity-60" : ""
              }`}
            >
              <button type="button" onClick={() => toggle(it)} aria-label={it.name} className="-m-1.5 shrink-0 p-1.5">
                <span
                  className={`flex size-6 items-center justify-center rounded-full border-2 transition ${
                    it.checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {it.checked && <Check className="size-3.5" />}
                </span>
              </button>
              <span
                className={`min-w-0 flex-1 text-sm font-medium ${it.checked ? "text-muted-foreground line-through" : ""}`}
              >
                {it.name}
              </span>
              <button
                type="button"
                onClick={() => remove(it)}
                aria-label="remove"
                className="-m-2 shrink-0 rounded-md p-2 text-muted-foreground/60 transition hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {anyChecked && (
        <Button variant="outline" onClick={clearChecked} className="gap-1.5 self-start">
          <Trash2 className="size-4" /> {t.shopping.clearChecked}
        </Button>
      )}
    </div>
  );
}
