"use client";

import { useState } from "react";
import { useT } from "@/components/landing/i18n";

type Payment = {
  id: string;
  amount_vnd: number;
  tier_purchased: string;
  status: string;
  created_at: string;
  profiles: { email: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-[#dcf5e7] text-[#1a7f4b]",
  pending: "bg-warm-100 text-[#8a4b25]",
  failed: "bg-[#fde3e3] text-[#c8102e]",
  canceled: "bg-muted text-muted-foreground",
  refunded: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function AdminPayments({ payments, numLocale }: { payments: Payment[]; numLocale: string }) {
  const t = useT();
  const [filter, setFilter] = useState<string>("all");

  const label = (s: string) =>
    (
      {
        paid: t.admin.stPaid,
        pending: t.admin.stPending,
        failed: t.admin.stFailed,
        canceled: t.admin.stCanceled,
        refunded: t.admin.stRefunded,
        expired: t.admin.stExpired,
      } as Record<string, string>
    )[s] ?? s;

  const statuses = ["all", ...Array.from(new Set(payments.map((p) => p.status)))];
  const shown = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? t.admin.filterAll : label(s)}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-white/60">
          {t.admin.noPayments}
        </div>
      )}

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-white/60">
        {shown.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.profiles?.email ?? "?"}</p>
              <p className="text-xs text-muted-foreground">
                {p.tier_purchased.toUpperCase()} · {new Date(p.created_at).toLocaleString(numLocale)}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-primary">{p.amount_vnd.toLocaleString(numLocale)}đ</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                STATUS_STYLE[p.status] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {label(p.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
