-- MealMate AI — v1 initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- Money is integer VND. Photos are NEVER stored (no image columns).
-- Counters/quota are mutated only by SECURITY DEFINER functions (called by the server with the service role).

create extension if not exists pgcrypto;

-- ─────────────────────────── Enums ───────────────────────────
do $$ begin
  create type public.subscription_tier as enum ('free','vip','svip','family');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dietary_pref as enum ('none','keto','eat_clean','muscle_gain');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sub_status as enum ('active','past_due','canceled','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.scan_status as enum ('ingredients_pending','confirmed','suggested','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ingredient_source as enum ('ai','user_added','user_corrected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','paid','failed','canceled','refunded');
exception when duplicate_object then null; end $$;

-- ─────────────────────── updated_at helper ───────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────────── profiles ───────────────────────────
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  display_name         text,
  avatar_url           text,
  tier                 public.subscription_tier not null default 'free',
  dietary_pref         public.dietary_pref not null default 'none',
  cook_time_pref       text not null default '15min',   -- 5min | 15min | 30min_plus
  spice_pref           text not null default 'medium',  -- mild | medium | hot
  allergies            text[] not null default '{}',
  dislikes             text[] not null default '{}',
  never_suggest        text[] not null default '{}',
  onboarding_completed boolean not null default false,
  household_id         uuid,                            -- DEFERRED (Family); stub only
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists profiles_email_key on public.profiles(email);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Pin `tier`: clients can update their own profile prefs, but NOT escalate their tier.
-- Only the service role (server, e.g. PayOS webhook) may change tier.
create or replace function public.pin_profile_tier()
returns trigger language plpgsql as $$
begin
  if new.tier is distinct from old.tier and current_user <> 'service_role' then
    new.tier := old.tier;
  end if;
  return new;
end $$;
drop trigger if exists trg_pin_profile_tier on public.profiles;
create trigger trg_pin_profile_tier before update on public.profiles
  for each row execute function public.pin_profile_tier();

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────── tier_limits (reference) ─────────────────────
create table if not exists public.tier_limits (
  tier                public.subscription_tier primary key,
  daily_scan_limit    int  not null,
  suggestions_per_scan int not null,
  ai_model            text not null default 'gpt-4o-mini',  -- future per-tier routing (env OPENAI_MODEL drives v1)
  display_label       text not null,
  price_vnd           int  not null
);
insert into public.tier_limits (tier, daily_scan_limit, suggestions_per_scan, ai_model, display_label, price_vnd) values
  ('free',   3,  3, 'gpt-4o-mini', 'Free',   0),
  ('vip',    30, 5, 'gpt-4o-mini', 'VIP',    139000),
  ('svip',   60, 5, 'gpt-4o-mini', 'SVIP',   198000),
  ('family', 60, 5, 'gpt-4o-mini', 'Family', 499000)
on conflict (tier) do update set
  daily_scan_limit = excluded.daily_scan_limit,
  suggestions_per_scan = excluded.suggestions_per_scan,
  display_label = excluded.display_label,
  price_vnd = excluded.price_vnd;

-- ─────────────────────────── subscriptions ───────────────────────────
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  tier                  public.subscription_tier not null,
  status                public.sub_status not null default 'active',
  current_period_start  timestamptz,
  current_period_end    timestamptz not null,
  cancel_at_period_end  boolean not null default false,
  payos_subscription_ref text,
  grace_until           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create unique index if not exists subscriptions_one_active
  on public.subscriptions(user_id) where status = 'active';
create index if not exists subscriptions_period_end_idx on public.subscriptions(current_period_end);
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ─────────────────────────── daily_usage ───────────────────────────
create table if not exists public.daily_usage (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  usage_date            date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  scans_used            int  not null default 0,
  suggestions_generated int  not null default 0,
  tier_at_time          public.subscription_tier not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, usage_date)
);
create index if not exists daily_usage_date_idx on public.daily_usage(usage_date);
drop trigger if exists trg_daily_usage_updated on public.daily_usage;
create trigger trg_daily_usage_updated before update on public.daily_usage
  for each row execute function public.set_updated_at();

-- ──────────────────── global_spend_counter (circuit breaker) ────────────────────
create table if not exists public.global_spend_counter (
  usage_date  date primary key default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  ai_calls    int not null default 0,
  spend_usd   numeric(10,5) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────── scans ───────────────────────────
create table if not exists public.scans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  status         public.scan_status not null default 'ingredients_pending',
  ai_model       text,
  recognition_ms int,
  confirmed_at   timestamptz,
  error_code     text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
  -- NOTE: intentionally NO image column. Fridge photos are never persisted.
);
create index if not exists scans_user_created_idx on public.scans(user_id, created_at desc);

