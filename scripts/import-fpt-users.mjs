import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  BATCH_ID,
  INPUT_SHA256,
  TARGETS,
  assignTiersAndDates,
  buildAnalyticsEvents,
  buildAuthCreateAttributes,
  buildIdentityPlan,
  parseSourceTsv,
  sameSeedEventPayload,
  sha256,
} from "./fpt-seed-core.mjs";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const PAGE_SIZE = 1000;
const BASELINE = Object.freeze({ auth: 170, profiles: 170, july2: 29, free: 154, vip: 8, svip: 6, family: 2 });
const PRICE_TARGETS = Object.freeze({ vip: 99000, svip: 198000, family: 499000 });

export const APPLY_CONFIRMATION = `APPLY ${BATCH_ID} TO PRODUCTION`;
export const ROLLBACK_CONFIRMATION = `ROLLBACK ${BATCH_ID} FROM PRODUCTION`;

function argValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

export function parseArgs(argv) {
  const known = new Set(["--input", "--report", "--confirm", "--apply", "--verify", "--rollback-preview", "--rollback"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!known.has(token)) throw new Error(`Unknown argument: ${token}`);
    if (["--input", "--report", "--confirm"].includes(token)) index += 1;
  }

  const input = argValue(argv, "--input");
  if (!input) throw new Error("Missing --input");
  const report = argValue(argv, "--report");
  const confirm = argValue(argv, "--confirm");
  const modes = [
    ["--apply", "apply"],
    ["--verify", "verify"],
    ["--rollback-preview", "rollback-preview"],
    ["--rollback", "rollback"],
  ].filter(([flag]) => argv.includes(flag));
  if (modes.length > 1) throw new Error("Choose exactly one operation mode");
  const mode = modes[0]?.[1] ?? "preview";
  if (mode === "apply" && confirm !== APPLY_CONFIRMATION) throw new Error("Apply confirmation token does not match");
  if (mode === "rollback" && confirm !== ROLLBACK_CONFIRMATION) throw new Error("Rollback confirmation token does not match");
  return { mode, input, report, confirm };
}

export function assertReportPathOutsideRoot(reportPath, rootPath = ROOT) {
  const report = path.resolve(reportPath);
  const root = path.resolve(rootPath);
  const relative = path.relative(root.toLowerCase(), report.toLowerCase());
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("Report path must be outside the Git worktree");
  }
  return report;
}

export function randomPassword() {
  return randomBytes(32).toString("base64url");
}

export function isOwnedBatchUser(user, email, manifestByEmail) {
  const expectedManifest = manifestByEmail.get(String(email ?? user.email ?? "").toLowerCase());
  return Boolean(
    expectedManifest
      && user.app_metadata?.seed_batch === BATCH_ID
      && user.app_metadata?.synthetic === true
      && user.app_metadata?.manifest_key === expectedManifest,
  );
}

