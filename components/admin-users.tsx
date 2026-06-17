"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Input } from "@/components/ui/input";

type User = { id: string; email: string; tier: string; created_at: string };
const TIERS = ["free", "vip", "svip", "family"] as const;

export function AdminUsers({ users, numLocale }: { users: User[]; numLocale: string }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function setTier(userId: string, tier: string) {
    setBusy(userId);
    try {
      const res = await fetch("/api/admin/user-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.admin.tierUpdated);
      router.refresh();
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(null);
    }
  }

  const shown = q.trim()
    ? users.filter((u) => u.email.toLowerCase().includes(q.trim().toLowerCase()))
    : users;

  return (
    <div className="flex flex-col gap-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.admin.searchUsers} />

      {shown.length === 0 && (
        <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-white/60">
          {t.admin.noUsers}
        </div>
      )}

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-white/60">
        {shown.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.email}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString(numLocale)}
              </p>
            </div>
            <select
              value={u.tier}
              disabled={busy === u.id}
              onChange={(e) => setTier(u.id, e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold uppercase outline-none transition focus:border-primary disabled:opacity-40"
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
