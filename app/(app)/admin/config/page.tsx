import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminConfig } from "@/components/admin-config";

export const dynamic = "force-dynamic";

type TierRow = {
  tier: string;
  display_label: string;
  price_vnd: number;
  daily_scan_limit: number;
  suggestions_per_scan: number;
};

export default async function AdminConfigPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const locale = await getLocale();
  const t = STR[locale].admin;

  const admin = createAdminClient();
  const { data } = await admin
    .from("tier_limits")
    .select("tier, display_label, price_vnd, daily_scan_limit, suggestions_per_scan")
    .order("price_vnd");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t.overview}
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.configTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.configSub}</p>
      </div>
      <AdminConfig tiers={(data ?? []) as TierRow[]} />
    </main>
  );
}
