import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const locale = await getLocale();
  const t = STR[locale].result;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6">
      <div className="flex w-full flex-col items-center gap-4 rounded-3xl bg-card p-7 text-center shadow-card ring-1 ring-white/60">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" />
        </span>
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.body}</p>
        <p className="text-sm">
          {t.currentTier}:{" "}
          <span className="font-semibold uppercase">{profile?.tier ?? "free"}</span>
        </p>
        <Link href="/home" className={buttonVariants({ className: "w-full shadow-float" })}>
          {t.backHome}
        </Link>
      </div>
    </main>
  );
}
