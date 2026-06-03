"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/landing/i18n";
import { Turnstile, TURNSTILE_ENABLED } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function redirectTarget() {
  const r = new URLSearchParams(window.location.search).get("redirect");
  // Only same-origin absolute paths — reject "//evil.com" and full URLs.
  return r && r.startsWith("/") && !r.startsWith("//") ? r : "/home";
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha ?? undefined },
    });
    setLoading(false);
    if (error) {
      window.turnstile?.reset();
      setCaptcha(null);
      toast.error(t.auth.loginFail, { description: error.message });
      return;
    }
    router.refresh();
    router.push(redirectTarget());
  }

  async function handleGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
          redirectTarget(),
        )}`,
      },
    });
    if (error) toast.error(t.auth.googleFail, { description: error.message });
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-card ring-1 ring-white/60 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.loginTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.loginSub}</p>
      </div>

      <form onSubmit={handleEmailLogin} className="mt-6 flex flex-col gap-4">
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Turnstile onToken={setCaptcha} />
        <Button
          type="submit"
          disabled={loading || (TURNSTILE_ENABLED && !captcha)}
          className="shadow-float"
        >
          {loading ? t.auth.loginLoading : t.auth.loginCta}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.auth.or}
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
        {t.auth.googleCta}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          {t.auth.signupLink}
        </Link>
      </p>
    </div>
  );
}
