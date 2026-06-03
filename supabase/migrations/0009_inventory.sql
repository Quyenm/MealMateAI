-- 0009_inventory.sql
-- "Tủ lạnh" / fridge inventory: a persistent list of what the user has at home,
-- with an optional expiry date so the app can surface about-to-spoil items
-- (FIFO) and deduct ingredients after cooking. Items are added from a scan's
-- confirmed ingredients or manually. Writes via service-role scoped to the user.
create table if not exists public.inventory_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  name_en     text,
  amount      text,            -- coarse: low | medium | high (or null)
  expiry_date date,            -- nullable
  added_at    timestamptz not null default now()
);

create index if not exists inventory_user_expiry_idx
  on public.inventory_items (user_id, expiry_date);

alter table public.inventory_items enable row level security;
drop policy if exists "inventory_own_select" on public.inventory_items;
create policy "inventory_own_select" on public.inventory_items
  for select using (user_id = auth.uid());
