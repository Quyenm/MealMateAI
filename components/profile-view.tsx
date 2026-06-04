"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileView({
  email,
  displayName,
  tier,
  memberSince,
  stats,
}: {
  email: string;
  displayName: string;
  tier: string;
  memberSince: string;
  stats: { scans: number; saved: number; posts: number };
}) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);

  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  const dirty = name.trim() !== displayName.trim() && name.trim().length > 0;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.profile.saved);
      router.refresh();
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* identity */}
      <div className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#176f9c] text-2xl font-bold text-white shadow-float">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight">{name || email}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* name editor */}
      <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
        <span className="text-sm font-semibold">{t.profile.nameLabel}</span>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.profile.namePlaceholder} maxLength={40} />
          <Button disabled={busy || !dirty} onClick={save}>
            {t.profile.save}
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t.profile.statScans, value: stats.scans },
          { label: t.profile.statSaved, value: stats.saved },
          { label: t.profile.statPosts, value: stats.posts },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-0.5 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/60">
            <span className="text-2xl font-bold tracking-tight">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* account meta */}
      <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 text-sm shadow-card ring-1 ring-border/60">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t.profile.plan}</span>
          <span className="font-semibold uppercase">{tier}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t.profile.memberSince}</span>
          <span className="font-medium">{memberSince}</span>
        </div>
      </div>
    </div>
  );
}
