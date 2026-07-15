import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BATCH_ID,
  INPUT_SHA256,
  assignTiersAndDates,
  buildAnalyticsEvents,
  buildAuthCreateAttributes,
  buildIdentityPlan,
  parseSourceTsv,
  sameSeedEventPayload,
  sha256,
} from "./fpt-seed-core.mjs";
import {
  APPLY_CONFIRMATION,
  ROLLBACK_CONFIRMATION,
  assertExactDayCounts,
  assertEventCompatible,
  assertExistingEventCompatible,
  assertReportPathOutsideRoot,
  buildReportTsv,
  calculateNonBatchBaseline,
  isOwnedBatchUser,
  isMissingSeedSchemaError,
  legacyEventKey,
  parseArgs,
  randomPassword,
  toLegacyAnalyticsEvent,
} from "./import-fpt-users.mjs";

const row = (id, name) => `${id}\t${name}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fictionalSource() {
  const rows = [];
  let person = 0;
  const add = (prefix, cohort, count) => {
    for (let i = 0; i < count; i += 1) {
      rows.push(row(`${prefix}${cohort}${String(i).padStart(4, "0")}`, `Nguyễn Văn Người ${person++}`));
    }
  };
  add("AA", "13", 131);
  add("BB", "14", 5);
  add("CC", "15", 7);
  add("DD", "16", 7);
  add("EE", "17", 9);
  add("FF", "18", 10);
  add("GG", "19", 3);
  add("HH", "20", 3);
  for (let i = 0; i < 49; i += 1) rows.push(row(String(10000 + i), `Trần Thị Legacy ${person++}`));
  return rows.join("\n");
}

test("normalizes Vietnamese names into the required FPT email format", () => {
  const parsed = parseSourceTsv(row("HE180285", "Nguyễn Mạnh Quyền"));
  const plan = buildIdentityPlan(parsed, { requireCount: 1 });
  assert.equal(plan[0].email, "quyennmhe180285@fpt.edu.vn");
});

test("maps cohorts, reserves retained IDs, and probes collisions", () => {
  const parsed = parseSourceTsv([
    row("DS160001", "Nguyễn Văn Một"),
    row("DS180001", "Nguyễn Văn Hai"),
  ].join("\n"));
  const plan = buildIdentityPlan(parsed, { requireCount: 2 });
  assert.equal(plan.find((x) => x.sourceId === "DS180001").finalId, "DS180001");
  assert.equal(plan.find((x) => x.sourceId === "DS160001").finalId, "DS180002");
});

test("selects exactly 169 K13-K18 rows plus the first seven legacy rows", () => {
  const source = fictionalSource();
  const parsed = parseSourceTsv(source, { expectedSha256: sha256(source) });
  const plan = buildIdentityPlan(parsed);
  assert.equal(plan.length, 176);
  assert.equal(plan.filter((x) => x.finalId.slice(2, 4) === "17").length, 145);
  assert.equal(plan.filter((x) => x.finalId.slice(2, 4) === "18").length, 31);
  assert.equal(new Set(plan.map((x) => x.finalId)).size, 176);
  assert.equal(new Set(plan.map((x) => x.email)).size, 176);
  assert.equal(plan.filter((x) => /^\d{5}$/.test(x.sourceId)).length, 7);
});

test("rejects a mismatched pinned checksum", () => {
  assert.throws(() => parseSourceTsv("AA130001\tTest User", { expectedSha256: "0".repeat(64) }), /checksum/i);
  assert.equal(INPUT_SHA256.length, 64);
});

test("assigns exact tiers, dates, and unique manifest keys deterministically", () => {
  const plan = buildIdentityPlan(parseSourceTsv(fictionalSource()));
  const assigned = assignTiersAndDates(plan);
  const tiers = Object.groupBy(assigned, (x) => x.tier);
  assert.equal(tiers.free.length, 155);
  assert.equal(tiers.vip.length, 14);
  assert.equal(tiers.svip.length, 5);
  assert.equal(tiers.family.length, 2);

  const days = Object.groupBy(assigned, (x) => x.profileCreatedAt.slice(0, 10));
  assert.equal(days["2026-07-02"].length, 109);
  assert.equal(days["2026-07-03"].length, 6);
  assert.equal(days["2026-07-04"].length, 6);
  for (let day = 5; day <= 15; day += 1) {
    assert.equal(days[`2026-07-${String(day).padStart(2, "0")}`].length, 5);
  }
  assert.equal(new Set(assigned.map((x) => x.manifestKey)).size, 176);
  assert.deepEqual(assigned, assignTiersAndDates(plan));
});

test("builds unconfirmed no-invite auth attributes", () => {
  const assigned = assignTiersAndDates(buildIdentityPlan(parseSourceTsv(fictionalSource())))[0];
  const attrs = buildAuthCreateAttributes(assigned, "a-secure-random-password");
  assert.equal(attrs.email_confirm, false);
  assert.equal(attrs.app_metadata.seed_batch, BATCH_ID);
  assert.equal(attrs.app_metadata.synthetic, true);
  assert.equal(attrs.app_metadata.manifest_key, assigned.manifestKey);
  assert.equal(attrs.user_metadata.student_code, assigned.finalId);
  assert.equal(attrs.password, "a-secure-random-password");
});

test("builds six labeled events, four pageviews, hashed IDs, and a 20-35 minute session", () => {
  const assigned = assignTiersAndDates(buildIdentityPlan(parseSourceTsv(fictionalSource())))[0];
  const events = buildAnalyticsEvents(assigned, "00000000-0000-4000-8000-000000000001");
  assert.equal(events.length, 6);
  assert.equal(events.filter((x) => x.type === "pageview").length, 4);
  assert.equal(new Set(events.map((x) => x.seed_event_key)).size, 6);
  assert.ok(events.every((x) => x.is_synthetic === true));
  assert.ok(events.every((x) => x.seed_batch === BATCH_ID));
  assert.ok(events.every((x) => x.utm_source === "synthetic_seed"));
  assert.ok(events.every((x) => x.utm_medium === "demo"));
  assert.ok(events.every((x) => x.utm_campaign === BATCH_ID));
  assert.ok(events.every((x) => !x.visitor_id.includes("@") && !x.visitor_id.includes(assigned.finalId)));
  assert.ok(events.every((x) => !x.session_id.includes("@") && !x.session_id.includes(assigned.finalId)));
  const duration = (Date.parse(events.at(-1).created_at) - Date.parse(events[0].created_at)) / 1000;
  assert.ok(duration >= 1200 && duration <= 2100);

  assert.equal(sameSeedEventPayload(events[0], { ...events[0], id: 123 }), true);
  assert.equal(sameSeedEventPayload(events[0], { ...events[0], path: "/tampered" }), false);
});

test("legacy analytics fallback remains labeled and deterministically resumable", () => {
  const assigned = assignTiersAndDates(buildIdentityPlan(parseSourceTsv(fictionalSource())))[0];
  const full = buildAnalyticsEvents(assigned, "00000000-0000-4000-8000-000000000001")[0];
  const legacy = toLegacyAnalyticsEvent(full);
  assert.equal(legacy.is_synthetic, undefined);
  assert.equal(legacy.seed_batch, undefined);
  assert.equal(legacy.seed_event_key, undefined);
  assert.equal(legacy.utm_source, "synthetic_seed");
  assert.equal(legacy.utm_campaign, BATCH_ID);
  assert.equal(legacyEventKey(legacy), legacyEventKey({
    ...legacy,
    created_at: legacy.created_at.replace(".000Z", "+00:00"),
  }));
});

test("extended mode recognizes exact legacy rows for safe adoption", () => {
  const assigned = assignTiersAndDates(buildIdentityPlan(parseSourceTsv(fictionalSource())))[0];
  const expected = buildAnalyticsEvents(assigned, "00000000-0000-4000-8000-000000000001")[0];
  const migratedLegacy = {
    ...toLegacyAnalyticsEvent(expected),
    id: 123,
    is_synthetic: false,
    seed_batch: null,
    seed_event_key: null,
  };
  assert.equal(assertExistingEventCompatible(expected, migratedLegacy, true), "legacy");
  assert.equal(assertExistingEventCompatible(expected, { ...expected, id: 123 }, true), "owned");
  assert.throws(
    () => assertExistingEventCompatible(expected, { ...migratedLegacy, path: "/tampered" }, true),
    /conflict/i,
  );
  assert.throws(
    () => assertExistingEventCompatible(expected, { ...migratedLegacy, seed_batch: BATCH_ID }, true),
    /conflict/i,
  );
});

test("price migration contains the three approved prices", () => {
  const migration = path.join(root, "supabase", "migrations", "0021_update_tier_prices.sql");
  assert.equal(existsSync(migration), true, "price migration must exist");
  const sql = readFileSync(migration, "utf8");
  assert.match(sql, /price_vnd\s*=\s*99000\s+where\s+tier\s*=\s*'vip'/i);
  assert.match(sql, /price_vnd\s*=\s*198000\s+where\s+tier\s*=\s*'svip'/i);
  assert.match(sql, /price_vnd\s*=\s*499000\s+where\s+tier\s*=\s*'family'/i);
});

test("analytics migration adds synthetic ownership and a unique event key", () => {
  const migration = path.join(root, "supabase", "migrations", "0022_seed_analytics_support.sql");
  assert.equal(existsSync(migration), true, "analytics seed migration must exist");
  const sql = readFileSync(migration, "utf8");
  assert.match(sql, /add column if not exists is_synthetic boolean not null default false/i);
  assert.match(sql, /add column if not exists seed_batch text/i);
  assert.match(sql, /add column if not exists seed_event_key text/i);
  assert.match(sql, /unique index[\s\S]*seed_event_key/i);
  assert.match(sql, /check[\s\S]*is_synthetic[\s\S]*seed_batch is not null[\s\S]*seed_event_key is not null/i);
});

test("CLI defaults to preview and gates production mutations with exact tokens", () => {
  assert.deepEqual(parseArgs(["--input", "source.tsv"]), {
    mode: "preview",
    input: "source.tsv",
    report: null,
    confirm: null,
  });
  assert.throws(() => parseArgs(["--input", "source.tsv", "--apply"]), /confirmation/i);
  assert.equal(parseArgs(["--input", "source.tsv", "--apply", "--confirm", APPLY_CONFIRMATION]).mode, "apply");
  assert.throws(() => parseArgs(["--input", "source.tsv", "--rollback"]), /confirmation/i);
  assert.equal(parseArgs(["--input", "source.tsv", "--rollback", "--confirm", ROLLBACK_CONFIRMATION]).mode, "rollback");
  assert.equal(parseArgs(["--input", "source.tsv", "--rollback-preview"]).mode, "rollback-preview");
  assert.equal(parseArgs(["--input", "source.tsv", "--verify"]).mode, "verify");
});

test("report paths must stay outside the worktree", () => {
  assert.throws(() => assertReportPathOutsideRoot("D:\\MealMateAI\\report.tsv", "D:\\MealMateAI"), /outside/i);
  assert.doesNotThrow(() => assertReportPathOutsideRoot("C:\\Users\\test\\.codex\\reports\\report.tsv", "D:\\MealMateAI"));
});

test("partial-run baseline excludes only verified owned batch users", () => {
  const users = [
    { id: "base", app_metadata: {} },
    { id: "owned", app_metadata: { seed_batch: BATCH_ID, manifest_key: "manifest-a", synthetic: true } },
    { id: "foreign", app_metadata: { seed_batch: BATCH_ID, manifest_key: "wrong" } },
  ];
  const manifestByEmail = new Map([["owned@example.test", "manifest-a"]]);
  assert.equal(isOwnedBatchUser(users[1], "owned@example.test", manifestByEmail), true);
  assert.equal(isOwnedBatchUser(users[2], "foreign@example.test", manifestByEmail), false);
  const baseline = calculateNonBatchBaseline(
    [
      { id: "base", tier: "free", created_at: "2026-07-02T01:00:00Z" },
      { id: "owned", tier: "vip", created_at: "2026-07-02T02:00:00Z" },
    ],
    new Set(["owned"]),
  );
  assert.deepEqual(baseline, { total: 1, july2: 1, tiers: { free: 1 } });
});

test("existing seed events must have an identical immutable payload", () => {
  const assigned = assignTiersAndDates(buildIdentityPlan(parseSourceTsv(fictionalSource())))[0];
  const event = buildAnalyticsEvents(assigned, "00000000-0000-4000-8000-000000000001")[0];
  assert.doesNotThrow(() => assertEventCompatible(event, { ...event, id: 1 }));
  assert.doesNotThrow(() => assertEventCompatible(event, {
    ...event,
    created_at: event.created_at.replace(".000Z", "+00:00"),
  }));
  assert.throws(() => assertEventCompatible(event, { ...event, path: "/conflict" }), /conflict/i);
});

test("report has required columns and never contains passwords", () => {
  const assigned = assignTiersAndDates(buildIdentityPlan(parseSourceTsv(fictionalSource())))[0];
  const report = buildReportTsv([{ ...assigned, authUserId: "user-id" }]);
  assert.match(report, /^FullName\tEmail\tSourceStudentId\tFinalStudentId\tTier\tProfileCreatedAt\tAuthUserId\tSeedBatch\n/);
  assert.doesNotMatch(report, /password/i);
  assert.equal(randomPassword().length >= 40, true);
});

test("day-count verification is independent of object insertion order", () => {
  const expected = { "2026-07-02": 109, "2026-07-03": 6, "2026-07-04": 6 };
  const reversed = { "2026-07-04": 6, "2026-07-03": 6, "2026-07-02": 109 };
  assert.doesNotThrow(() => assertExactDayCounts(reversed, expected));
  assert.throws(() => assertExactDayCounts({ ...reversed, "2026-07-02": 108 }, expected), /distribution/i);
});

test("only a confirmed missing-column error is treated as absent seed schema", () => {
  assert.equal(isMissingSeedSchemaError({ code: "42703", message: "column does not exist" }), true);
  assert.equal(isMissingSeedSchemaError({ code: "PGRST204", message: "not found in schema cache" }), true);
  assert.equal(isMissingSeedSchemaError({ code: "500", message: "temporary server error" }), false);
});

test("rollback does not depend on the mutable 170-user production baseline", () => {
  const importer = readFileSync(path.join(root, "scripts", "import-fpt-users.mjs"), "utf8");
  const rollbackBody = importer.match(/async function rollbackBatch[\s\S]*?\n}\n\nfunction loadAssigned/)?.[0] ?? "";
  assert.doesNotMatch(rollbackBody, /await preflight\(/);
});
