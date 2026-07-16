import test from "node:test";
import assert from "node:assert/strict";

import {
  RETURNING_BATCH_ID,
  RETURNING_CAMPAIGN,
  RETURNING_HISTORY_START_AT,
  RETURNING_SESSION_START_AT,
  RETURNING_VISITOR_COUNT,
  buildReturningEvents,
  returningEventIdentity,
  sameReturningPayload,
  toLegacyReturningEvent,
  validateAnalyticsSummary,
  validateCommercialSummary,
} from "./returning-visitors-core.mjs";

const P_SINCE = "2026-06-16T02:00:00.000Z";
const P_UNTIL = "2026-07-16T02:00:00.000Z";

function sourceBatch() {
  return Array.from({ length: 176 }, (_, visitorIndex) => {
    const visitorId = `seed_v_${String(visitorIndex).padStart(3, "0")}`;
    const userId = `00000000-0000-4000-8000-${String(visitorIndex + 1).padStart(12, "0")}`;
    return Array.from({ length: 6 }, (_, eventIndex) => ({
      visitor_id: visitorId,
      session_id: `seed_s_${String(visitorIndex).padStart(3, "0")}`,
      user_id: eventIndex < 2 ? null : userId,
      type: eventIndex < 4 ? "pageview" : eventIndex === 4 ? "click" : "scroll",
      path: eventIndex === 0 ? "/" : "/home",
      referrer: eventIndex === 0 ? null : "",
      utm_source: "synthetic_seed",
      utm_medium: "demo",
      utm_campaign: "fpt-k17-k18-202607-v1",
      scroll_depth: eventIndex === 5 ? 82 : null,
      created_at: new Date(Date.parse("2026-07-02T00:00:00.000Z") + visitorIndex * 60_000 + eventIndex * 1_000).toISOString(),
    }));
  }).flat();
}

function buildOptions(extendedSchema = true) {
  return { pSince: P_SINCE, pUntil: P_UNTIL, extendedSchema };
}

function groupBy(values, key) {
  const groups = new Map();
  for (const value of values) {
    const groupKey = value[key];
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), value]);
  }
  return groups;
}

test("selects the same sorted 70 visitors from a permuted 1,056-row batch", () => {
  const batch = sourceBatch();
  const forward = buildReturningEvents(batch, buildOptions());
  const reversed = buildReturningEvents([...batch].reverse(), buildOptions());

  assert.equal(RETURNING_BATCH_ID, "fpt-returning-202607-v1");
  assert.equal(RETURNING_CAMPAIGN, RETURNING_BATCH_ID);
  assert.equal(RETURNING_VISITOR_COUNT, 70);
  assert.equal(forward.length, 490);
  assert.deepEqual(reversed, forward);

  const selected = [...new Set(forward.map((event) => event.visitor_id))];
  const expected = Array.from({ length: 70 }, (_, index) => `seed_v_${String(index).padStart(3, "0")}`);
  assert.deepEqual(selected, expected);
});

