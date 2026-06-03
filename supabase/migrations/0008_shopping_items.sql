-- 0008_shopping_items.sql
-- Shopping list: items the user needs to buy (often the "also needs" missing
-- ingredients of a near-cookable dish). Writes go through the service-role
-- client scoped to the user; the select policy lets a Server Component read.
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_user_idx
  on public.shopping_items (user_id, created_at desc);

alter table public.shopping_items enable row level security;
drop policy if exists "shopping_items_own_select" on public.shopping_items;
create policy "shopping_items_own_select" on public.shopping_items
  for select using (user_id = auth.uid());
