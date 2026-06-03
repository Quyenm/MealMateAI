-- 0011_macro_log.sql
-- Nutrition tracking: log a dish's macros to a day (auto-logged when you finish
-- cooking) and a per-user daily kcal goal on profiles. Writes via service-role
-- scoped to the user; daily_kcal_goal is a plain column the pin trigger ignores.
create table if not exists public.macro_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null,
  dish_title text not null,
  kcal       int not null default 0,
  protein_g  int not null default 0,
  carbs_g    int not null default 0,
  fat_g      int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists macro_log_user_date_idx
  on public.macro_log (user_id, log_date);

alter table public.macro_log enable row level security;
drop policy if exists "macro_log_own_select" on public.macro_log;
create policy "macro_log_own_select" on public.macro_log
  for select using (user_id = auth.uid());

alter table public.profiles add column if not exists daily_kcal_goal int;
