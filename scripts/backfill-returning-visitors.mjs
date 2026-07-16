import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  RETURNING_BATCH_ID,
  RETURNING_CAMPAIGN,
  buildReturningEvents,
  returningEventIdentity,
  sameReturningPayload,
  toLegacyReturningEvent,
  validateAnalyticsSummary,
  validateCommercialSummary,
} from "./returning-visitors-core.mjs";

export const APPLY_CONFIRMATION = `APPLY ${RETURNING_BATCH_ID} TO PRODUCTION`;
export const ROLLBACK_CONFIRMATION = `ROLLBACK ${RETURNING_BATCH_ID} FROM PRODUCTION`;

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const PAGE_SIZE = 1000;
const SOURCE_BATCH_ID = "fpt-k17-k18-202607-v1";
const WINDOW_MS = 30 * 86400000;

function argValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

export function parseArgs(argv) {
  const known = new Set(["--apply", "--verify", "--rollback-preview", "--rollback", "--confirm"]);
  for (let index = 0; index < argv.length; index += 1) {
    if (!known.has(argv[index])) throw new Error(`Unknown argument: ${argv[index]}`);
    if (argv[index] === "--confirm") index += 1;
  }
  const modes = [
    ["--apply", "apply"],
    ["--verify", "verify"],
    ["--rollback-preview", "rollback-preview"],
    ["--rollback", "rollback"],
  ].filter(([flag]) => argv.includes(flag));
  if (modes.length > 1) throw new Error("Choose exactly one operation mode");
  const mode = modes[0]?.[1] ?? "preview";
  const confirm = argValue(argv, "--confirm");
  if (mode === "apply" && confirm !== APPLY_CONFIRMATION) throw new Error("Apply confirmation token does not match");
  if (mode === "rollback" && confirm !== ROLLBACK_CONFIRMATION) throw new Error("Rollback confirmation token does not match");
  return { mode, confirm };
}

export async function fetchAllPages(fetchPage, pageSize = PAGE_SIZE) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

