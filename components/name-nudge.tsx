"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** First-run prompt shown on Home until the user picks a display name. */
export function NameNudge() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function save() {
    if (!name.trim()) return;
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
    <div className="relative flex flex-col gap-2 rounded-3xl bg-warm-50 p-4 ring-1 ring-warm-400/40">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="dismiss"
        className="absolute right-3 top-3 text-muted-foreground/60 transition hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <span className="text-sm font-semibold text-[#8a4b25]">{t.profile.nameLabel}</span>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={t.profile.namePlaceholder}
          maxLength={40}
        />
        <Button disabled={busy || !name.trim()} onClick={save}>
          {t.profile.save}
        </Button>
      </div>
    </div>
  );
}
