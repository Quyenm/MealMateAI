-- Community moderation: let users report a post; auto-hide it once enough
-- distinct users report it. Reports are de-duped per (post, reporter).
alter table public.community_posts add column if not exists hidden boolean not null default false;

create table if not exists public.community_reports (
  post_id     uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

-- Service-role only (writes go through the API). RLS on with no policies.
alter table public.community_reports enable row level security;