test("builds one history marker and a deterministic 20-35 minute six-event return session per visitor", () => {
  const events = buildReturningEvents(sourceBatch(), buildOptions());
  const byVisitor = groupBy(events, "visitor_id");

  assert.equal(byVisitor.size, 70);
  assert.equal(new Set(events.map(returningEventIdentity)).size, 490);
  assert.equal(new Set(events.map((event) => event.seed_event_key)).size, 490);
  assert.ok(events.every((event) => event.utm_source === "synthetic_seed"));
  assert.ok(events.every((event) => event.utm_medium === "demo"));
  assert.ok(events.every((event) => event.utm_campaign === RETURNING_CAMPAIGN));
  assert.ok(events.every((event) => event.is_synthetic === true));
  assert.ok(events.every((event) => event.seed_batch === RETURNING_BATCH_ID));

  for (const [visitorId, visitorEvents] of byVisitor) {
    assert.equal(visitorEvents.length, 7);
    const sessions = [...groupBy(visitorEvents, "session_id").values()].sort((a, b) => a.length - b.length);
    assert.deepEqual(sessions.map((session) => session.length), [1, 6]);
    const [history, returning] = sessions;
    assert.notEqual(history[0].session_id, returning[0].session_id);
    assert.ok(Date.parse(history[0].created_at) < Date.parse(P_SINCE));
    assert.ok(returning.every((event) => Date.parse(event.created_at) >= Date.parse(P_SINCE)));
    assert.ok(returning.every((event) => Date.parse(event.created_at) <= Date.parse(P_UNTIL)));
    assert.equal(returning.filter((event) => event.type === "pageview").length, 4);

    const durationSeconds = (Date.parse(returning.at(-1).created_at) - Date.parse(returning[0].created_at)) / 1000;
    assert.ok(durationSeconds >= 20 * 60 && durationSeconds <= 35 * 60);

    const sourceUser = sourceBatch().find((event) => event.visitor_id === visitorId && event.user_id)?.user_id;
    assert.ok(sourceUser);
    assert.ok(visitorEvents.every((event) => event.user_id === sourceUser));
  }
});

test("uses fixed timestamps and rejects a cutoff that would make them out of range", () => {
  const events = buildReturningEvents(sourceBatch(), buildOptions());
  assert.equal(events[0].created_at, RETURNING_HISTORY_START_AT);
  assert.equal(events[1].created_at, RETURNING_SESSION_START_AT);

  assert.throws(
    () => buildReturningEvents(sourceBatch(), { ...buildOptions(), pSince: "2026-06-15T02:00:00.000Z" }),
    /historical.*before.*pSince/i,
  );
  assert.throws(
    () => buildReturningEvents(sourceBatch(), { ...buildOptions(), pUntil: "2026-07-15T02:00:00.000Z" }),
    /return.*pUntil/i,
  );
});

test("validates the exact source shape and a single linked user per visitor", () => {
  const batch = sourceBatch();
  assert.throws(() => buildReturningEvents(batch.slice(1), buildOptions()), /1,056/i);

  const missingLink = batch.map((event) => event.visitor_id === "seed_v_000" ? { ...event, user_id: null } : event);
  assert.throws(() => buildReturningEvents(missingLink, buildOptions()), /linked user/i);

  const conflictingLink = batch.map((event, index) => index === 2
    ? { ...event, user_id: "00000000-0000-4000-8000-999999999999" }
    : event);
  assert.throws(() => buildReturningEvents(conflictingLink, buildOptions()), /linked user/i);
});

test("legacy payloads omit ownership columns but retain deterministic discovery labels", () => {
  const extended = buildReturningEvents(sourceBatch(), buildOptions(true));
  const legacy = buildReturningEvents([...sourceBatch()].reverse(), buildOptions(false));

  assert.deepEqual(legacy, extended.map(toLegacyReturningEvent));
  assert.ok(legacy.every((event) => !("is_synthetic" in event)));
  assert.ok(legacy.every((event) => !("seed_batch" in event)));
  assert.ok(legacy.every((event) => !("seed_event_key" in event)));
  assert.ok(legacy.every((event) => event.utm_campaign === RETURNING_CAMPAIGN));
  assert.equal(new Set(legacy.map(returningEventIdentity)).size, 490);
  assert.equal(
    returningEventIdentity(legacy[0]),
    returningEventIdentity({ ...legacy[0], created_at: legacy[0].created_at.replace(".000Z", "+00:00") }),
  );
});

