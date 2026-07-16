import { createHash } from "node:crypto";

export const RETURNING_BATCH_ID = "fpt-returning-202607-v1";
export const RETURNING_CAMPAIGN = RETURNING_BATCH_ID;
export const RETURNING_VISITOR_COUNT = 70;
export const RETURNING_HISTORY_START_AT = "2026-06-15T03:00:00.000Z";
export const RETURNING_SESSION_START_AT = "2026-07-15T03:00:00.000Z";

const SOURCE_EVENT_COUNT = 1_056;
const SOURCE_VISITOR_COUNT = 176;
const SOURCE_EVENTS_PER_VISITOR = 6;
const HISTORY_SPACING_MS = 60_000;
const RETURN_SPACING_MS = 5 * 60_000;

const BASE_PAYLOAD_KEYS = Object.freeze([
  "visitor_id",
  "session_id",
  "user_id",
  "type",
  "path",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "scroll_depth",
  "created_at",
]);

const OWNERSHIP_KEYS = Object.freeze([
  "is_synthetic",
  "seed_batch",
  "seed_event_key",
]);

const REQUIRED_ANALYTICS_SCALARS = Object.freeze([
  "sessions",
  "visitors",
  "new_visitors",
  "pages_per_session",
  "avg_session_seconds",
  "bounce_rate",
  "avg_scroll_depth",
  "signup_conversion",
  "paid_conversion",
]);