function vnDay(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

export function calculateNonBatchBaseline(profiles, ownedIds) {
  const base = profiles.filter((profile) => !ownedIds.has(profile.id));
  const tiers = {};
  for (const profile of base) tiers[profile.tier] = (tiers[profile.tier] ?? 0) + 1;
  return {
    total: base.length,
    july2: base.filter((profile) => vnDay(profile.created_at) === "2026-07-02").length,
    tiers,
  };
}

export function assertEventCompatible(expected, actual) {
  if (!sameSeedEventPayload(expected, actual)) throw new Error(`Seed event payload conflict: ${expected.seed_event_key}`);
}

export function toLegacyAnalyticsEvent(event) {
  return Object.fromEntries(Object.entries(event).filter(([key]) => (
    key !== "is_synthetic" && key !== "seed_batch" && key !== "seed_event_key"
  )));
}

export function legacyEventKey(event) {
  const createdAt = Date.parse(event.created_at);
  if (!Number.isFinite(createdAt)) throw new Error("Legacy analytics event has an invalid timestamp");
  return sha256(JSON.stringify([event.session_id, event.type, event.path, createdAt]));
}

export function assertExistingEventCompatible(expected, actual, seedSchema) {
  if (seedSchema && actual.is_synthetic === false && actual.seed_batch == null && actual.seed_event_key == null) {
    assertEventCompatible(toLegacyAnalyticsEvent(expected), toLegacyAnalyticsEvent(actual));
    return "legacy";
  }
  assertEventCompatible(expected, actual);
  return seedSchema ? "owned" : "legacy";
}

function analyticsEventKey(event) {
  return legacyEventKey(event);
}

function desiredAnalyticsEvents(completed, seedSchema) {
  const events = completed.flatMap((item) => buildAnalyticsEvents(item, item.authUserId));
  return seedSchema ? events : events.map(toLegacyAnalyticsEvent);
}

function cleanTsv(value) {
  return String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

export function buildReportTsv(rows) {
  const header = "FullName\tEmail\tSourceStudentId\tFinalStudentId\tTier\tProfileCreatedAt\tAuthUserId\tSeedBatch";
  const body = rows.map((row) => [
    row.fullName,
    row.email,
    row.sourceId,
    row.finalId,
    row.tier,
    row.profileCreatedAt,
    row.authUserId,
    BATCH_ID,
  ].map(cleanTsv).join("\t"));
  return `${header}\n${body.join("\n")}\n`;
}

function loadEnv(rootPath) {
  const result = {};
  for (const file of [".env.local", ".env", ".env.development.local", ".env.production.local"]) {
    const fullPath = path.join(rootPath, file);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(match[1] in result)) result[match[1]] = value;
    }
  }
  return result;
}

function adminClient() {
  const env = { ...loadEnv(ROOT), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase URL/service-role key is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listAllAuthUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
  }
  return users;
}

