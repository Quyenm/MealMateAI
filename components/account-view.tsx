"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountView({ email }: { email: string }) {
  const t = useT();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function changePassword() {
    setBusy("pw");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", password: pw }),
      });
      if (!res.ok) throw new Error();
      setPw("");
      toast.success(t.account.pwSaved);
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(null);
    }
  }

  async function changeEmail() {
    setBusy("email");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email", email: newEmail.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewEmail("");
      toast.success(t.account.emailSent);
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.account.deleted);
      await createClient().auth.signOut();
      router.push("/");
    } catch {
      toast.error(t.scan.toast.netErr);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* password */}
      <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-card ring-1 ring-white/60">
        <span className="text-sm font-semibold">{t.account.pwLabel}</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" autoComplete="new-password" />
          <Button disabled={busy === "pw" || pw.length < 6} onClick={changePassword}>
            {t.account.pwSave}
          </Button>
        </div>
      </div>

      {/* email */}
      <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-card ring-1 ring-white/60">
        <span className="text-sm font-semibold">{t.account.emailLabel}</span>
        <p className="text-xs text-muted-foreground">{email}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" />
          <Button
            variant="outline"
            disabled={busy === "email" || !/.+@.+\..+/.test(newEmail)}
            onClick={changeEmail}
          >
            {t.account.emailSave}
          </Button>
        </div>
      </div>

      {/* danger zone */}
      <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 shadow-card ring-1 ring-[#c8102e]/30">
        <span className="text-sm font-semibold text-[#c8102e]">{t.account.dangerTitle}</span>
        <p className="text-xs text-muted-foreground">{t.account.deleteWarn}</p>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t.account.deleteConfirm}
        />
        <Button
          variant="outline"
          disabled={busy === "delete" || confirm.trim().toUpperCase() !== t.account.deleteWord}
          onClick={deleteAccount}
          className="self-start border-[#c8102e]/40 text-[#c8102e] hover:bg-[#c8102e]/5"
        >
          {t.account.deleteAccount}
        </Button>
      </div>
    </div>
  );
}
