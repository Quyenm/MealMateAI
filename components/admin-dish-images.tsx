"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";

type Row = {
  title_key: string;
  image_url: string | null;
  credit_url: string | null;
  source: string | null;
  created_at: string;
};

export function AdminDishImages({ rows }: { rows: Row[] }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function clear(key: string) {
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/dish-image?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.admin.imgCleared);
      router.refresh();
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
        {t.admin.imgEmpty}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((r) => (
        <div
          key={r.title_key}
          className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border/60"
        >
          <div className="relative aspect-square w-full bg-muted">
            {r.image_url ? (
              <a href={r.credit_url ?? r.image_url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image_url} alt="" className="h-full w-full object-cover" />
              </a>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-warm-100 to-warm-200">
                <UtensilsCrossed className="size-7 text-[#b85a2e]/40" />
              </div>
            )}
            <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {r.source ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 p-2">
            <span className="truncate text-xs font-medium" title={r.title_key}>
              {r.title_key}
            </span>
            <button
              type="button"
              disabled={busy === r.title_key}
              onClick={() => clear(r.title_key)}
              aria-label={t.admin.imgClear}
              className="shrink-0 text-muted-foreground/50 transition hover:text-[#c8102e] disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
