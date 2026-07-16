import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner requires the source extension.
import { summarizeTierCommercialMetrics } from "./admin-tier-metrics.ts";

const PRICES = [
  { tier: "free", price_vnd: 0 },
  { tier: "vip", price_vnd: 99_000 },
  { tier: "svip", price_vnd: 198_000 },
  { tier: "family", price_vnd: 499_000 },
];

function profiles(tier: string, count: number, created_at: string) {
  return Array.from({ length: count }, () => ({ tier, created_at }));
}

test("derives paid-user count, revenue, tier subtotals, and daily revenue from profile tiers", () => {
  const rows = [
    ...profiles("vip", 10, "2026-07-01T02:00:00.000Z"),
    ...profiles("svip", 5, "2026-07-01T03:00:00.000Z"),
    ...profiles("family", 1, "2026-07-01T04:00:00.000Z"),
    ...profiles("vip", 12, "2026-07-02T02:00:00.000Z"),
    ...profiles("svip", 6, "2026-07-02T03:00:00.000Z"),
    ...profiles("family", 3, "2026-07-02T04:00:00.000Z"),
    ...profiles("free", 309, "2026-07-02T05:00:00.000Z"),
  ];

  assert.deepEqual(summarizeTierCommercialMetrics(rows, PRICES, ["2026-07-01", "2026-07-02"]), {
    paidUserCount: 37,
    revenueTotal: 6_352_000,
    byTier: {
      vip: { count: 22, revenue: 2_178_000 },
      svip: { count: 11, revenue: 2_178_000 },
      family: { count: 4, revenue: 1_996_000 },
    },
    revenueByDay: {
      "2026-07-01": 2_479_000,
      "2026-07-02": 3_873_000,
    },
  });
});

test("fails closed when a profile tier has no live price", () => {
  assert.throws(
    () => summarizeTierCommercialMetrics(profiles("family", 1, "2026-07-01T00:00:00.000Z"), PRICES.slice(0, 3)),
    /Missing live price for tier: family/,
  );
});
