"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPage() {
  const t = useT();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error(t.auth.pwTooShort);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      toast.error(t.auth.resetInvalid, { description: error.message });
      return;
    }
    toast.success(t.auth.resetDone);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-card ring-1 ring-white/60 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.resetTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.resetSub}</p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pw">{t.auth.password}</Label>
          <Input
            id="pw"
            type="password"
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••"
            autoComplete="new-password"
          />
          <span className="text-xs text-muted-foreground">{t.auth.passwordHint}</span>
        </div>
        <Button type="submit" disabled={loading || pw.length < 6} className="shadow-float">
          {t.auth.resetCta}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t.auth.backToLogin}
        </Link>
      </p>
    </div>
  );
}
