import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Activity,
  UserPlus,
  Layers,
  Timer,
  MousePointerClick,
  TrendingUp,
  ArrowDownWideNarrow,
  Wallet,
} from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminBarChart } from "@/components/admin-bar-chart";
import { AdminAutoRefresh } from "@/components/admin-auto-refresh";

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

type Summary = {
  sessions: number;
  visitors: number;
  new_visitors: number;
  returning_visitors: number;
  bounce_rate: number;
  avg_session_seconds: number;
  pages_per_session: number;
  avg_scroll_depth: number;
  signup_conversion: number;
  paid_conversion: number;
  top_sources: { source: string; hits: number }[];
  daily: { d: string; sessions: number }[];
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ clean?: string }>;
}) {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  // Default: count ALL traffic so the dashboard isn't empty early on.
  // ?clean=1 → exclude internal (admin) traffic for real-user-only metrics.
  const includeInternal = (await searchParams)?.clean !== "1";

  const locale = await getLocale();
  const t = STR[locale].admin;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";

  // PostgREST may return bigint/numeric as strings — coerce defensively.
  const g = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
  const num = (n: number) => Math.round(n).toLocaleString(numLocale);
  const dec = (n: number) => n.toLocaleString(numLocale, { maximumFractionDigits: 1 });
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const dur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const { days, sinceIso } = timeWindow();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_analytics_summary", {
    p_since: sinceIso,
    p_include_internal: includeInternal,
  });
  if (error) console.error("admin_analytics_summary failed", error);
  const s = (data ?? {}) as Partial<Summary>;

  // Map the RPC's daily rows onto the fixed 30-day axis (fill gaps with 0).
  const dailyMap: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const row of s.daily ?? []) if (row.d in dailyMap) dailyMap[row.d] = g(row.sessions);
  const sessionsSeries = days.map((d) => dailyMap[d]);

  const sources = s.top_sources ?? [];
  const maxSrc = Math.max(1, ...sources.map((x) => g(x.hits)));

  const cards = [
    { icon: Activity, label: t.anSessions, value: num(g(s.sessions)), sub: `${num(g(s.visitors))} ${t.anVisitors}` },
    { icon: UserPlus, label: t.anNew, value: num(g(s.new_visitors)), sub: `${num(g(s.returning_visitors))} ${t.anReturning}` },
    { icon: Layers, label: t.anPagesPerSession, value: dec(g(s.pages_per_session)), sub: t.anPagesPerSessionSub },
    { icon: Timer, label: t.anAvgDuration, value: dur(g(s.avg_session_seconds)), sub: t.anAvgDurationSub },
    { icon: TrendingUp, label: t.anBounce, value: pct(g(s.bounce_rate)), sub: t.anBounceSub },
    { icon: ArrowDownWideNarrow, label: t.anScroll, value: `${num(g(s.avg_scroll_depth))}%`, sub: t.anScrollSub },
    { icon: MousePointerClick, label: t.anSignupConv, value: pct(g(s.signup_conversion)), sub: t.anSignupConvSub },
    { icon: Wallet, label: t.anPaidConv, value: pct(g(s.paid_conversion)), sub: t.anPaidConvSub },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t.overview}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.anTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.anSub}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> {t.anLive}
          </span>
          <Link
            href={includeInternal ? "/admin/analytics?clean=1" : "/admin/analytics"}
            className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold transition hover:bg-primary/10 hover:text-primary"
          >
            {includeInternal ? t.anRealUsersOnly : t.anIncludeInternal}
          </Link>
        </div>
      </div>
      <AdminAutoRefresh seconds={20} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="flex flex-col gap-1 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border/60"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="size-4" /> {c.label}
              </span>
              <span className="text-2xl font-bold tracking-tight">{c.value}</span>
              <span className="text-xs text-muted-foreground">{c.sub}</span>
            </div>
          );
        })}
      </div>

      <AdminBarChart
        title={t.anSessionsByDay}
        total={num(sessionsSeries.reduce((a, b) => a + b, 0))}
        days={days}
        data={sessionsSeries}
        format={num}
      />

      <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border/60">
        <span className="text-sm font-semibold">{t.anSources}</span>
        {sources.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
        {sources.map((src) => (
          <div key={src.source} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{src.source}</span>
              <span className="text-muted-foreground">{num(g(src.hits))}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round((g(src.hits) / maxSrc) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{includeInternal ? t.anFootnoteAll : t.anFootnote}</p>
    </main>
  );
}
