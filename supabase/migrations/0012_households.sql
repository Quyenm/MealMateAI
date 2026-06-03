-- 0012_households.sql
-- Family: a household shares one fridge. A user belongs to at most one household.
-- Members join via a short code. Shared reads use a SECURITY DEFINER helper to
-- look up the caller's household WITHOUT triggering recursive RLS.

create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member', -- owner | member
  joined_at    timestamptz not null default now(),
  primary key (user_id)
);
create index if not exists household_members_hid_idx on public.household_members (household_id);

-- The caller's household id (no RLS recursion: definer reads the table directly).
create or replace function public.my_household_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;
grant execute on function public.my_household_id() to authenticated, service_role;

alter table public.households enable row level security;
drop policy if exists "households_member_select" on public.households;
create policy "households_member_select" on public.households
  for select using (id = public.my_household_id());

alter table public.household_members enable row level security;
drop policy if exists "household_members_select" on public.household_members;
create policy "household_members_select" on public.household_members
  for select using (household_id = public.my_household_id());

-- Shared fridge: tag inventory rows with a household; members can read them.
alter table public.inventory_items add column if not exists household_id uuid
  references public.households(id) on delete set null;
create index if not exists inventory_household_idx on public.inventory_items (household_id);

drop policy if exists "inventory_own_select" on public.inventory_items;
drop policy if exists "inventory_select" on public.inventory_items;
create policy "inventory_select" on public.inventory_items
  for select using (
    user_id = auth.uid() or household_id = public.my_household_id()
  );