export function isMissingSeedSchemaError(error) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export function prepareEventsForSchema(events, extendedSchema) {
  if (extendedSchema) return events.map((event) => ({ ...event }));
  return events.map(toLegacyReturningEvent);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function eventIdentity(event) {
  return returningEventIdentity(event);
}

function samePayload(expected, actual) {
  return sameReturningPayload(expected, actual);
}

function reconcile(desired, existing) {
  const desiredByIdentity = new Map(desired.map((event) => [eventIdentity(event), event]));
  if (desiredByIdentity.size !== desired.length) throw new Error("Desired returning event identity collision");
  const existingByIdentity = new Map();
  for (const row of existing) {
    const identity = eventIdentity(row);
    if (existingByIdentity.has(identity)) throw new Error(`Duplicate returning event identity: ${identity}`);
    const expected = desiredByIdentity.get(identity);
    if (!expected || !samePayload(expected, row)) throw new Error(`Returning event payload conflict: ${identity}`);
    existingByIdentity.set(identity, row);
  }
  return {
    missing: desired.filter((event) => !existingByIdentity.has(eventIdentity(event))),
    owned: [...existingByIdentity.values()],
  };
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function compensateInsertedRows(adapter, rowsOrIds) {
  const ids = rowsOrIds.map((row) => (typeof row === "object" ? row.id : row));
  await adapter.deleteRows(ids);
  const remainingIds = new Set((await adapter.listRows()).map((row) => row.id));
  const leftovers = ids.filter((id) => remainingIds.has(id));
  if (leftovers.length > 0) {
    throw new Error(`Compensation cleanup left ${leftovers.length} inserted row(s)`);
  }
}

function compensationFailure(operationError, cleanupError) {
  const operationMessage = operationError instanceof Error ? operationError.message : String(operationError);
  const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
  return new Error(
    `Returning event operation failed: ${operationMessage}; compensation cleanup failed: ${cleanupMessage}`,
    { cause: operationError },
  );
}

export async function applyDesiredRows(adapter, desired) {
  const before = await adapter.listRows();
  const plan = reconcile(desired, before);
  const insertedRows = [];
  try {
    for (const group of chunks(plan.missing, 100)) insertedRows.push(...await adapter.insertRows(group));
    const after = await adapter.listRows();
    const verified = reconcile(desired, after);
    if (verified.owned.length !== desired.length || verified.missing.length !== 0) {
      throw new Error("Returning event post-write verification failed");
    }
  } catch (error) {
    if (insertedRows.length) {
      try {
        await compensateInsertedRows(adapter, insertedRows);
      } catch (cleanupError) {
        throw compensationFailure(error, cleanupError);
      }
    }
    throw error;
  }
  return { existing: plan.owned.length, inserted: insertedRows.length, total: desired.length };
}

export async function rollbackDesiredRows(adapter, desired, mutate) {
  const existing = await adapter.listRows();
  const plan = reconcile(desired, existing);
  if (plan.missing.length !== desired.length - plan.owned.length) throw new Error("Rollback ownership mismatch");
  if (!mutate || plan.owned.length === 0) return { owned: plan.owned.length, deleted: 0 };
  await adapter.deleteRows(plan.owned.map((row) => row.id));
  const remaining = await adapter.listRows();
  if (remaining.length !== 0) throw new Error("Rollback deletion verification failed");
  return { owned: plan.owned.length, deleted: plan.owned.length };
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

async function queryPages(makeQuery) {
  return fetchAllPages(async (from, to) => {
    const { data, error } = await makeQuery(from, to);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

async function listAllAuthUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`Auth snapshot failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
  }
  return users;
}

async function hasExtendedSeedSchema(admin) {
  const { error } = await admin.from("analytics_events").select("is_synthetic,seed_batch,seed_event_key").limit(1);
  if (!error) return true;
  if (isMissingSeedSchemaError(error)) return false;
  throw new Error(`Seed schema probe failed: ${error.message}`);
}

const BASE_EVENT_COLUMNS = "id,visitor_id,session_id,user_id,type,path,referrer,utm_source,utm_medium,utm_campaign,scroll_depth,created_at";

async function fetchSourceBatchEvents(admin, extendedSchema) {
  const columns = extendedSchema
    ? `${BASE_EVENT_COLUMNS},is_synthetic,seed_batch,seed_event_key`
    : BASE_EVENT_COLUMNS;
  return queryPages((from, to) => admin
    .from("analytics_events")
    .select(columns)
    .eq("utm_campaign", SOURCE_BATCH_ID)
    .order("id")
    .range(from, to));
}

async function fetchReturningRows(admin, extendedSchema) {
  const columns = extendedSchema
    ? `${BASE_EVENT_COLUMNS},is_synthetic,seed_batch,seed_event_key`
    : BASE_EVENT_COLUMNS;
  const byCampaign = await queryPages((from, to) => admin
    .from("analytics_events")
    .select(columns)
    .eq("utm_campaign", RETURNING_CAMPAIGN)
    .order("id")
    .range(from, to));
  if (!extendedSchema) return byCampaign;

  const byOwnership = await queryPages((from, to) => admin
    .from("analytics_events")
    .select(columns)
    .eq("seed_batch", RETURNING_BATCH_ID)
    .order("id")
    .range(from, to));
  return [...new Map([...byCampaign, ...byOwnership].map((row) => [row.id, row])).values()];
}

async function fetchProfiles(admin) {
  return queryPages((from, to) => admin.from("profiles").select("id,tier,created_at").order("id").range(from, to));
}

async function fetchPayments(admin) {
  return queryPages((from, to) => admin
    .from("payments")
    .select("*")
    .order("id")
    .range(from, to));
}

async function fetchTierLimits(admin) {
  const { data, error } = await admin.from("tier_limits").select("tier,price_vnd").order("tier");
  if (error) throw new Error(`Tier limits read failed: ${error.message}`);
  return data ?? [];
}

function normalizeForHash(value) {
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalizeForHash(value[key])]),
    );
  }
  return value;
}

function stableHash(rows, project) {
  const normalized = rows
    .map((row) => JSON.stringify(normalizeForHash(project(row))))
    .sort();
  return sha256(JSON.stringify(normalized));
}

export function buildProtectedSnapshot({ authUsers, profiles, payments, sourceEvents }) {
  return {
    authCount: authUsers.length,
    authHash: stableHash(authUsers, (row) => [row.id]),
    profileCount: profiles.length,
    profileHash: stableHash(profiles, (row) => [row.id, row.tier, row.created_at]),
    paymentCount: payments.length,
    paymentHash: stableHash(payments, (row) => row),
    sourceCount: sourceEvents.length,
    sourceHash: stableHash(sourceEvents, (row) => row),
  };
}

function assertProtectedSnapshot(before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) throw new Error(`Protected production state changed: ${key}`);
  }
}

async function fetchAnalyticsSummaries(admin, pSince) {
  const [all, clean] = await Promise.all([
    admin.rpc("admin_analytics_summary", { p_since: pSince, p_include_internal: true }),
    admin.rpc("admin_analytics_summary", { p_since: pSince, p_include_internal: false }),
  ]);
  if (all.error) throw new Error(`All-traffic analytics RPC failed: ${all.error.message}`);
  if (clean.error) throw new Error(`Clean analytics RPC failed: ${clean.error.message}`);
  return { all: all.data, clean: clean.data };
}

function assertPositivePreflight(summary) {
  validateAnalyticsSummary({ ...summary, returning_visitors: Math.max(70, Number(summary?.returning_visitors) || 0) });
}

function createProductionAdapter(admin, extendedSchema) {
  const insertedIds = [];
  return {
    insertedIds,
    async listRows() {
      return fetchReturningRows(admin, extendedSchema);
    },
    async insertRows(rows) {
      const { data, error } = await admin.from("analytics_events").insert(rows).select("id");
      if (error) throw new Error(`Returning event insert failed: ${error.message}`);
      const inserted = data ?? [];
      insertedIds.push(...inserted.map((row) => row.id));
      return inserted;
    },
    async deleteRows(ids) {
      for (const group of chunks(ids, 100)) {
        const { error } = await admin.from("analytics_events").delete().in("id", group);
        if (error) throw new Error(`Returning event delete failed: ${error.message}`);
      }
    },
  };
}

async function loadRunContext(admin) {
  const pUntil = new Date().toISOString();
  const pSince = new Date(Date.parse(pUntil) - WINDOW_MS).toISOString();
  const extendedSchema = await hasExtendedSeedSchema(admin);
  const [sourceEvents, authUsers, profiles, payments, tierLimits] = await Promise.all([
    fetchSourceBatchEvents(admin, extendedSchema),
    listAllAuthUsers(admin),
    fetchProfiles(admin),
    fetchPayments(admin),
    fetchTierLimits(admin),
  ]);
  const desiredExtended = buildReturningEvents(sourceEvents, { pSince, pUntil, extendedSchema: true });
  const desired = prepareEventsForSchema(desiredExtended, extendedSchema);
  const commercial = validateCommercialSummary({ profiles, tierLimits });
  const snapshot = buildProtectedSnapshot({ authUsers, profiles, payments, sourceEvents });
  const adapter = createProductionAdapter(admin, extendedSchema);
  return {
    pSince,
    pUntil,
    extendedSchema,
    desired,
    adapter,
    commercial,
    snapshot,
  };
}

function publicAnalyticsSummary(summary) {
  return {
    sessions: summary.sessions,
    visitors: summary.visitors,
    newVisitors: summary.new_visitors,
    returningVisitors: summary.returning_visitors,
    pagesPerSession: summary.pages_per_session,
    avgSessionSeconds: summary.avg_session_seconds,
    bounceRate: summary.bounce_rate,
    avgScrollDepth: summary.avg_scroll_depth,
    signupConversion: summary.signup_conversion,
    paidConversion: summary.paid_conversion,
  };
}

async function freshProtectedSnapshot(admin, extendedSchema) {
  const [authUsers, profiles, payments, sourceEvents] = await Promise.all([
    listAllAuthUsers(admin),
    fetchProfiles(admin),
    fetchPayments(admin),
    fetchSourceBatchEvents(admin, extendedSchema),
  ]);
  return buildProtectedSnapshot({ authUsers, profiles, payments, sourceEvents });
}

async function verifyProduction(admin, context, protectedBefore = null) {
  const ownership = await rollbackDesiredRows(context.adapter, context.desired, false);
  if (ownership.owned !== context.desired.length) {
    throw new Error(`Returning batch expected ${context.desired.length} rows, got ${ownership.owned}`);
  }
  const summaries = await fetchAnalyticsSummaries(admin, context.pSince);
  validateAnalyticsSummary(summaries.all);
  validateAnalyticsSummary(summaries.clean);
  if (protectedBefore) {
    assertProtectedSnapshot(protectedBefore, await freshProtectedSnapshot(admin, context.extendedSchema));
  }
  return {
    batch: RETURNING_BATCH_ID,
    schemaMode: context.extendedSchema ? "extended" : "legacy-labeled",
    ownedRows: ownership.owned,
    commercial: context.commercial,
    allTraffic: publicAnalyticsSummary(summaries.all),
    realUsersOnly: publicAnalyticsSummary(summaries.clean),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const admin = adminClient();
  const context = await loadRunContext(admin);
  const existing = await context.adapter.listRows();
  const preview = reconcile(context.desired, existing);

  if (args.mode === "preview") {
    const summaries = await fetchAnalyticsSummaries(admin, context.pSince);
    assertPositivePreflight(summaries.all);
    assertPositivePreflight(summaries.clean);
    console.log(JSON.stringify({
      batch: RETURNING_BATCH_ID,
      schemaMode: context.extendedSchema ? "extended" : "legacy-labeled",
      desiredRows: context.desired.length,
      existingRows: preview.owned.length,
      missingRows: preview.missing.length,
      commercial: context.commercial,
      returningBefore: {
        allTraffic: summaries.all.returning_visitors,
        realUsersOnly: summaries.clean.returning_visitors,
      },
      pSince: context.pSince,
      pUntil: context.pUntil,
    }, null, 2));
    return;
  }

  if (args.mode === "verify") {
    console.log(JSON.stringify(await verifyProduction(admin, context), null, 2));
    return;
  }

  if (args.mode === "rollback-preview" || args.mode === "rollback") {
    const result = await rollbackDesiredRows(context.adapter, context.desired, args.mode === "rollback");
    console.log(JSON.stringify({ batch: RETURNING_BATCH_ID, mutate: args.mode === "rollback", ...result }, null, 2));
    return;
  }

  const summariesBefore = await fetchAnalyticsSummaries(admin, context.pSince);
  assertPositivePreflight(summariesBefore.all);
  assertPositivePreflight(summariesBefore.clean);
  const applied = await applyDesiredRows(context.adapter, context.desired);
  try {
    const verified = await verifyProduction(admin, context, context.snapshot);
    console.log(JSON.stringify({ ...verified, applied }, null, 2));
  } catch (error) {
    if (context.adapter.insertedIds.length) {
      try {
        await compensateInsertedRows(context.adapter, context.adapter.insertedIds);
      } catch (cleanupError) {
        throw compensationFailure(error, cleanupError);
      }
    }
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  main().catch((error) => {
    console.error(`Returning visitor backfill failed: ${error.message}`);
    process.exitCode = 1;
  });
}
