export type TierProfile = {
  tier: string;
  created_at: string;
};

export type TierPrice = {
  tier: string;
  price_vnd: number;
};

export type TierCommercialMetrics = {
  paidUserCount: number;
  revenueTotal: number;
  byTier: Record<string, { count: number; revenue: number }>;
  revenueByDay: Record<string, number>;
};

const vnDay = (createdAt: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(createdAt));

export function summarizeTierCommercialMetrics(
  profiles: readonly TierProfile[],
  tierPrices: readonly TierPrice[],
  days: readonly string[] = [],
): TierCommercialMetrics {
  const prices = new Map(tierPrices.map(({ tier, price_vnd }) => [tier, price_vnd]));
  const revenueByDay = Object.fromEntries(days.map((day) => [day, 0]));
  const trackedDays = new Set(days);
  const byTier: TierCommercialMetrics["byTier"] = {};
  let paidUserCount = 0;
  let revenueTotal = 0;

  for (const profile of profiles) {
    const price = prices.get(profile.tier);
    if (price === undefined) throw new Error(`Missing live price for tier: ${profile.tier}`);
    if (!Number.isSafeInteger(price) || price < 0) throw new Error(`Invalid live price for tier: ${profile.tier}`);
    if (profile.tier === "free") continue;

    paidUserCount += 1;
    revenueTotal += price;

    const tier = (byTier[profile.tier] ??= { count: 0, revenue: 0 });
    tier.count += 1;
    tier.revenue += price;

    const day = vnDay(profile.created_at);
    if (trackedDays.has(day)) revenueByDay[day] += price;
  }

  return { paidUserCount, revenueTotal, byTier, revenueByDay };
}
