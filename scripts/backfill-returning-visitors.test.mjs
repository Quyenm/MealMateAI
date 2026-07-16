import test from "node:test";
import assert from "node:assert/strict";

import {
  APPLY_CONFIRMATION,
  ROLLBACK_CONFIRMATION,
  applyDesiredRows,
  buildProtectedSnapshot,
  fetchAllPages,
  isMissingSeedSchemaError,
  parseArgs,
  prepareEventsForSchema,
  rollbackDesiredRows,
} from "./backfill-returning-visitors.mjs";

function fullEvent(index) {
  return {
    visitor_id: `visitor-${index}`,
    session_id: `session-${index}`,
    user_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    type: "pageview",
    path: "/home",
    referrer: "",
    utm_source: "synthetic_seed",
    utm_medium: "demo",
    utm_campaign: "fpt-returning-202607-v1",
    scroll_depth: null,
    created_at: `2026-07-15T0${index}:00:00.000Z`,
    is_synthetic: true,
    seed_batch: "fpt-returning-202607-v1",
    seed_event_key: `key-${index}`,
  };
}

function memoryAdapter(initial = [], options = {}) {
  let rows = initial.map((row, index) => ({ id: row.id ?? index + 1, ...row }));
  let nextId = rows.length + 1;
  let listCalls = 0;
  return {
    get rows() { return rows; },
    async listRows() {
      listCalls += 1;
      if (options.failListCall === listCalls) throw new Error("verification read failed");
      return rows.map((row) => ({ ...row }));
    },
    async insertRows(values) {
      const inserted = values.map((row) => ({ id: nextId++, ...row }));
      rows.push(...inserted);
      return inserted;
    },
    async deleteRows(ids) {
      if (options.ignoreDeletes) return;
      const selected = new Set(ids);
      rows = rows.filter((row) => !selected.has(row.id));
    },
  };
}

test("CLI is preview-first and production mutations require exact confirmation tokens", () => {
  assert.deepEqual(parseArgs([]), { mode: "preview", confirm: null });
  assert.equal(parseArgs(["--verify"]).mode, "verify");
  assert.equal(parseArgs(["--rollback-preview"]).mode, "rollback-preview");
  assert.throws(() => parseArgs(["--apply"]), /confirmation/i);
  assert.throws(() => parseArgs(["--rollback"]), /confirmation/i);
  assert.equal(parseArgs(["--apply", "--confirm", APPLY_CONFIRMATION]).mode, "apply");
  assert.equal(parseArgs(["--rollback", "--confirm", ROLLBACK_CONFIRMATION]).mode, "rollback");
});

test("paginated reads retrieve all 1,056 source rows", async () => {
  const source = Array.from({ length: 1056 }, (_, index) => ({ id: index + 1 }));
  const calls = [];
  const rows = await fetchAllPages(async (from, to) => {
    calls.push([from, to]);
    return source.slice(from, to + 1);
  });
  assert.equal(rows.length, 1056);
  assert.deepEqual(calls, [[0, 999], [1000, 1999]]);
});

test("only confirmed missing-column errors select legacy schema mode", () => {
  assert.equal(isMissingSeedSchemaError({ code: "42703" }), true);
  assert.equal(isMissingSeedSchemaError({ code: "PGRST204" }), true);
  assert.equal(isMissingSeedSchemaError({ code: "500", message: "temporary" }), false);
});

test("schema preparation keeps ownership in extended mode and strips it in legacy mode", () => {
  const event = fullEvent(1);
  assert.deepEqual(prepareEventsForSchema([event], true), [event]);
  const [legacy] = prepareEventsForSchema([event], false);
  assert.equal(legacy.is_synthetic, undefined);
  assert.equal(legacy.seed_batch, undefined);
  assert.equal(legacy.seed_event_key, undefined);
  assert.equal(legacy.utm_campaign, "fpt-returning-202607-v1");
});

test("apply is resumable, idempotent, and rejects payload conflicts", async () => {
  const desired = [fullEvent(1), fullEvent(2)];
  const partial = memoryAdapter([{ id: 9, ...desired[0] }]);
  const first = await applyDesiredRows(partial, desired);
  assert.deepEqual(first, { existing: 1, inserted: 1, total: 2 });
  const second = await applyDesiredRows(partial, desired);
  assert.deepEqual(second, { existing: 2, inserted: 0, total: 2 });

  const conflict = memoryAdapter([{ id: 9, ...desired[0], path: "/tampered" }]);
  await assert.rejects(() => applyDesiredRows(conflict, desired), /conflict/i);
});

test("failed post-write verification compensates only rows inserted by that invocation", async () => {
  const preexisting = { id: 50, ...fullEvent(1) };
  const adapter = memoryAdapter([preexisting], { failListCall: 2 });
  await assert.rejects(() => applyDesiredRows(adapter, [fullEvent(1), fullEvent(2)]), /verification read failed/i);
  assert.deepEqual(adapter.rows, [preexisting]);
});

test("failed compensation is detected instead of silently leaving inserted rows", async () => {
  const adapter = memoryAdapter([], { failListCall: 2, ignoreDeletes: true });
  await assert.rejects(
    () => applyDesiredRows(adapter, [fullEvent(1)]),
    /compensation cleanup failed/i,
  );
  assert.equal(adapter.rows.length, 1);
});

test("protected snapshots cover complete payment and source-event payloads", () => {
  const base = {
    authUsers: [{ id: "auth-1" }],
    profiles: [{ id: "profile-1", tier: "vip", created_at: "2026-07-02T00:00:00.000Z" }],
    payments: [{
      id: "payment-1",
      user_id: "profile-1",
      subscription_id: "subscription-1",
      payos_order_code: 123,
      payos_payment_link_id: "link-1",
      amount_vnd: 99_000,
      tier_purchased: "vip",
      status: "paid",
      method: "bank",
      raw_webhook: { nested: { value: 1 } },
      paid_at: "2026-07-02T01:00:00.000Z",
      created_at: "2026-07-02T00:00:00.000Z",
      updated_at: "2026-07-02T01:00:00.000Z",
    }],
    sourceEvents: [fullEvent(1)],
  };
  const original = buildProtectedSnapshot(base);
  const paymentChanged = buildProtectedSnapshot({
    ...base,
    payments: [{ ...base.payments[0], tier_purchased: "svip" }],
  });
  const sourceChanged = buildProtectedSnapshot({
    ...base,
    sourceEvents: [{ ...base.sourceEvents[0], utm_source: "tampered" }],
  });

  assert.notEqual(paymentChanged.paymentHash, original.paymentHash);
  assert.notEqual(sourceChanged.sourceHash, original.sourceHash);
});

test("rollback deletes only exact verified row ids and is safely repeatable", async () => {
  const desired = [fullEvent(1), fullEvent(2)];
  const adapter = memoryAdapter(desired);
  assert.deepEqual(await rollbackDesiredRows(adapter, desired, false), { owned: 2, deleted: 0 });
  assert.deepEqual(await rollbackDesiredRows(adapter, desired, true), { owned: 2, deleted: 2 });
  assert.deepEqual(await rollbackDesiredRows(adapter, desired, true), { owned: 0, deleted: 0 });
});
