import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminBarChart } from "@/components/admin-bar-chart";

export const dynamic = "force-dynamic";

const DAYS = 30;

const vnDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);

// Kept out of the component body so the clock reads don't trip render-purity lint.
function timeWindow() {
  const now = Date.now();
  const days = Array.from({ length: DAYS }, (_, i) => vnDay(new Date(now - (DAYS - 1 - i) * 86400000)));
  const sinceIso = new Date(now - DAYS * 86400000).toISOString();
  return { days, sinceIso };
}

export default async function AdminChartsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const locale = await getLocale();
  const t = STR[locale].admin;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";
  const money = (n: number) => `${n.toLocaleString(numLocale)}đ`;
  const num = (n: number) => n.toLocaleString(numLocale);

  // Last 30 VN days as YYYY-MM-DD, oldest → newest.
  const { days, sinceIso } = timeWindow();

  const admin = createAdminClient();
  const [paidRes, signupRes] = await Promise.all([
    admin.from("payments").select("amount_vnd, created_at").eq("status", "paid").gte("created_at", sinceIso),
    admin.from("profiles").select("created_at").gte("created_at", sinceIso),
  ]);

  const revByDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const p of paidRes.data ?? []) {
    const d = vnDay(new Date(p.created_at));
    if (d in revByDay) revByDay[d] += p.amount_vnd ?? 0;
  }
  const signByDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const s of signupRes.data ?? []) {
    const d = vnDay(new Date(s.created_at));
    if (d in signByDay) signByDay[d] += 1;
  }

  const revenue = days.map((d) => revByDay[d]);
  const signups = days.map((d) => signByDay[d]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t.overview}
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.chartsTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.chartsSub}</p>
      </div>

      <AdminBarChart
        title={t.chartRevenue}
        total={money(revenue.reduce((a, b) => a + b, 0))}
        days={days}
        data={revenue}
        format={money}
      />
      <AdminBarChart
        title={t.chartSignups}
        total={num(signups.reduce((a, b) => a + b, 0))}
        days={days}
        data={signups}
        format={num}
      />
    </main>
  );
}
