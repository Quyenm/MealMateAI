import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Clock, CreditCard, Refrigerator, CalendarDays, Apple, ShoppingCart, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { NameNudge } from "@/components/name-nudge";
import { Reveal } from "@/components/reveal";
import { FoodThumb } from "@/components/food-thumb";
import type { GlyphName } from "@/components/landing/food-glyphs";

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
  const [{ data: qData }, { data: rData }, { data: pData }] = await Promise.all([
    supabase.rpc("get_quota_status", { p_user: user.id }),
    supabase
      .from("scans")
      .select("id, created_at, suggestions(dishes)")
      .eq("user_id", user.id)
      .eq("status", "suggested")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("profiles").select("display_name, onboarding_completed").eq("id", user.id).maybeSingle(),
  ]);
  if (pData && !pData.onboarding_completed) redirect("/onboarding");
  const displayName = pData?.display_name || user.email?.split("@")[0] || user.email;

  const q = (Array.isArray(qData) ? qData[0] : qData) as Quota | null;
  const used = q?.used ?? 0;
  const limit = q?.scan_limit ?? 3;
  const remaining = q?.remaining ?? Math.max(limit - used, 0);
  const tier = q?.tier ?? "free";
  const remainingPct = limit > 0 ? Math.max(0, Math.round((remaining / limit) * 100)) : 0;
  const recent = (rData ?? []) as unknown as RecentScan[];
  const dateLocale = locale === "en" ? "en-US" : "vi-VN";
  const en = locale === "en";

  // Presentation-only helpers (no new data is fetched).
  const nav = STR[locale].shell;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();
  const RING_R = 24;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - remainingPct / 100);
  const tiles: { href: string; label: string; Icon: typeof Camera; warm?: boolean }[] = [
    { href: "/fridge", label: nav.fridge, Icon: Refrigerator, warm: true },
    { href: "/plan", label: nav.mealplan, Icon: CalendarDays },
    { href: "/nutrition", label: nav.nutrition, Icon: Apple },
    { href: "/shopping", label: nav.shopping, Icon: ShoppingCart },
    { href: "/history", label: nav.history, Icon: Clock },
    { href: "/upgrade", label: nav.plans, Icon: CreditCard },
  ];
  const GLYPHS: GlyphName[] = ["egg", "leaf", "bowl", "fish"];

  return (
    <main className="mx-auto w-full max-w-5xl p-4 lg:p-8">
      <div className="flex flex-col gap-6">
        {/* greeting + avatar */}
        <Reveal>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t.greeting}</p>
              <p className="truncate text-xl font-bold tracking-tight lg:text-2xl">{displayName}</p>
            </div>
            <Link
              href="/settings"
              aria-label={nav.settings}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#33afe0] to-[#15689a] text-base font-bold text-white shadow-float ring-1 ring-white/30 transition hover:opacity-95"
            >
              {initial}
            </Link>
          </div>
        </Reveal>

        {!pData?.display_name && <NameNudge />}

        {/* quota hero with progress ring + scan CTA */}
        <Reveal delay={60}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#33afe0] to-[#15689a] p-6 text-white shadow-float ring-1 ring-white/15">
            <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="text-sm text-white/85">{t.quotaToday}</span>
                <p className="mt-2 text-5xl font-extrabold leading-none">
                  {remaining}
                  <span className="text-xl font-medium text-white/70"> / {limit}</span>
                </p>
                <p className="mt-1.5 text-xs text-white/75">
                  {used} {t.usedSuffix}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                  {tier}
                </span>
                <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
                  <circle cx="30" cy="30" r={RING_R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="6" />
                  <circle
                    cx="30"
                    cy="30"
                    r={RING_R}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 30 30)"
                  />
                  <text x="30" y="34" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">
                    {remainingPct}%
                  </text>
                </svg>
              </div>
            </div>
            <Link
              href="/scan"
              className="relative mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-[15px] font-bold text-[#15689a] shadow-sm transition hover:bg-white/95 active:translate-y-px"
            >
              <Camera className="size-5" /> {t.scanCta}
            </Link>
          </div>
        </Reveal>

        {/* feature tiles */}
        <Reveal delay={120}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((tile) => {
              const Icon = tile.Icon;
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-2xl ${
                      tile.warm ? "bg-warm-100 text-[#b85a2e]" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">{tile.label}</span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {/* recent */}
        <Reveal delay={180}>
          <section className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t.recent}</p>
            {recent.length === 0 ? (
              <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-white/60">
                {t.empty}
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {recent.map((s, i) => {
                  const titles = (s.suggestions?.dishes ?? [])
                    .slice(0, 3)
                    .map((d) => (en && d.title_en ? d.title_en : d.title_vi))
                    .join(" · ");
                  return (
                    <Link
                      key={s.id}
                      href="/history"
                      className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-float"
                    >
                      <FoodThumb variant={i} glyph={GLYPHS[i % GLYPHS.length]} className="size-11" glyphClassName="size-5" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold">{titles || t.noDish}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleString(dateLocale, { timeZone: "Asia/Ho_Chi_Minh" })}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </main>
  );
}