test("payload compatibility ignores database ids, normalizes timestamps, and catches conflicts", () => {
  const [event] = buildReturningEvents(sourceBatch(), buildOptions(true));
  assert.equal(sameReturningPayload(event, { ...event, id: 123 }), true);
  assert.equal(sameReturningPayload(event, {
    ...event,
    id: 123,
    created_at: event.created_at.replace(".000Z", "+00:00"),
  }), true);
  assert.equal(sameReturningPayload(event, { ...event, path: "/tampered" }), false);
  assert.equal(sameReturningPayload(event, { ...event, seed_batch: "wrong-batch" }), false);

  const legacy = toLegacyReturningEvent(event);
  assert.equal(sameReturningPayload(legacy, { ...legacy, id: 123 }), true);
  assert.equal(sameReturningPayload(legacy, { ...legacy, user_id: null }), false);
});

function validAnalyticsSummary() {
  return {
    sessions: 430,
    visitors: 270,
    new_visitors: 200,
    returning_visitors: 70,
    pages_per_session: 4.7,
    avg_session_seconds: 1_205,
    bounce_rate: 0.2,
    avg_scroll_depth: 91,
    signup_conversion: 0.84,
    paid_conversion: 0.067,
    daily: [{ d: "2026-07-15", sessions: 70 }],
    top_sources: [{ source: "synthetic_seed", hits: 1_194 }],
  };
}

test("analytics validation requires at least 70 returning visitors and every scalar metric above zero", () => {
  const summary = validAnalyticsSummary();
  assert.equal(validateAnalyticsSummary(summary), summary);
  assert.throws(() => validateAnalyticsSummary({ ...summary, returning_visitors: 69 }), /returning.*70/i);

  for (const key of [
    "sessions",
    "visitors",
    "new_visitors",
    "pages_per_session",
    "avg_session_seconds",
    "bounce_rate",
    "avg_scroll_depth",
    "signup_conversion",
    "paid_conversion",
  ]) {
    assert.throws(() => validateAnalyticsSummary({ ...summary, [key]: 0 }), new RegExp(key, "i"));
  }

  assert.throws(() => validateAnalyticsSummary({ ...summary, daily: [] }), /daily/i);
  assert.throws(() => validateAnalyticsSummary({ ...summary, top_sources: [] }), /sources/i);
});

function commercialInput() {
  return {
    profiles: [
      ...Array.from({ length: 309 }, () => ({ tier: "free" })),
      ...Array.from({ length: 22 }, () => ({ tier: "vip" })),
      ...Array.from({ length: 11 }, () => ({ tier: "svip" })),
      ...Array.from({ length: 4 }, () => ({ tier: "family" })),
    ],
    tierLimits: [
      { tier: "free", price_vnd: 0 },
      { tier: "vip", price_vnd: 99_000 },
      { tier: "svip", price_vnd: 198_000 },
      { tier: "family", price_vnd: 499_000 },
    ],
  };
}

test("commercial validation returns exact counts, prices, subtotals, paid users, and revenue", () => {
  assert.deepEqual(validateCommercialSummary(commercialInput()), {
    tiers: {
      vip: { count: 22, priceVnd: 99_000, subtotalVnd: 2_178_000 },
      svip: { count: 11, priceVnd: 198_000, subtotalVnd: 2_178_000 },
      family: { count: 4, priceVnd: 499_000, subtotalVnd: 1_996_000 },
    },
    paidUsers: 37,
    totalRevenueVnd: 6_352_000,
  });
});

test("commercial validation rejects count, price, subtotal, and unsupported-tier drift", () => {
  const input = commercialInput();
  assert.throws(
    () => validateCommercialSummary({ ...input, profiles: input.profiles.slice(1) }),
    /profile count|346/i,
  );
  assert.throws(
    () => validateCommercialSummary({ ...input, profiles: input.profiles.filter((_, index) => index !== 309) }),
    /vip.*22/i,
  );
  assert.throws(
    () => validateCommercialSummary({
      ...input,
      tierLimits: input.tierLimits.map((row) => row.tier === "vip" ? { ...row, price_vnd: 100_000 } : row),
    }),
    /vip.*99,?000/i,
  );
  assert.throws(
    () => validateCommercialSummary({ ...input, profiles: [...input.profiles, { tier: "enterprise" }] }),
    /unsupported tier/i,
  );
});
