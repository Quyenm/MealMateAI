-- 0010_meal_plan.sql
-- Weekly meal planning: assign saved dishes to days. Each row is one dish on one
-- date (a day can hold several). Writes via service-role scoped to the user.
create table if not exists public.meal_plan_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  plan_date  date not null,
  dish       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists meal_plan_user_date_idx
  on public.meal_plan_items (user_id, plan_date);

alter table public.meal_plan_items enable row level security;
drop policy if exists "meal_plan_own_select" on public.meal_plan_items;
create policy "meal_plan_own_select" on public.meal_plan_items
  for select using (user_id = auth.uid());
