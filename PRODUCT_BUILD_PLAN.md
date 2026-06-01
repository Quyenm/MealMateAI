# MealMate AI — v1 Build Plan

> Stack (locked): **Next.js 15 (App Router, TypeScript) monolith** · **Supabase** (Postgres + Auth + RLS) · **Vercel** (deploy) · **OpenAI GPT-4o-mini** (vision + text, Structured Outputs) · **PayOS** (VietQR/Momo/ZaloPay).
> Tiers kept: **Free / VIP 139k / SVIP 198k / Family 499k**. In v1, paid tiers unlock **higher scan quota only**; premium *features* are deferred.

---

## 1. Scope

**IN (v1):** email+Google auth · core loop `scan → confirm → 3 dishes` · recipe detail · server-side daily quota by tier · global spend circuit-breaker · scan history (text only, NO images) · paywall · all 4 tiers + PayOS payment.

**OUT (deferred):** weekly meal plan · real inventory/expiry dates · push/expiration alerts · macro/nutrition tracking · ML personalization · Family multi-user shared inventory (Family in v1 = price + quota only) · IoT · native apps · step-by-step cook mode · ratings/favorites (optional).

---

## 2. Architecture

```
        [ User: mobile browser / PWA ]
                   │ HTTPS
                   ▼
   ┌─────────────────────────────────────────────┐
   │  Next.js 15 monolith  (Vercel Pro)            │
   │  UI (Server Components) + API Route Handlers   │
   │  /api/scan  /api/suggest  /api/recipe/[id]     │  ← OPENAI_API_KEY server-only
   │  /api/quota/me  /api/ratings                   │
   │  /api/payments/create-link  /webhooks/payos    │
   └──────┬───────────────────────┬─────────────────┘
          │                       │
   ┌──────▼────────┐      ┌────────▼─────────┐
   │ Supabase      │      │ OpenAI           │
   │ Postgres+Auth │      │ gpt-4o-mini      │
   │ RLS + quota   │      │ vision + text    │
   └───────────────┘      └──────────────────┘
          ▲
   ┌──────┴────────┐
   │ PayOS webhook │ → flips subscriptions.tier in DB
   └───────────────┘
   Guards: Upstash rate-limit · Cloudflare Turnstile (signup) · global spend cap
```

**Hard rule:** the OpenAI key lives only in server route handlers (never `NEXT_PUBLIC_`). Browser only holds the Supabase anon key + user JWT.

---

## 3. Data Model (Supabase Postgres)

All money = integer VND. RLS ON everywhere; user tables policy = `user_id = auth.uid()`. Counter/reference tables are service-role-only. **No image column exists anywhere** (photos never stored).

| Table | Purpose / key columns | RLS |
|---|---|---|
| **profiles** | 1:1 with `auth.users`; `tier` (free/vip/svip/family, default free), dietary_pref, cook_time_pref, spice_pref, allergies[], never_suggest[], onboarding_completed. `tier` only mutable by service role (webhook). | own row |
| **tier_limits** (ref) | `tier` PK → daily_scan_limit, suggestions_per_scan, ai_model, price_vnd. Seed: free=3/3, vip=30/5/139000, svip=60/5/198000, family=60/5/499000. Tunable by SQL, no redeploy. | public read |
| **subscriptions** | one active per user; tier, status, current_period_end, payos refs, grace_until. `profiles.tier` is denormalized cache kept in sync by webhook (same txn). | own read / service write |
| **daily_usage** | per-user-per-day counter; `UNIQUE(user_id, usage_date)`; scans_used. Increment via `SECURITY DEFINER` fn (atomic upsert, checks limit). Resets implicitly at HCMC midnight (new date = new row). | own read / service write |
| **global_spend_counter** | single row/day; est_cost_vnd, hard_cap_vnd, tripped. Checked BEFORE every AI call → 503 if over cap. | service only |
| **scans** | one per scan; status, ai_model, latency, error_code, soft-delete. Text only. | own |
| **scan_ingredients** | confirmed list per scan; name_vi, name_en, confidence, source(ai/user_added/user_corrected), `is_expiring` (manual FIFO flag, max 1/scan). | own |
| **suggestions** | up to 3 dishes per scan as validated `jsonb`; `UNIQUE(scan_id)`; token/cost telemetry. | own read / service write |
| **ratings** | 1–5 stars per dish (logged, no ML in v1); `UNIQUE(user_id, scan_id, dish_index)`. | own |
| **payments** | PayOS ledger; `UNIQUE(payos_order_code)` (idempotency); raw_webhook jsonb; flips tier on status→paid. | own read / service write |
| **recipe_cache** (deferred-lean) | shape defined, population is v1.5; ingredient_signature → dishes. | public read |
| ~~households / household_members~~ | **NOT in v1 migration** — documented stub for Family. | — |

---

## 4. API + OpenAI Integration

Two-call architecture. **`/api/scan` (vision) is NOT quota-billed; `/api/suggest` (text) is the billable action** — so re-editing ingredients re-runs only the cheap text call.