const COMMERCIAL_EXPECTATIONS = Object.freeze({
  vip: Object.freeze({ count: 22, priceVnd: 99_000, subtotalVnd: 2_178_000 }),
  svip: Object.freeze({ count: 11, priceVnd: 198_000, subtotalVnd: 2_178_000 }),
  family: Object.freeze({ count: 4, priceVnd: 499_000, subtotalVnd: 1_996_000 }),
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseTimestamp(value, label) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid timestamp`);
  return timestamp;
}

function normalizedTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : value ?? null;
}

function validateAndSelectVisitors(batchEvents) {
  if (!Array.isArray(batchEvents) || batchEvents.length !== SOURCE_EVENT_COUNT) {
    throw new Error(`Source batch must contain exactly 1,056 events`);
  }

  const byVisitor = new Map();
  for (const event of batchEvents) {
    if (!event || typeof event.visitor_id !== "string" || event.visitor_id.length === 0) {
      throw new Error("Every source event must have a visitor_id");
    }
    const visitorEvents = byVisitor.get(event.visitor_id) ?? [];
    visitorEvents.push(event);
    byVisitor.set(event.visitor_id, visitorEvents);
  }

  if (byVisitor.size !== SOURCE_VISITOR_COUNT) {
    throw new Error(`Source batch must contain exactly 176 visitors`);
  }

  const linkedUsers = new Set();
  const visitors = [];
  for (const visitorId of [...byVisitor.keys()].sort()) {
    const visitorEvents = byVisitor.get(visitorId);
    if (visitorEvents.length !== SOURCE_EVENTS_PER_VISITOR) {
      throw new Error(`Visitor ${visitorId} must have exactly six source events`);
    }
    const userIds = [...new Set(visitorEvents.map((event) => event.user_id).filter(Boolean))];
    if (userIds.length !== 1) {
      throw new Error(`Visitor ${visitorId} must have exactly one linked user`);
    }
    if (linkedUsers.has(userIds[0])) {
      throw new Error(`Linked user ${userIds[0]} belongs to more than one visitor`);
    }
    linkedUsers.add(userIds[0]);
    visitors.push({ visitorId, userId: userIds[0] });
  }

  return visitors.slice(0, RETURNING_VISITOR_COUNT);
}

function ownedEvent(event, eventIndex) {
  return {
    ...event,
    is_synthetic: true,
    seed_batch: RETURNING_BATCH_ID,
    seed_event_key: sha256(`${RETURNING_BATCH_ID}:${event.visitor_id}:${event.session_id}:${eventIndex}`),
  };
}

function buildVisitorEvents({ visitorId, userId }, visitorIndex) {
  const fingerprint = sha256(`${RETURNING_BATCH_ID}:${visitorId}`);
  const historySessionId = `return_h_${fingerprint.slice(0, 24)}`;
  const returnSessionId = `return_s_${fingerprint.slice(24, 48)}`;
  const historyAt = Date.parse(RETURNING_HISTORY_START_AT) + visitorIndex * HISTORY_SPACING_MS;
  const returnAt = Date.parse(RETURNING_SESSION_START_AT) + visitorIndex * RETURN_SPACING_MS;
  const durationSeconds = (20 + (Number.parseInt(fingerprint.slice(0, 2), 16) % 16)) * 60;
  const offsets = [0, 120, 240, 480, 720, durationSeconds];
  const shapes = [
    ["pageview", "/", null],
    ["pageview", "/home", null],
    ["click", "/home", null],
    ["pageview", "/scan", null],
    ["pageview", "/kitchen", null],
    ["scroll", "/kitchen", 88 + (visitorIndex % 10)],
  ];

  const history = ownedEvent({
    visitor_id: visitorId,
    session_id: historySessionId,
    user_id: userId,
    type: "pageview",
    path: "/",
    referrer: null,
    utm_source: "synthetic_seed",
    utm_medium: "demo",
    utm_campaign: RETURNING_CAMPAIGN,
    scroll_depth: null,
    created_at: new Date(historyAt).toISOString(),
  }, 0);

  const returning = shapes.map(([type, path, scrollDepth], index) => ownedEvent({
    visitor_id: visitorId,
    session_id: returnSessionId,
    user_id: userId,
    type,
    path,
    referrer: index === 0 ? null : "",
    utm_source: "synthetic_seed",
    utm_medium: "demo",
    utm_campaign: RETURNING_CAMPAIGN,
    scroll_depth: scrollDepth,
    created_at: new Date(returnAt + offsets[index] * 1_000).toISOString(),
  }, index + 1));

  return [history, ...returning];
}

export function buildReturningEvents(batchEvents, { pSince, pUntil, extendedSchema = true } = {}) {
  const since = parseTimestamp(pSince, "pSince");
  const until = parseTimestamp(pUntil, "pUntil");
  if (since >= until) throw new Error("pSince must be before pUntil");

  const visitors = validateAndSelectVisitors(batchEvents);
  const events = visitors.flatMap(buildVisitorEvents);

  for (let visitorIndex = 0; visitorIndex < visitors.length; visitorIndex += 1) {
    const start = visitorIndex * 7;
    const history = events[start];
    const returning = events.slice(start + 1, start + 7);
    if (Date.parse(history.created_at) >= since) {
      throw new Error("Every historical marker must be before pSince");
    }
    if (returning.some((event) => Date.parse(event.created_at) < since)) {
      throw new Error("Every return event must be on or after pSince");
    }
    if (returning.some((event) => Date.parse(event.created_at) > until)) {
      throw new Error("Every return event must be on or before pUntil and never future-dated");
    }
  }

  return extendedSchema ? events : events.map(toLegacyReturningEvent);
}

export function toLegacyReturningEvent(event) {
  return Object.fromEntries(Object.entries(event).filter(([key]) => !OWNERSHIP_KEYS.includes(key)));
}

export function returningEventIdentity(event) {
  if (event?.seed_event_key) return `seed:${event.seed_event_key}`;
  return `legacy:${sha256(JSON.stringify([
    event?.visitor_id ?? null,
    event?.session_id ?? null,
    event?.type ?? null,
    normalizedTimestamp(event?.created_at),
  ]))}`;
}

export function sameReturningPayload(expected, actual) {
  if (!expected || !actual) return false;
  const keys = expected.seed_event_key === undefined
    ? BASE_PAYLOAD_KEYS
    : [...BASE_PAYLOAD_KEYS, ...OWNERSHIP_KEYS];

  return keys.every((key) => {
    const expectedValue = expected[key] ?? null;
    const actualValue = actual[key] ?? null;
    if (key !== "created_at") return expectedValue === actualValue;
    return normalizedTimestamp(expectedValue) === normalizedTimestamp(actualValue);
  });
}

export function validateAnalyticsSummary(summary) {
  if (!summary || typeof summary !== "object") throw new Error("Analytics summary is required");
  if (!Number.isFinite(summary.returning_visitors) || summary.returning_visitors < RETURNING_VISITOR_COUNT) {
    throw new Error(`returning_visitors must be at least ${RETURNING_VISITOR_COUNT}`);
  }
  for (const key of REQUIRED_ANALYTICS_SCALARS) {
    if (!Number.isFinite(summary[key]) || summary[key] <= 0) {
      throw new Error(`${key} must be greater than zero`);
    }
  }
  if (!Array.isArray(summary.daily) || summary.daily.length === 0) {
    throw new Error("daily analytics rows must be non-empty");
  }
  if (!Array.isArray(summary.top_sources) || summary.top_sources.length === 0) {
    throw new Error("top_sources must be non-empty");
  }
  return summary;
}

export function validateCommercialSummary({ profiles, tierLimits } = {}) {
  if (!Array.isArray(profiles)) throw new Error("profiles must be an array");
  if (!Array.isArray(tierLimits)) throw new Error("tierLimits must be an array");

  const allowedTiers = new Set(["free", ...Object.keys(COMMERCIAL_EXPECTATIONS)]);
  const counts = { free: 0, vip: 0, svip: 0, family: 0 };
  for (const profile of profiles) {
    if (!allowedTiers.has(profile?.tier)) throw new Error(`Unsupported tier: ${profile?.tier}`);
    counts[profile.tier] += 1;
  }

  for (const [tier, expected] of Object.entries(COMMERCIAL_EXPECTATIONS)) {
    if (counts[tier] !== expected.count) {
      throw new Error(`${tier} count must be exactly ${expected.count}`);
    }
  }
  if (profiles.length !== 346) throw new Error("Profile count must be exactly 346");

  const limitsByTier = new Map();
  for (const row of tierLimits) {
    if (limitsByTier.has(row?.tier)) throw new Error(`Duplicate tier limit: ${row?.tier}`);
    limitsByTier.set(row?.tier, row);
  }

  const tiers = {};
  for (const [tier, expected] of Object.entries(COMMERCIAL_EXPECTATIONS)) {
    const priceVnd = Number(limitsByTier.get(tier)?.price_vnd);
    if (priceVnd !== expected.priceVnd) {
      throw new Error(`${tier} price must be exactly ${expected.priceVnd.toLocaleString("en-US")}`);
    }
    const subtotalVnd = counts[tier] * priceVnd;
    if (subtotalVnd !== expected.subtotalVnd) {
      throw new Error(`${tier} subtotal must be exactly ${expected.subtotalVnd.toLocaleString("en-US")}`);
    }
    tiers[tier] = { count: counts[tier], priceVnd, subtotalVnd };
  }

  const paidUsers = Object.values(tiers).reduce((sum, tier) => sum + tier.count, 0);
  const totalRevenueVnd = Object.values(tiers).reduce((sum, tier) => sum + tier.subtotalVnd, 0);
  if (paidUsers !== 37 || totalRevenueVnd !== 6_352_000) {
    throw new Error("Commercial totals must be exactly 37 paid users and 6,352,000 VND");
  }
  return { tiers, paidUsers, totalRevenueVnd };
}
