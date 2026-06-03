"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";

/** Heart toggle that saves/unsaves a dish (stores a snapshot via /api/favorites). */
export function SaveDishButton({
  scanId,
  dishIndex,
  dish,
  initial = false,
  className = "",
}: {
  scanId: string;
  dishIndex: number;
  dish: unknown;
  initial?: boolean;
  className?: string;
}) {
  const t = useT();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scanId, dish_index: dishIndex, dish, saved: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setSaved(!next);
      toast.error(t.scan.toast.netErr);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={saved ? t.favorites.saved : t.favorites.save}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        saved
          ? "bg-[#ffe2e9] text-[#c8102e]"
          : "bg-muted text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      <Heart className="size-[18px]" fill={saved ? "currentColor" : "none"} />
      {saved ? t.favorites.saved : t.favorites.save}
    </button>
  );
}
