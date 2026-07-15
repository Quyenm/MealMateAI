import { createHash } from "node:crypto";

export const BATCH_ID = "fpt-k17-k18-202607-v1";
export const INPUT_SHA256 = "85f2638dadee0786ebc6ad11855b72040a2b2f1c3e5a12fe4f68a2e49fbd6d82";
export const TARGETS = Object.freeze({ total: 346, free: 309, vip: 22, svip: 11, family: 4 });

const STANDARD_ID = /^([A-Z]{2})(13|14|15|16|17|18)([0-9]{4})$/;
const LEGACY_ID = /^[0-9]{5}$/;
const COHORT_MAP = Object.freeze({ 13: "17", 14: "17", 15: "18", 16: "18", 17: "17", 18: "18" });
const DAY_COUNTS = Object.freeze([
  ["2026-07-02", 109],
  ["2026-07-03", 6],
  ["2026-07-04", 6],
  ...Array.from({ length: 11 }, (_, index) => [`2026-07-${String(index + 5).padStart(2, "0")}`, 5]),
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeName(value) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function slug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function emailFor(fullName, finalId) {
  const words = normalizeName(fullName).split(" ").filter(Boolean);
  if (!words.length) throw new Error("Full name is empty");
  const given = slug(words.at(-1));
  const initials = words.slice(0, -1).map((word) => slug(word)[0] ?? "").join("");
  if (!given) throw new Error(`Name cannot form an email for ${finalId}`);
  return `${given}${initials}${finalId.toLowerCase()}@fpt.edu.vn`;
}

export function parseSourceTsv(text, { expectedSha256 } = {}) {
  if (expectedSha256 && sha256(text).toLowerCase() !== expectedSha256.toLowerCase()) {
    throw new Error("Input checksum mismatch");
  }

  const rows = [];
  const seen = new Set();
  for (const [sourceIndex, rawLine] of text.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const tab = rawLine.indexOf("\t");
    if (tab < 1) throw new Error(`Invalid TSV row ${sourceIndex + 1}`);
    const sourceId = rawLine.slice(0, tab).trim().toUpperCase();
    const fullName = normalizeName(rawLine.slice(tab + 1));
    if (!sourceId || !fullName) throw new Error(`Missing ID or name at row ${sourceIndex + 1}`);
    if (seen.has(sourceId)) throw new Error(`Duplicate source ID: ${sourceId}`);
    seen.add(sourceId);
    rows.push({ sourceId, fullName, sourceIndex });
  }
  if (!rows.length) throw new Error("Input has no rows");
  return rows;
}

function reserveCandidate(used, prefix, cohort, rawSerial) {
  let serial = Number(rawSerial);
  if (!Number.isInteger(serial) || serial < 0 || serial > 9999) throw new Error("Invalid four-digit serial");
  for (let attempts = 0; attempts < 10000; attempts += 1) {
    const candidate = `${prefix}${cohort}${String(serial).padStart(4, "0")}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    serial = (serial + 1) % 10000;
  }
  throw new Error(`Student ID namespace exhausted for ${prefix}${cohort}`);
}

export function buildIdentityPlan(rows, { requireCount = 176 } = {}) {
  const standard = rows.filter((item) => STANDARD_ID.test(item.sourceId));
  const selectedStandard = standard.filter((item) => {
    const cohort = item.sourceId.slice(2, 4);
    return ["13", "14", "15", "16", "17", "18"].includes(cohort);
  });
  const selectedLegacy = rows.filter((item) => LEGACY_ID.test(item.sourceId)).slice(0, 7);
  const selected = [...selectedStandard, ...selectedLegacy].sort((a, b) => a.sourceIndex - b.sourceIndex);

  if (selected.length !== requireCount) {
    throw new Error(`Identity selection expected ${requireCount}, got ${selected.length}`);
  }

  const used = new Set();
  const finalByIndex = new Map();

  for (const item of selectedStandard) {
    const match = item.sourceId.match(STANDARD_ID);
    if (match[2] === "17" || match[2] === "18") {
      if (used.has(item.sourceId)) throw new Error(`Duplicate retained ID: ${item.sourceId}`);
      used.add(item.sourceId);
      finalByIndex.set(item.sourceIndex, item.sourceId);
    }
  }

  for (const item of selectedStandard) {
    if (finalByIndex.has(item.sourceIndex)) continue;
    const [, prefix, cohort, serial] = item.sourceId.match(STANDARD_ID);
    finalByIndex.set(item.sourceIndex, reserveCandidate(used, prefix, COHORT_MAP[cohort], serial));
  }

  for (const item of selectedLegacy) {
    finalByIndex.set(item.sourceIndex, reserveCandidate(used, "HE", "18", item.sourceId.slice(-4)));
  }

  const result = selected.map((item) => {
    const finalId = finalByIndex.get(item.sourceIndex);
    return { ...item, finalId, email: emailFor(item.fullName, finalId) };
  });
  if (new Set(result.map((item) => item.finalId)).size !== result.length) throw new Error("Duplicate final student ID");
  if (new Set(result.map((item) => item.email)).size !== result.length) throw new Error("Duplicate generated email");
  return result;
}

function tierAt(index) {
  if (index < 14) return "vip";
  if (index < 19) return "svip";
  if (index < 21) return "family";
  return "free";
}

function scheduleDays() {
  return DAY_COUNTS.flatMap(([day, count]) => Array.from({ length: count }, () => day));
}

export function assignTiersAndDates(plan, { batchId = BATCH_ID } = {}) {
  if (plan.length !== 176) throw new Error(`Assignment expected 176 identities, got ${plan.length}`);
  const ordered = plan
    .map((item) => ({ ...item, orderKey: sha256(`${batchId}:${item.email}`) }))
    .sort((a, b) => a.orderKey.localeCompare(b.orderKey));
  const days = scheduleDays();
  const positions = new Map();
  const counts = new Map(DAY_COUNTS);

  return ordered.map((item, index) => {
    const tier = tierAt(index);
    const day = days[index];
    const position = positions.get(day) ?? 0;
    positions.set(day, position + 1);
    const minuteOffset = Math.floor((position * 720) / counts.get(day));
    const profileCreatedAt = new Date(`${day}T01:00:00.000Z`).getTime() + minuteOffset * 60000;
    const iso = new Date(profileCreatedAt).toISOString();
    const manifestKey = sha256(JSON.stringify([batchId, item.sourceId, item.finalId, item.email, iso, tier]));
    return { ...item, tier, profileCreatedAt: iso, manifestKey };
  });
}

export function buildAuthCreateAttributes(item, password) {
  if (!password) throw new Error("Password is required");
  return {
    email: item.email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: item.fullName,
      display_name: item.fullName,
      student_code: item.finalId,
      source_student_id: item.sourceId,
    },
    app_metadata: {
      synthetic: true,
      seed_batch: BATCH_ID,
      manifest_key: item.manifestKey,
    },
  };
}

export function buildAnalyticsEvents(item, userId) {
  const fingerprint = sha256(`${BATCH_ID}:${item.manifestKey}`);
  const visitorId = `seed_v_${fingerprint.slice(0, 24)}`;
  const sessionId = `seed_s_${fingerprint.slice(24, 48)}`;
  const durationSeconds = (20 + (Number.parseInt(fingerprint.slice(0, 2), 16) % 16)) * 60;
  const offsets = [0, 120, 240, 480, 720, durationSeconds];
  const shapes = [
    ["pageview", "/", null, null],
    ["pageview", "/signup", null, null],
    ["pageview", "/home", userId, null],
    ["click", "/home", userId, null],
    ["pageview", "/scan", userId, null],
    ["scroll", "/scan", userId, 82],
  ];
  const base = Date.parse(item.profileCreatedAt) + 60000;

  return shapes.map(([type, path, eventUserId, scrollDepth], index) => ({
    visitor_id: visitorId,
    session_id: sessionId,
    user_id: eventUserId,
    type,
    path,
    referrer: index === 0 ? null : "",
    utm_source: "synthetic_seed",
    utm_medium: "demo",
    utm_campaign: BATCH_ID,
    scroll_depth: scrollDepth,
    created_at: new Date(base + offsets[index] * 1000).toISOString(),
    is_synthetic: true,
    seed_batch: BATCH_ID,
    seed_event_key: sha256(`${BATCH_ID}:${item.manifestKey}:${index}`),
  }));
}

const EVENT_PAYLOAD_KEYS = Object.freeze([
  "visitor_id", "session_id", "user_id", "type", "path", "referrer", "utm_source", "utm_medium",
  "utm_campaign", "scroll_depth", "created_at", "is_synthetic", "seed_batch", "seed_event_key",
]);

export function sameSeedEventPayload(left, right) {
  return EVENT_PAYLOAD_KEYS.every((key) => {
    const leftValue = left[key] ?? null;
    const rightValue = right[key] ?? null;
    if (key !== "created_at") return leftValue === rightValue;

    const leftTime = Date.parse(leftValue);
    const rightTime = Date.parse(rightValue);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime === rightTime;
    return leftValue === rightValue;
  });
}
