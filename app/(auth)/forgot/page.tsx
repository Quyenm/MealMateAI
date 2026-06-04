"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setLoading(false);
    if (error) {
      toast.error(t.auth.loginFail, { description: error.message });
      return;
    }
    setSent(true);
    toast.success(t.auth.forgotSent);
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-card ring-1 ring-white/60 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.forgotTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.forgotSub}</p>
      </div>

      {sent ? (
        <p className="mt-6 rounded-2xl bg-warm-50 p-4 text-sm text-[#8a4b25] ring-1 ring-warm-400/40">
          {t.auth.forgotSent}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
            />
          </div>
          <Button type="submit" disabled={loading} className="shadow-float">
            {t.auth.forgotCta}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t.auth.backToLogin}
        </Link>
      </p>
    </div>
  );
}
