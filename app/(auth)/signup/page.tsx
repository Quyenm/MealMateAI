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

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t.auth.pwTooShort);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        captchaToken: captcha ?? undefined,
      },
    });
    setLoading(false);
    if (error) {
      window.turnstile?.reset();
      setCaptcha(null);
      toast.error(t.auth.signupFail, { description: error.message });
      return;
    }
    if (data.session) {
      // Email confirmation is off → user is signed in immediately.
      router.refresh();
      router.push("/home");
    } else {
      toast.success(t.auth.checkEmail);
      router.push("/login");
    }
  }

  async function handleGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(t.auth.googleFail, { description: error.message });
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-card ring-1 ring-white/60 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.signupTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.signupSub}</p>
      </div>

      <form onSubmit={handleSignup} className="mt-6 flex flex-col gap-4">
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
            placeholder={t.auth.passwordHint}
          />
        </div>
        <Turnstile onToken={setCaptcha} />
        <Button
          type="submit"
          disabled={loading || (TURNSTILE_ENABLED && !captcha)}
          className="shadow-float"
        >
          {loading ? t.auth.signupLoading : t.auth.signupCta}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t.auth.agreePre}{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            {t.auth.termsLink}
          </Link>{" "}
          {t.auth.agreeAnd}{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            {t.auth.privacyLink}
          </Link>
          .
        </p>
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
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t.auth.loginLink}
        </Link>
      </p>
    </div>
  );
}
