import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Wallet, Package, ScanLine, type LucideIcon } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminPaymentActions } from "@/components/admin-payment-actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  amount_vnd: number;
  tier_purchased: string;
  user_id: string;
  created_at: string;
  profiles: { email: string } | null;
};

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-card p-4 shadow-card ring-1 ring-white/60">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default async function AdminPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const locale = await getLocale();
  const t = STR[locale].admin;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";
  const money = (n: number) => `${n.toLocaleString(numLocale)}đ`;

  // Time boundaries (VN day for "today"/"this month").
  const vnNow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const todayStart = `${vnNow}T00:00:00+07:00`;
  const monthStartMs = Date.parse(`${vnNow.slice(0, 7)}-01T00:00:00+07:00`);
  const weekAgoMs = Date.now() - 7 * 86400000;

  const admin = createAdminClient();
  const [pendingList, profilesRes, paidRes, scansTotalRes, scansTodayRes] = await Promise.all([
    admin
      .from("payments")
      .select("id, amount_vnd, tier_purchased, user_id, created_at, profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("tier, created_at"),
    admin.from("payments").select("amount_vnd, tier_purchased, created_at").eq("status", "paid"),
    admin.from("scans").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin
      .from("scans")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", todayStart),
  ]);

  const rows = (pendingList.data ?? []) as unknown as Row[];

  const profiles = (profilesRes.data ?? []) as { tier: string; created_at: string }[];
  const totalUsers = profiles.length;
  const newUsers7d = profiles.filter((p) => Date.parse(p.created_at) >= weekAgoMs).length;
  const usersByTier = profiles.reduce<Record<string, number>>((m, p) => {
    m[p.tier] = (m[p.tier] ?? 0) + 1;
    return m;
  }, {});

  const paid = (paidRes.data ?? []) as { amount_vnd: number; tier_purchased: string; created_at: string }[];
  const revenueTotal = paid.reduce((s, p) => s + (p.amount_vnd ?? 0), 0);
  const revenueMonth = paid
    .filter((p) => Date.parse(p.created_at) >= monthStartMs)
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0);
  const soldByTier = paid.reduce<Record<string, { count: number; revenue: number }>>((m, p) => {
    const e = (m[p.tier_purchased] ??= { count: 0, revenue: 0 });
    e.count += 1;
    e.revenue += p.amount_vnd ?? 0;
    return m;
  }, {});

  const pendingCount = rows.length;
  const scansTotal = scansTotalRes.count ?? 0;
  const scansToday = scansTodayRes.count ?? 0;

  const TIER_ORDER = ["vip", "svip", "family", "free"];
  const sortTiers = (keys: string[]) =>
    [...keys].sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 lg:p-8">
      {/* ── Dashboard ── */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight">{t.overview}</h1>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/admin/users", label: t.navUsers },
            { href: "/admin/payments", label: t.navPayments },
            { href: "/admin/charts", label: t.navCharts },
            { href: "/admin/analytics", label: t.navAnalytics },
            { href: "/admin/config", label: t.navConfig },
            { href: "/admin/images", label: t.imgTitle },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Users}
          label={t.statUsers}
          value={totalUsers.toLocaleString(numLocale)}
          sub={`+${newUsers7d} ${t.statNew7d}`}
        />
        <Stat
          icon={Wallet}
          label={t.statRevenue}
          value={money(revenueTotal)}
          sub={`${money(revenueMonth)} ${t.statThisMonth}`}
        />
        <Stat
          icon={Package}
          label={t.statSold}
          value={paid.length.toLocaleString(numLocale)}
          sub={`${pendingCount} ${t.statPending}`}
        />
        <Stat
          icon={ScanLine}
          label={t.statScans}
          value={scansTotal.toLocaleString(numLocale)}
          sub={`+${scansToday} ${t.statToday}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-card ring-1 ring-white/60">
          <span className="text-sm font-semibold">{t.soldByTier}</span>
          {sortTiers(Object.keys(soldByTier)).map((tier) => (
            <div key={tier} className="flex items-center justify-between text-sm">
              <span className="font-medium">{tier.toUpperCase()}</span>
              <span className="text-muted-foreground">
                {soldByTier[tier].count} · <span className="text-primary">{money(soldByTier[tier].revenue)}</span>
              </span>
            </div>
          ))}
          {!Object.keys(soldByTier).length && <span className="text-sm text-muted-foreground">—</span>}
        </div>

        <div className="flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-card ring-1 ring-white/60">
          <span className="text-sm font-semibold">{t.usersByTier}</span>
          {sortTiers(Object.keys(usersByTier)).map((tier) => (
            <div key={tier} className="flex items-center justify-between text-sm">
              <span className="font-medium">{tier.toUpperCase()}</span>
              <span className="text-muted-foreground">{usersByTier[tier]}</span>
            </div>
          ))}
          {!Object.keys(usersByTier).length && <span className="text-sm text-muted-foreground">—</span>}
        </div>
      </div>

      {/* ── Pending approvals ── */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.sub}</p>
        </div>

        {rows.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-white/60">
            {t.empty}
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          {rows.map((p) => {
            const note = `MM ${p.tier_purchased.toUpperCase()} ${p.user_id.slice(0, 6)}`;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-white/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold tracking-tight">{p.tier_purchased.toUpperCase()}</span>
                  <span className="font-bold text-primary">{money(p.amount_vnd)}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">{t.user}: </span>
                    {p.profiles?.email ?? "?"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t.matchNote}: </span>
                    <span className="font-mono font-semibold">{note}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString(numLocale)}
                  </p>
                </div>
                <AdminPaymentActions paymentId={p.id} />
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