Pipeline order on AI routes: **auth → Upstash rate-limit → per-user tier quota → global spend-guard → OpenAI → atomic usage+spend increment.** Fail closed at each gate. `runtime='nodejs'`, `maxDuration=60`, `dynamic='force-dynamic'`.

- **POST `/api/scan`** — body `{ imageDataUrl }` (client-downscaled ~1024px, ≤~1.5MB else 413). Calls gpt-4o-mini vision, `image_url detail:'low'`, `response_format json_schema strict:true`. Returns `{ scanId, ingredients:[{name_vi,name_en,confidence}] }`. Image discarded immediately. Errors: 401, 413, 429, 503 (spend cap), 422 `vision_unreadable` (→ manual-add UI), 502 `ai_failed` (after 1 retry).
- **POST `/api/suggest`** — body `{ scanId, ingredients:[{name_vi,name_en,expiring?}], prefs? }`. Reserve-then-commit quota (block→402 before any token spend; increment only after valid response). Text-only OpenAI call. Server post-filter drops dishes needing >2 staples; re-sorts expiring-first; caps 3; persists text rows. Returns `{ scanId, dishes:[…], quota }` or `{ dishes:[], fallback:{type:'no_match', suggestedStaples, message_vi} }`. Errors: 401, **402 `quota_exceeded` (paywall)**, 503, 502.
- **GET `/api/recipe/[id]`** — full stored dish detail (RLS-scoped). No AI call.
- **POST `/api/ratings`** — `{ suggestionId, stars 1-5, note? }`, upsert. No AI call.
- **GET `/api/quota/me`** — `{ tier, used, limit, remaining, resetsAt, suggestionsPerScan }`.
- **POST `/api/payments/create-link`** — `{ tier }` → PayOS checkout URL (amount from `tier_limits`, server-side).
- **POST `/api/webhooks/payos`** — public, HMAC-verify RAW body, idempotent by orderCode, flips subscription tier in one txn. Never trust client redirect for entitlement.

**Schemas** (strict mode → `additionalProperties:false` + all keys required at every level; ranges/caps enforced by prompt + server Zod clamp, not schema):
- ingredients: `{ ingredients:[{ name_vi, name_en, confidence }] }`
- dishes: `{ dishes:[{ title_vi, title_en, cook_time_min, difficulty(easy|medium|hard), uses_ingredients[], missing_ingredients[], why, steps[], approx_macros{kcal,protein_g,carbs_g,fat_g} }] }`

**Prompts:** large static system prompt placed FIRST (byte-identical → OpenAI automatic prompt caching, ~50% off cached prefix); per-request data (image / pantry+prefs) in the trailing user message. Recipe rules: only-use-pantry + ≤2 staples (salt/oil/fish sauce/sugar/pepper/water) listed in `missing_ingredients`; FIFO via `expiring` flag; max 3 Vietnamese dishes; empty array if none cookable (never pad). `lib/ai/openai.ts` wraps the SDK with model in `OPENAI_MODEL` env (swappable) + 1 auto-retry on parse/refusal/timeout + token→cost tracking feeding the spend-guard.

---

## 5. Frontend (Next.js App Router)

Route groups: `(marketing)` public · `(auth)` · `(app)` protected by `middleware.ts`. Default Server Components; Client Components only for 4 islands: **camera+canvas downscale**, **editable ingredient chip board (mark-expiring)**, **AI loading states**, **PayOS checkout button**. `lib/api.ts` central fetch wrapper: attaches JWT, AbortController timeout, maps 401→/login, **402→/upgrade?reason=quota**, 429→toast, 5xx→retry.

Screens: Landing `/` · `/login` `/signup` `/verify` `/auth/callback` · `/home` (quota + Scan CTA + recent) · **`/scan`** (3-step wizard: capture→confirm→suggestions, ephemeral state) · `/recipe/[id]` · `/history` (text only) · `/upgrade` (+`/result`) · `/pricing` · `/settings` (folds in dietary prefs, replaces onboarding). PWA: `app/manifest.ts` (standalone, maskable icons), SW caches static shell only (no offline AI), online/offline banner. Deferred features shown as **"Coming soon"** locked cards.

UX rules: every ~10–20s AI call → staged `AiLoadingState` + indeterminate progress + ~25s client timeout; every failure ends in an actionable state (Retry / manual-add) so a scan never dead-ends. `is_expiring` = single-select flame toggle (one item) so FIFO is unambiguous.

---

## 6. Guardrails (cost + security) — non-negotiable

