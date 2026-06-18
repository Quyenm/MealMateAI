import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { KitchenHome } from "@/components/kitchen-home";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PAID = new Set(["vip", "svip", "family"]);

export default async function KitchenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: prof } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
  const allowed = PAID.has((prof?.tier as string) ?? "free");
  const t = STR[await getLocale()].kitchen;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 lg:p-8">
      {allowed ? (
        <KitchenHome />
      ) : (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-float ring-1 ring-white/60">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f7b267] to-[#ef6c3a] text-white shadow-float">
            <Lock className="size-8" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.teaser}</p>
          </div>
          <Link href="/upgrade" className={buttonVariants({ className: "w-full shadow-float" })}>
            {t.upgrade}
          </Link>
        </div>
      )}
    </main>
  );
}