async function fetchPaged(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchProfiles(admin) {
  return fetchPaged((from, to) => admin.from("profiles").select("id,email,tier,created_at,display_name").order("id").range(from, to));
}

async function fetchBatchEvents(admin, seedSchema) {
  const baseColumns = "id,visitor_id,session_id,user_id,type,path,referrer,utm_source,utm_medium,utm_campaign,scroll_depth,created_at";
  const columns = seedSchema ? `${baseColumns},is_synthetic,seed_batch,seed_event_key` : baseColumns;
  const byLabel = await fetchPaged((from, to) => {
    let query = admin.from("analytics_events").select(columns);
    query = query.eq("utm_source", "synthetic_seed").eq("utm_campaign", BATCH_ID);
    return query.order("id").range(from, to);
  });
  if (!seedSchema) return byLabel;

  const byOwnership = await fetchPaged((from, to) => admin
    .from("analytics_events")
    .select(columns)
    .eq("seed_batch", BATCH_ID)
    .order("id")
    .range(from, to));
  return [...new Map([...byLabel, ...byOwnership].map((event) => [event.id, event])).values()];
}

export function isMissingSeedSchemaError(error) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

async function hasSeedSchema(admin) {
  const { error } = await admin.from("analytics_events").select("is_synthetic,seed_batch,seed_event_key").limit(1);
  if (!error) return true;
  if (isMissingSeedSchemaError(error)) return false;
  throw new Error(`Seed schema check failed: ${error.message}`);
}

function assertBaseline(nonBatchAuthCount, baseline) {
  if (nonBatchAuthCount !== BASELINE.auth) throw new Error(`Non-batch auth baseline drift: expected ${BASELINE.auth}, got ${nonBatchAuthCount}`);
  if (baseline.total !== BASELINE.profiles) throw new Error(`Non-batch profile baseline drift: expected ${BASELINE.profiles}, got ${baseline.total}`);
  if (baseline.july2 !== BASELINE.july2) throw new Error(`Non-batch July-2 baseline drift: expected ${BASELINE.july2}, got ${baseline.july2}`);
  for (const tier of ["free", "vip", "svip", "family"]) {
    if ((baseline.tiers[tier] ?? 0) !== BASELINE[tier]) {
      throw new Error(`Non-batch ${tier} baseline drift: expected ${BASELINE[tier]}, got ${baseline.tiers[tier] ?? 0}`);
    }
  }
}

async function paymentCount(admin) {
  const { count, error } = await admin.from("payments").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Payment count failed: ${error.message}`);
  return count ?? 0;
}

async function ownershipContext(admin, assigned) {
  const manifestByEmail = new Map(assigned.map((item) => [item.email.toLowerCase(), item.manifestKey]));
  const [authUsers, profiles, seedSchema] = await Promise.all([
    listAllAuthUsers(admin),
    fetchProfiles(admin),
    hasSeedSchema(admin),
  ]);
  const authByEmail = new Map(authUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
  const profileByEmail = new Map(profiles.map((profile) => [profile.email.toLowerCase(), profile]));
  const conflicts = [];
  const ownedUsers = [];

  for (const item of assigned) {
    const authUser = authByEmail.get(item.email.toLowerCase());
    if (authUser) {
      if (isOwnedBatchUser(authUser, item.email, manifestByEmail)) ownedUsers.push(authUser);
      else conflicts.push(`auth:${sha256(item.email).slice(0, 12)}`);
    }
    const profile = profileByEmail.get(item.email.toLowerCase());
    if (profile && profile.id !== authUser?.id) conflicts.push(`profile:${sha256(item.email).slice(0, 12)}`);
  }
  for (const user of authUsers) {
    if (user.app_metadata?.seed_batch === BATCH_ID && !isOwnedBatchUser(user, user.email, manifestByEmail)) {
      conflicts.push(`rogue-batch:${user.id}`);
    }
  }
  if (conflicts.length) throw new Error(`Preflight found ${conflicts.length} ownership/email conflicts`);

  const ownedIds = new Set(ownedUsers.map((user) => user.id));
  return { authUsers, profiles, ownedUsers, ownedIds, manifestByEmail, seedSchema };
}

async function preflight(admin, assigned) {
  const [context, paymentsBefore] = await Promise.all([
    ownershipContext(admin, assigned),
    paymentCount(admin),
  ]);
  const { authUsers, profiles, ownedUsers, ownedIds } = context;
  const baseline = calculateNonBatchBaseline(profiles, ownedIds);
  assertBaseline(authUsers.length - ownedUsers.length, baseline);
  return { ...context, paymentsBefore, baseline };
}

function aggregatePlan(assigned, context) {
  const tiers = {};
  const days = {};
  for (const item of assigned) {
    tiers[item.tier] = (tiers[item.tier] ?? 0) + 1;
    const day = item.profileCreatedAt.slice(0, 10);
    days[day] = (days[day] ?? 0) + 1;
  }
  return {
    batch: BATCH_ID,
    planned: assigned.length,
    existingOwned: context.ownedUsers.length,
    nonBatchAuth: context.authUsers.length - context.ownedUsers.length,
    nonBatchProfiles: context.baseline.total,
    nonBatchJuly2: context.baseline.july2,
    seedSchema: context.seedSchema,
    tiers,
    days,
  };
}

async function fetchPrices(admin) {
  const { data, error } = await admin.from("tier_limits").select("tier,price_vnd");
  if (error) throw new Error(`Price read failed: ${error.message}`);
  return Object.fromEntries((data ?? []).map((row) => [row.tier, row.price_vnd]));
}

async function updatePrices(admin) {
  for (const [tier, price_vnd] of Object.entries(PRICE_TARGETS)) {
    const { error } = await admin.from("tier_limits").update({ price_vnd }).eq("tier", tier);
    if (error) throw new Error(`Price update failed for ${tier}: ${error.message}`);
  }
  const prices = await fetchPrices(admin);
  for (const [tier, expected] of Object.entries(PRICE_TARGETS)) {
    if (prices[tier] !== expected) throw new Error(`Price verification failed for ${tier}`);
  }
  return prices;
}

function retryable(message) {
  return /429|rate|timeout|temporar|50[0-9]/i.test(message);
}

async function createAuthUser(admin, item) {
  const attributes = buildAuthCreateAttributes(item, randomPassword());
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await admin.auth.admin.createUser(attributes);
    if (!error && data.user) return data.user;
    if (!error) throw new Error("Auth create returned no user");
    if (attempt === 4 || !retryable(error.message)) throw new Error(`Auth create failed: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
  }
  throw new Error("Auth create retry exhausted");
}

