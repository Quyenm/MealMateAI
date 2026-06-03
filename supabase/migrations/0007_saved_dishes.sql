-- 0007_saved_dishes.sql
-- Favorites: a user saves a suggested dish to cook later. Stores a full snapshot
-- of the dish JSON so the favorites page renders without re-querying the scan
-- (and survives the scan being deleted). Writes go through the service-role
-- client (scoped to the user in the route); the select policy lets the user
-- read their own saved dishes from a Server Component.
create table if not exists public.saved_dishes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  scan_id     uuid references public.scans(id) on delete set null,
  dish_index  int  not null,
  dish        jsonb not null,
  created_at  timestamptz not null default now(),
  unique (user_id, scan_id, dish_index)
);

create index if not exists saved_dishes_user_created_idx
  on public.saved_dishes (user_id, created_at desc);

alter table public.saved_dishes enable row level security;
drop policy if exists "saved_dishes_own_select" on public.saved_dishes;
create policy "saved_dishes_own_select" on public.saved_dishes
  for select using (user_id = auth.uid());
