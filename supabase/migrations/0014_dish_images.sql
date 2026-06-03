-- Cache of resolved dish photos (YouTube cooking-video thumbnails) keyed by a
-- normalized dish title, so each distinct dish costs at most one YouTube search
-- (the free Data API quota is ~100 searches/day). Written via the service role.
create table if not exists public.dish_images (
  title_key   text primary key,
  image_url   text,          -- null = resolved but no match (cached to avoid re-querying)
  credit_url  text,
  created_at  timestamptz not null default now()
);

-- Service-role only. RLS on with no policies = no anon/authenticated access;
-- the admin client (service role) bypasses RLS.
alter table public.dish_images enable row level security;