async function createOrResumeUsers(admin, assigned, context) {
  const authByEmail = new Map(context.authUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
  const completed = [];
  let createdCount = 0;

  for (const [index, item] of assigned.entries()) {
    let user = authByEmail.get(item.email.toLowerCase());
    let createdNow = false;
    if (!user) {
      user = await createAuthUser(admin, item);
      authByEmail.set(item.email.toLowerCase(), user);
      createdNow = true;
      createdCount += 1;
    } else if (!isOwnedBatchUser(user, item.email, context.manifestByEmail)) {
      throw new Error(`Ownership changed during apply at ordinal ${index + 1}`);
    }

    const { data, error } = await admin
      .from("profiles")
      .update({ display_name: item.fullName, tier: item.tier, created_at: item.profileCreatedAt })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      if (createdNow) await admin.auth.admin.deleteUser(user.id);
      throw new Error(`Profile update failed at ordinal ${index + 1}: ${error?.message ?? "profile missing"}`);
    }
    completed.push({ ...item, authUserId: user.id });
    if ((index + 1) % 20 === 0 || index + 1 === assigned.length) {
      console.log(`Accounts completed: ${index + 1}/${assigned.length}`);
    }
  }
  return { rows: completed, createdCount };
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function insertAnalytics(admin, completed, seedSchema) {
  const desired = desiredAnalyticsEvents(completed, seedSchema);
  const desiredByKey = new Map(desired.map((event) => [analyticsEventKey(event), event]));
  if (desiredByKey.size !== desired.length) throw new Error("Desired analytics event identity collision");
  let existing = await fetchBatchEvents(admin, seedSchema);
  const existingKeys = new Set();
  for (const event of existing) {
    const key = analyticsEventKey(event);
    if (existingKeys.has(key)) throw new Error(`Duplicate existing event in seed batch: ${key}`);
    existingKeys.add(key);
    const expected = desiredByKey.get(key);
    if (!expected) throw new Error(`Unowned event found in seed batch: ${key}`);
    assertExistingEventCompatible(expected, event, seedSchema);
  }

  let adopted = 0;
  if (seedSchema) {
    for (const event of existing) {
      const expected = desiredByKey.get(analyticsEventKey(event));
      if (assertExistingEventCompatible(expected, event, true) !== "legacy") continue;
      const { data, error } = await admin
        .from("analytics_events")
        .update({
          is_synthetic: true,
          seed_batch: BATCH_ID,
          seed_event_key: expected.seed_event_key,
        })
        .eq("id", event.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(`Legacy analytics adoption failed: ${error?.message ?? "event missing"}`);
      adopted += 1;
    }
    if (adopted > 0) existing = await fetchBatchEvents(admin, true);
    for (const event of existing) {
      const expected = desiredByKey.get(analyticsEventKey(event));
      if (!expected) throw new Error(`Unowned event found after adoption: ${analyticsEventKey(event)}`);
      assertEventCompatible(expected, event);
    }
  }

  const presentKeys = new Set(existing.map((event) => analyticsEventKey(event)));
  const missing = desired.filter((event) => !presentKeys.has(analyticsEventKey(event)));
  for (const group of chunks(missing, 100)) {
    const { error } = await admin.from("analytics_events").insert(group);
    if (error) throw new Error(`Analytics insert failed: ${error.message}`);
  }
  return { desired: desired.length, existing: existing.length, adopted, inserted: missing.length };
}

function countBy(rows, keyFn) {
  const result = {};
  for (const row of rows) {
    const key = keyFn(row);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export function assertExactDayCounts(actual, expected) {
  const days = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  for (const day of days) {
    if ((actual[day] ?? 0) !== (expected[day] ?? 0)) {
      throw new Error("Batch date distribution mismatch");
    }
  }
}

async function verifyLive(admin, assigned, seedSchema, expectedPaymentCount = null) {
  const manifestByEmail = new Map(assigned.map((item) => [item.email.toLowerCase(), item.manifestKey]));
  const [authUsers, profiles, events, prices, payments] = await Promise.all([
    listAllAuthUsers(admin),
    fetchProfiles(admin),
    fetchBatchEvents(admin, seedSchema),
    fetchPrices(admin),
    paymentCount(admin),
  ]);
  const planByEmail = new Map(assigned.map((item) => [item.email.toLowerCase(), item]));
  const ownedUsers = authUsers.filter((user) => user.email && isOwnedBatchUser(user, user.email, manifestByEmail));
  const rogueUsers = authUsers.filter((user) => user.app_metadata?.seed_batch === BATCH_ID && !ownedUsers.includes(user));
  if (rogueUsers.length) throw new Error(`Verification found ${rogueUsers.length} rogue batch users`);
  if (authUsers.length !== TARGETS.total) throw new Error(`Auth total expected ${TARGETS.total}, got ${authUsers.length}`);
  if (profiles.length !== TARGETS.total) throw new Error(`Profile total expected ${TARGETS.total}, got ${profiles.length}`);
  if (ownedUsers.length !== assigned.length) throw new Error(`Owned batch users expected ${assigned.length}, got ${ownedUsers.length}`);

  const globalTiers = countBy(profiles, (profile) => profile.tier);
  for (const tier of ["free", "vip", "svip", "family"]) {
    if ((globalTiers[tier] ?? 0) !== TARGETS[tier]) throw new Error(`Global ${tier} expected ${TARGETS[tier]}, got ${globalTiers[tier] ?? 0}`);
  }
  const july2 = profiles.filter((profile) => vnDay(profile.created_at) === "2026-07-02").length;
  if (july2 !== 138) throw new Error(`July-2 signup total expected 138, got ${july2}`);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const completed = [];
  for (const user of ownedUsers) {
    const item = planByEmail.get(user.email.toLowerCase());
    const profile = profileById.get(user.id);
    if (!item || !profile) throw new Error(`Owned user/profile mapping missing: ${user.id}`);
    if (profile.tier !== item.tier) throw new Error(`Tier mismatch for owned user ${user.id}`);
    if (Date.parse(profile.created_at) !== Date.parse(item.profileCreatedAt)) throw new Error(`Timestamp mismatch for owned user ${user.id}`);
    completed.push({ ...item, authUserId: user.id });
  }

  const batchDays = countBy(completed, (item) => item.profileCreatedAt.slice(0, 10));
  const expectedDays = { "2026-07-02": 109, "2026-07-03": 6, "2026-07-04": 6 };
  for (let day = 5; day <= 15; day += 1) expectedDays[`2026-07-${String(day).padStart(2, "0")}`] = 5;
  assertExactDayCounts(batchDays, expectedDays);

  const desired = desiredAnalyticsEvents(completed, seedSchema);
  const desiredByKey = new Map(desired.map((event) => [analyticsEventKey(event), event]));
  if (desiredByKey.size !== desired.length) throw new Error("Desired analytics event identity collision");
  if (events.length !== desired.length) throw new Error(`Batch events expected ${desired.length}, got ${events.length}`);
  const verifiedKeys = new Set();
  for (const event of events) {
    const key = analyticsEventKey(event);
    if (verifiedKeys.has(key)) throw new Error(`Duplicate batch event: ${key}`);
    verifiedKeys.add(key);
    const expected = desiredByKey.get(key);
    if (!expected) throw new Error(`Unexpected batch event: ${key}`);
    assertExistingEventCompatible(expected, event, seedSchema);
  }

  const sessions = new Map();
  for (const event of events) {
    const session = sessions.get(event.session_id) ?? [];
    session.push(event);
    sessions.set(event.session_id, session);
  }
  if (sessions.size !== 176) throw new Error(`Batch sessions expected 176, got ${sessions.size}`);
  for (const [sessionId, sessionEvents] of sessions) {
    if (sessionEvents.length !== 6) throw new Error(`Session ${sessionId} does not have six events`);
    if (sessionEvents.filter((event) => event.type === "pageview").length !== 4) throw new Error(`Session ${sessionId} does not have four pageviews`);
    const times = sessionEvents.map((event) => Date.parse(event.created_at));
    const duration = (Math.max(...times) - Math.min(...times)) / 1000;
    if (duration < 1200 || duration > 2100) throw new Error(`Session ${sessionId} duration out of range`);
  }
  if (new Set(events.map((event) => event.visitor_id)).size !== 176) throw new Error("Batch visitor count mismatch");

  for (const [tier, expected] of Object.entries(PRICE_TARGETS)) {
    if (prices[tier] !== expected) throw new Error(`Price mismatch for ${tier}`);
  }
  if (expectedPaymentCount !== null && payments !== expectedPaymentCount) throw new Error("Payment history changed during seed");

  return {
    authUsers: authUsers.length,
    profiles: profiles.length,
    tiers: globalTiers,
    july2,
    batchUsers: ownedUsers.length,
    batchSessions: sessions.size,
    batchEvents: events.length,
    analyticsSchema: seedSchema ? "extended" : "legacy-labeled",
    payments,
    prices,
    reportRows: completed,
  };
}

function writeReport(reportPath, rows) {
  const target = assertReportPathOutsideRoot(reportPath);
  if (!fs.existsSync(path.dirname(target))) throw new Error("Report directory does not exist");
  fs.writeFileSync(target, buildReportTsv(rows), { flag: "wx", mode: 0o600 });
  return target;
}

async function rollbackBatch(admin, assigned, mutate) {
  const context = await ownershipContext(admin, assigned);
  const planByEmail = new Map(assigned.map((item) => [item.email.toLowerCase(), item]));
  const completed = context.ownedUsers.map((user) => ({ ...planByEmail.get(user.email.toLowerCase()), authUserId: user.id }));
  const desired = desiredAnalyticsEvents(completed, context.seedSchema);
  const desiredByKey = new Map(desired.map((event) => [analyticsEventKey(event), event]));
  if (desiredByKey.size !== desired.length) throw new Error("Desired analytics event identity collision");
  const events = await fetchBatchEvents(admin, context.seedSchema);
  const rollbackKeys = new Set();
  for (const event of events) {
    const key = analyticsEventKey(event);
    if (rollbackKeys.has(key)) throw new Error(`Duplicate rollback event: ${key}`);
    rollbackKeys.add(key);
    const expected = desiredByKey.get(key);
    if (!expected) throw new Error(`Rollback ownership failed for event ${key}`);
    assertExistingEventCompatible(expected, event, context.seedSchema);
  }
  const summary = { ownedUsers: context.ownedUsers.length, ownedEvents: events.length, mutate };
  if (!mutate) return summary;

  for (const group of chunks(events.map((event) => event.id), 100)) {
    const { error } = await admin.from("analytics_events").delete().in("id", group);
    if (error) throw new Error(`Rollback event delete failed: ${error.message}`);
  }
  if ((await fetchBatchEvents(admin, context.seedSchema)).length > 0) throw new Error("Rollback event deletion verification failed");
  for (const user of context.ownedUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Rollback auth delete failed: ${error.message}`);
  }
  return summary;
}

function loadAssigned(inputPath) {
  const raw = fs.readFileSync(inputPath);
  const checksum = sha256(raw);
  if (checksum !== INPUT_SHA256) throw new Error(`Input checksum mismatch: expected ${INPUT_SHA256}, got ${checksum}`);
  const text = raw.toString("utf8").replace(/^\uFEFF/, "");
  return assignTiersAndDates(buildIdentityPlan(parseSourceTsv(text)));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const assigned = loadAssigned(path.resolve(args.input));
  const admin = adminClient();
  if (args.mode === "rollback-preview" || args.mode === "rollback") {
    const result = await rollbackBatch(admin, assigned, args.mode === "rollback");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const context = await preflight(admin, assigned);
  if (args.mode === "preview") {
    console.log(JSON.stringify(aggregatePlan(assigned, context), null, 2));
    return;
  }
  if (args.mode === "verify") {
    const result = await verifyLive(admin, assigned, context.seedSchema);
    const summary = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "reportRows"));
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await updatePrices(admin);
  const completed = await createOrResumeUsers(admin, assigned, context);
  const analytics = await insertAnalytics(admin, completed.rows, context.seedSchema);
  const result = await verifyLive(admin, assigned, context.seedSchema, context.paymentsBefore);
  let reportPath = null;
  if (args.report) reportPath = writeReport(args.report, result.reportRows);
  const summary = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "reportRows"));
  console.log(JSON.stringify({ ...summary, createdNow: completed.createdCount, analytics, reportPath }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  main().catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}
