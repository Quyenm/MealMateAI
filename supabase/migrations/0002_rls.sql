-- MealMate AI — v1 Row Level Security
-- Run AFTER 0001_init.sql. The service_role key bypasses RLS (server writes);
-- these policies only constrain the `anon` / `authenticated` roles (the browser).
-- Default-deny: enabling RLS with no matching policy blocks the operation.

alter table public.profiles            enable row level security;
alter table public.tier_limits         enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.daily_usage         enable row level security;
alter table public.global_spend_counter enable row level security;
alter table public.scans               enable row level security;
alter table public.scan_ingredients    enable row level security;
alter table public.suggestions         enable row level security;
alter table public.ratings             enable row level security;
alter table public.payments            enable row level security;

-- profiles: read + update own row (tier changes are pinned by trg_pin_profile_tier).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- tier_limits: public read (pricing), no client write.
drop policy if exists tier_limits_read on public.tier_limits;
create policy tier_limits_read on public.tier_limits
  for select to anon, authenticated using (true);

-- subscriptions: read own only; writes are service-role (webhook).
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

-- daily_usage: read own (for "scans left" display); increments are service-role functions.
drop policy if exists daily_usage_select_own on public.daily_usage;
create policy daily_usage_select_own on public.daily_usage
  for select to authenticated using (user_id = auth.uid());

-- global_spend_counter: NO client access at all (service role only). RLS on + no policy = blocked.

-- scans / scan_ingredients / suggestions: read own; writes are service-role (server persists them).
drop policy if exists scans_select_own on public.scans;
create policy scans_select_own on public.scans
  for select to authenticated using (user_id = auth.uid());

drop policy if exists scan_ingredients_select_own on public.scan_ingredients;
create policy scan_ingredients_select_own on public.scan_ingredients
  for select to authenticated using (user_id = auth.uid());

drop policy if exists suggestions_select_own on public.suggestions;
create policy suggestions_select_own on public.suggestions
  for select to authenticated using (user_id = auth.uid());

-- ratings: full own-row access (client may rate directly).
drop policy if exists ratings_select_own on public.ratings;
create policy ratings_select_own on public.ratings
  for select to authenticated using (user_id = auth.uid());
drop policy if exists ratings_insert_own on public.ratings;
create policy ratings_insert_own on public.ratings
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists ratings_update_own on public.ratings;
create policy ratings_update_own on public.ratings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- payments: read own receipts only; writes are service-role (verified webhook).
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated using (user_id = auth.uid());
