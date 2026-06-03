import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Clock, CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

type Quota = { tier: string; used: number; scan_limit: number; remaining: number };
type RecentScan = {
  id: string;
  created_at: string;
  // suggestions.scan_id is UNIQUE → embedded as a single object, not an array.
  suggestions: { dishes: { title_vi: string; title_en?: string }[] } | null;
};

export default async function HomePage() {
  // Deduped with the (app) layout's nav via React cache() — one auth round-trip.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].home;

  const supabase = await createClient();
  // The two reads are independent — run them in parallel instead of serially.
  const [{ data: qData }, { data: rData }] = await Promise.all([
    supabase.rpc("get_quota_status", { p_user: user.id }),
    supabase
      .from("scans")
      .select("id, created_at, suggestions(dishes)")
      .eq("user_id", user.id)
      .eq("status", "suggested")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const q = (Array.isArray(qData) ? qData[0] : qData) as Quota | null;
  const used = q?.used ?? 0;
  const limit = q?.scan_limit ?? 3;
  const remaining = q?.remaining ?? Math.max(limit - used, 0);
  const tier = q?.tier ?? "free";
  const remainingPct = limit > 0 ? Math.max(0, Math.round((remaining / limit) * 100)) : 0;
  const recent = (rData ?? []) as unknown as RecentScan[];
  const dateLocale = locale === "en" ? "en-US" : "vi-VN";
  const en = locale === "en";

  return (
    <main className="mx-auto w-full max-w-5xl p-4 lg:p-8">
      <div className="flex flex-col gap-5">
        {/* greeting */}
        <div className="pt-1">
          <p className="text-sm text-muted-foreground">{t.greeting}</p>
          <p className="truncate text-lg font-bold tracking-tight lg:text-xl">{user.email}</p>
        </div>

        {/* hero row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* quota hero */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#176f9c] p-5 text-white shadow-float lg:col-span-2 lg:p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">{t.quotaToday}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase">
                {tier}
              </span>
            </div>
            <p className="mt-3 text-5xl font-extrabold leading-none">
              {remaining}
              <span className="text-xl font-medium text-white/70"> / {limit}</span>
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${remainingPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/70">
              {used} {t.usedSuffix}
            </p>
          </div>

          {/* scan CTA */}
          <Link
            href="/scan"
            className="flex items-center justify-center gap-2 rounded-3xl bg-primary p-5 text-base font-semibold text-primary-foreground shadow-float transition hover:opacity-95 active:translate-y-px lg:flex-col lg:gap-3 lg:p-6"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 lg:size-14">
              <Camera className="size-6 lg:size-7" />
            </span>
            {t.scanCta}
          </Link>
        </div>

        {/* quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/history"
            className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:shadow-float lg:p-5"
          >
            <Clock className="size-5 text-primary" />
            <span className="text-sm font-semibold">{t.historyTitle}</span>
            <span className="text-xs text-muted-foreground">{t.historySub}</span>
          </Link>
          <Link
            href="/upgrade"
            className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:shadow-float lg:p-5"
          >
            <CreditCard className="size-5 text-primary" />
            <span className="text-sm font-semibold">{t.plansTitle}</span>
            <span className="text-xs text-muted-foreground">{t.plansSub}</span>
          </Link>
        </div>

        {/* recent */}
        <section className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t.recent}</p>
          {recent.length === 0 ? (
            <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
              {t.empty}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recent.map((s) => {
                const titles = (s.suggestions?.dishes ?? [])
                  .slice(0, 3)
                  .map((d) => (en && d.title_en ? d.title_en : d.title_vi))
                  .join(" · ");
                return (
                  <Link
                    key={s.id}
                    href="/history"
                    className="rounded-xl bg-card p-3 shadow-card ring-1 ring-border/60 transition hover:shadow-float"
                  >
                    <p className="line-clamp-1 text-sm font-medium">{titles || t.noDish}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString(dateLocale, {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
