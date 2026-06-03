-- Community: users share a photo of a dish they just cooked. This is the ONE
-- place the app stores user photos, and only ones the user explicitly posts —
-- fridge scan photos are still never stored.

create table if not exists public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  dish_title  text not null,
  note        text,
  image_url   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists community_posts_created_idx
  on public.community_posts (created_at desc);

alter table public.community_posts enable row level security;

-- Anyone signed in can read the feed.
drop policy if exists "community_posts_read" on public.community_posts;
create policy "community_posts_read"
  on public.community_posts for select
  using (true);

-- A user can delete their own post (inserts go through the service role in the API).
drop policy if exists "community_posts_own_delete" on public.community_posts;
create policy "community_posts_own_delete"
  on public.community_posts for delete
  using (user_id = auth.uid());

-- Public Storage bucket for the shared photos. Uploads happen via the service
-- role (scoped to <user_id>/ paths in code); reads are public for the feed.
insert into storage.buckets (id, name, public)
values ('community', 'community', true)
on conflict (id) do nothing;
