import { redirect } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { UpgradeButton } from "@/components/upgrade-button";

export const dynamic = "force-dynamic";

// The tier highlighted as the best value.
const RECOMMENDED = "vip";

type Tier = {
  tier: string;
  display_label: string;
  daily_scan_limit: number;
  suggestions_per_scan: number;
  price_vnd: number;
};

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const s = STR[locale];
  const t = s.plans;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();
  const currentTier = profile?.tier ?? "free";

  const { data: tiersData } = await supabase
    .from("tier_limits")
    .select("tier, display_label, daily_scan_limit, suggestions_per_scan, price_vnd")
    .order("price_vnd");
  const tiers = (tiersData ?? []) as Tier[];

  const vnd = (n: number) =>
    n === 0 ? t.free : `${n.toLocaleString(locale === "en" ? "en-US" : "vi-VN")}đ`;

  return (
    <main className="mx-auto w-full max-w-5xl p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      {tiers.map((tier) => {
        const isCurrent = tier.tier === currentTier;
        const isRec = tier.tier === RECOMMENDED;
        const extras = s.pricing.extras[tier.tier] ?? [];
        return (
          <div
            key={tier.tier}
            className={`relative flex flex-col gap-4 rounded-3xl bg-card p-5 ring-1 transition ${
              isRec ? "shadow-float ring-2 ring-primary" : "shadow-card ring-border/60"
            }`}
          >
            {isRec && (
              <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {t.recommended}
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold tracking-tight">
                  {tier.price_vnd === 0 ? t.free : tier.display_label}
                </p>
                <p className="mt-0.5 text-lg font-extrabold">
                  {vnd(tier.price_vnd)}
                  {tier.price_vnd > 0 && (
                    <span className="text-sm font-medium text-muted-foreground">{t.perMonth}</span>
                  )}
                </p>
              </div>
              {isCurrent && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {t.current}
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-primary" />
                {tier.daily_scan_limit} {t.scansPerDay}
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-primary" />
                {tier.suggestions_per_scan} {t.dishesPerScan}
              </li>
              {extras.map((f) => (
                <li key={f} className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="size-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {tier.price_vnd > 0 && !isCurrent && (
              <UpgradeButton tier={tier.tier} label={`${t.buy} ${tier.display_label}`} />
            )}
          </div>
        );
      })}
      </div>
    </main>
  );
}
