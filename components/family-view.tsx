"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = { user_id: string; role: string; email: string };
type Household = { id: string; name: string; join_code: string };

export function FamilyView({
  household,
  members,
  meId,
}: {
  household: Household | null;
  members: Member[];
  meId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(body: object, okMsg?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        const map: Record<string, string> = {
          already_member: t.family.already,
          not_found: t.family.notFound,
          full: t.family.full,
        };
        toast.error((d.error && map[d.error]) || t.scan.toast.netErr);
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(false);
    }
  }

  if (!household) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t.family.subtitle}</p>
        <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
          <span className="font-semibold">{t.family.createTitle}</span>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.family.createPlaceholder} />
            <Button
              disabled={busy || !name.trim()}
              onClick={() => act({ action: "create", name: name.trim() }, t.family.created)}
            >
              {t.family.create}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
          <span className="font-semibold">{t.family.joinTitle}</span>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t.family.joinPlaceholder} />
            <Button
              variant="outline"
              disabled={busy || !code.trim()}
              onClick={() => act({ action: "join", code: code.trim() }, t.family.joined)}
            >
              {t.family.join}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-primary to-[#176f9c] p-5 text-white shadow-float">
        <Users className="size-7" />
        <div>
          <p className="text-lg font-bold">{household.name}</p>
          <p className="text-xs text-white/80">
            {members.length} {t.family.members}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/60">
        <div>
          <p className="text-xs text-muted-foreground">{t.family.code}</p>
          <p className="font-mono text-lg font-bold tracking-widest">{household.join_code}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(household.join_code);
            toast.success(household.join_code);
          }}
          aria-label={t.family.code}
        >
          <Copy className="size-4" />
        </Button>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">{t.family.codeHint}</p>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.family.members}</span>
        {members.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center gap-2 rounded-xl bg-card p-3 text-sm shadow-card ring-1 ring-border/60"
          >
            <span className="flex-1">
              {m.email}
              {m.user_id === meId && <span className="ml-1 text-xs text-muted-foreground">({t.family.you})</span>}
            </span>
            {m.role === "owner" && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {t.family.owner}
              </span>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        disabled={busy}
        onClick={() => act({ action: "leave" }, t.family.left)}
        className="gap-1.5 self-start text-[#c8102e]"
      >
        <LogOut className="size-4" /> {t.family.leave}
      </Button>
    </div>
  );
}