-- ─────────────────────────── scan_ingredients ───────────────────────────
create table if not exists public.scan_ingredients (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references public.scans(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name_vi     text,
  name_en     text,
  category    text,
  confidence  numeric(4,3),
  est_quantity text,
  source      public.ingredient_source not null default 'ai',
  is_expiring boolean not null default false,   -- manual FIFO flag (v1 stand-in for expiry dates)
  position    int,
  created_at  timestamptz not null default now()
);
create index if not exists scan_ingredients_scan_idx on public.scan_ingredients(scan_id);
create index if not exists scan_ingredients_user_idx on public.scan_ingredients(user_id);

-- ─────────────────────────── suggestions ───────────────────────────
create table if not exists public.suggestions (
  id                   uuid primary key default gen_random_uuid(),
  scan_id              uuid not null references public.scans(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  dishes               jsonb not null,   -- validated array of dish objects (matches OpenAI structured output)
  model                text not null,
  prompt_tokens        int,
  completion_tokens    int,
  est_cost_usd         numeric(10,5),
  prioritized_expiring boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (scan_id)
);
create index if not exists suggestions_user_created_idx on public.suggestions(user_id, created_at desc);

-- ─────────────────────────── ratings ───────────────────────────
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  scan_id     uuid not null references public.scans(id) on delete cascade,
  dish_index  int  not null,
  dish_title  text not null,
  stars       smallint not null check (stars between 1 and 5),
  note        text,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, scan_id, dish_index)
);
create index if not exists ratings_user_created_idx on public.ratings(user_id, created_at desc);
drop trigger if exists trg_ratings_updated on public.ratings;
create trigger trg_ratings_updated before update on public.ratings
  for each row execute function public.set_updated_at();

-- ─────────────────────────── payments ───────────────────────────
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  subscription_id      uuid references public.subscriptions(id),
  payos_order_code     bigint not null unique,   -- idempotency: webhook retries can't double-apply
  payos_payment_link_id text,
  amount_vnd           int not null,
  tier_purchased       public.subscription_tier not null,
  status               public.payment_status not null default 'pending',
  method               text,
  raw_webhook          jsonb,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);
create index if not exists payments_status_idx on public.payments(status);
drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

-- ─────────────────────── quota / spend functions ───────────────────────
-- Read-only quota status (for /api/quota/me and the pre-scan paywall check).
create or replace function public.get_quota_status(p_user uuid)
returns table(tier public.subscription_tier, used int, scan_limit int, remaining int, suggestions_per_scan int)
language plpgsql security definer set search_path = public as $$
declare
  v_tier public.subscription_tier;
  v_limit int;
  v_sps int;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_used int;
begin
  select p.tier into v_tier from public.profiles p where p.id = p_user;
  if v_tier is null then raise exception 'profile_not_found'; end if;
  select t.daily_scan_limit, t.suggestions_per_scan into v_limit, v_sps
    from public.tier_limits t where t.tier = v_tier;
  select coalesce(d.scans_used, 0) into v_used
    from public.daily_usage d where d.user_id = p_user and d.usage_date = v_today;
  v_used := coalesce(v_used, 0);
  return query select v_tier, v_used, v_limit, greatest(v_limit - v_used, 0), v_sps;
end $$;

-- Atomic "commit a billable scan": increments today's counter only if under the tier limit.
-- Raises 'quota_exceeded' if at/over limit. Call AFTER a successful AI suggest.
create or replace function public.increment_scan_usage(p_user uuid)
returns table(used int, scan_limit int, tier public.subscription_tier)
language plpgsql security definer set search_path = public as $$
declare
  v_tier public.subscription_tier;
  v_limit int;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_used int;
begin
  select p.tier into v_tier from public.profiles p where p.id = p_user;
  if v_tier is null then raise exception 'profile_not_found'; end if;
  select t.daily_scan_limit into v_limit from public.tier_limits t where t.tier = v_tier;

  insert into public.daily_usage (user_id, usage_date, scans_used, suggestions_generated, tier_at_time)
  values (p_user, v_today, 0, 0, v_tier)
  on conflict (user_id, usage_date) do nothing;

  update public.daily_usage d
    set scans_used = d.scans_used + 1,
        suggestions_generated = d.suggestions_generated + 1,
        tier_at_time = v_tier
    where d.user_id = p_user and d.usage_date = v_today and d.scans_used < v_limit
    returning d.scans_used into v_used;

  if v_used is null then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  return query select v_used, v_limit, v_tier;
end $$;

-- Record AI spend for the day (global circuit-breaker accounting). Call after each AI call.
create or replace function public.record_ai_spend(p_est_usd numeric)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_total numeric;
begin
  insert into public.global_spend_counter (usage_date, ai_calls, spend_usd)
  values (v_today, 1, coalesce(p_est_usd, 0))
  on conflict (usage_date) do update
    set ai_calls = public.global_spend_counter.ai_calls + 1,
        spend_usd = public.global_spend_counter.spend_usd + coalesce(p_est_usd, 0),
        updated_at = now()
  returning spend_usd into v_total;
  return v_total;
end $$;