1. **OpenAI key server-only** + `lib/env.ts` boot assertion fails if any secret carries `NEXT_PUBLIC_`; GitHub secret scanning + push protection + gitleaks pre-commit.
2. **Per-user quota in Postgres** (atomic, reserve-then-commit) checked before any token spend.
3. **Global daily spend circuit-breaker** (DB counter checked pre-call → 503) + **OpenAI dashboard hard billing cap** as backstop (provider metering lags, so DB counter is primary).
4. **Upstash rate-limit** (per user + per IP) + **Cloudflare Turnstile** on signup (stops bot accounts farming free quota).
5. **Never persist fridge photos** — forward bytes to OpenAI, discard; strip EXIF client-side.
6. **PayOS webhook**: HMAC-verify raw body, idempotent, entitlement read server-side only.

---

## 7. Milestones (solo dev, ~7–10 focused weeks)

| M | Goal | Key tasks | Effort | Done when |
|---|---|---|---|---|
| **M0** | Repo → live hello-world URL | Next.js+TS+Tailwind+shadcn scaffold · Supabase project · Vercel Pro + push-to-deploy · env vars server-only · **set OpenAI hard billing cap now** · GitHub secret scanning | ~2d | Public HTTPS URL renders; push auto-deploys; fake-key push blocked; OpenAI cap set |
| **M1** | Auth + profile + RLS | Supabase email+Google · email confirm · middleware route guard · `profiles` auto-create trigger (tier=free) · RLS on all tables · minimal prefs capture | ~4–5d | Signup (email+Google), login, logout work; RLS proves A can't read B; new user tier=free |
| **M2** ⭐ | **Core scan loop + guardrails (CRITICAL PATH)** | **Spike first (~1.5d):** real fridge JPEG → gpt-4o-mini vision→JSON→3 dishes; measure latency/cost/**Vietnamese-name quality on 15–20 real photos**/strict-mode behavior. Then: client downscale · `/api/scan` · Zod+1 retry · confidence-tier confirm UI · `/api/suggest` (only-pantry+≤2 staples+FIFO) · server post-filter · recipe detail · swappable AI module · prompt-cache layout | ~10–14d | Authed user: photo→editable list→correct→flag expiring→3 cookable Vietnamese dishes (#1 uses flagged item, no dish >2 staples); garbage photo → graceful retry/manual; logs confirm no image persisted + key not in client bundle |
| **M3** | Quota by tier + spend cap + paywall | tier_limits config table · daily_usage · quota check before OpenAI → 402 · atomic increment on confirm · global spend circuit-breaker · Upstash rate-limit · paywall UI | ~6–8d | Free 4th scan → 402 + paywall, NO OpenAI call (in logs); count can't be bypassed/negative; flipping tier→vip raises limit instantly; tripping global cap → everyone "busy"; resets at day boundary |
| **M4** | PayOS payment + tier unlock | `/api/payments/create-link` · `/webhooks/payos` (verify signature, idempotent, flip tier) · entitlement server-side · period-based expiry (no auto-renew in v1) · **price/quota config-driven** (change 139k without redeploy) | ~6–9d | Sandbox VIP pay → signed webhook flips tier → next scan reads higher quota; forged webhook rejected; replay doesn't double-grant; past period_end → treated as free |
| **M5** | Polish | scan history (text) · onboarding/prefs · PWA install · privacy copy · all empty/error states · latency UX · quota indicator | ~6–8d | History shows past scans, NO stored photo anywhere; installable PWA (Lighthouse); every failure path designed; privacy note visible |

**Critical path:** M0→M1→M2→M3→M4 (M5 overlaps M3/M4). **Build-first to de-risk:** the M2 OpenAI spike before any UI/billing.

---

## 8. Key decisions
- Two-call (vision→confirm→text), never one combined call.
- gpt-4o-mini for both calls, model in env (swappable); Structured Outputs strict + Zod + 1 retry; manual-add as ultimate fallback.
- Quota enforced in Postgres before token spend; billable action = `/api/suggest` on confirm.
- All 4 tiers wired in schema/quota; **v1 paid unlocks only higher quota**, premium features deferred & labeled "Coming soon".
- Prices/quotas 100% config-driven (DB) so the 139k price can change post-launch without redeploy.
- Vercel Pro from launch (Hobby = non-commercial + risky timeout).

## 9. Risks to confirm before build
1. **Willingness-to-pay (biggest business risk):** survey ~20k vs VIP 139k (~7x). In v1 paid = "just more scans" → conversion likely near-zero at 139k. Prices config-driven to adjust; **decide if you keep 139k or add a cheaper entry tier.**
2. **GPT-4o-mini Vietnamese vision quality** = #1 technical unknown → validated in M2 spike on real photos; if weak, swap model behind the AI module (+3–5d).
3. **"Coming soon" tiers** → selling Family/SVIP whose features don't exist yet is a deceptive-purchase risk; paywall copy must be honest about what's actually unlocked (quota).
4. Latency vs timeout, spend-cap race, PayOS sandbox timeline, Supabase free-tier pause — all mitigated above.

## 10. Environment variables
**Server-only:** `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TURNSTILE_SECRET_KEY`, `GLOBAL_DAILY_SPEND_CAP_USD`, `APP_BASE_URL`.
**Public:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_APP_URL`.
