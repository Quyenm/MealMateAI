-- MealMate AI — self-hosted web analytics (traffic + behaviour + conversion).
-- Events are written ONLY by the server (service role) via /api/analytics/track.
-- RLS is enabled with NO client policy → anon/authenticated can neither read nor write
-- (same pattern as global_spend_counter). The admin dashboard reads via the RPC below
-- using the service-role key.

create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  visitor_id   text not null,                 -- localStorage id, stable per device → new vs returning
  session_id   text not null,                 -- sessionStorage id, resets after 30 min idle
  user_id      uuid references auth.users(id) on delete set null,  -- set when the visitor is signed in
  type         text not null check (type in ('pageview', 'scroll', 'click')),
  path         text not null,
  referrer     text,                          -- document.referrer (first pageview of the session)
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  scroll_depth smallint check (scroll_depth between 0 and 100),  -- max scroll % (type = 'scroll' only)
  created_at   timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id);

alter table public.analytics_events enable row level security;
-- No policy on purpose: only the service role (server) may touch this table.

-- Aggregation for /admin/analytics over a time window. Admin/internal traffic is
-- excluded (any visitor whose user_id is an admin) so the numbers reflect real users.
-- Called server-side with the service-role key only.
create or replace function public.admin_analytics_summary(p_since timestamptz)
returns jsonb
language sql
stable
as $$
with
admin_visitors as (
  -- Drop the entire footprint of any visitor who is (or became) an admin.
  select distinct e.visitor_id
  from public.analytics_events e
  join public.profiles p on p.id = e.user_id
  where p.is_admin = true
),
ev as (
  select e.*
  from public.analytics_events e
  where e.created_at >= p_since
    and e.visitor_id not in (select visitor_id from admin_visitors)
),
sess as (
  select
    session_id,
    count(*) filter (where type = 'pageview') as pageviews,
    min(created_at) as first_at,
    max(created_at) as last_at
  from ev
  group by session_id
),
win_visitors as (
  select distinct visitor_id from ev
),
visitor_first as (
  -- First-ever event per in-window visitor across ALL history → new vs returning.
  select e.visitor_id, min(e.created_at) as first_ever
  from public.analytics_events e
  where e.visitor_id in (select visitor_id from win_visitors)
  group by e.visitor_id
),
visitor_user as (
  select distinct visitor_id, user_id from ev where user_id is not null
),
paid_visitors as (
  select distinct vu.visitor_id
  from visitor_user vu
  join public.payments pay on pay.user_id = vu.user_id and pay.status = 'paid'
),
sources as (
  select
    coalesce(
      nullif(utm_source, ''),
      nullif(split_part(regexp_replace(referrer, '^https?://(www\.)?', ''), '/', 1), ''),
      'direct'
    ) as source,
    count(*) as hits
  from ev
  where type = 'pageview'
  group by 1
  order by hits desc
  limit 8
),
daily as (
  select
    to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as d,
    count(distinct session_id) as sessions
  from ev
  group by 1
)
select jsonb_build_object(
  'sessions', (select count(*) from sess),
  'visitors', (select count(*) from win_visitors),
  'new_visitors', (select count(*) from visitor_first where first_ever >= p_since),
  'returning_visitors', (select count(*) from visitor_first where first_ever < p_since),
  'bounce_rate', coalesce(
    (select (count(*) filter (where pageviews <= 1))::numeric / nullif(count(*), 0) from sess), 0),
  'avg_session_seconds', coalesce(
    (select avg(extract(epoch from (last_at - first_at))) from sess), 0),
  'pages_per_session', coalesce(
    (select sum(pageviews)::numeric / nullif(count(*), 0) from sess), 0),
  'avg_scroll_depth', coalesce(
    (select avg(scroll_depth) from ev where type = 'scroll' and scroll_depth is not null), 0),
  'signup_conversion', coalesce(
    (select count(distinct visitor_id) from visitor_user)::numeric
      / nullif((select count(*) from win_visitors), 0), 0),
  'paid_conversion', coalesce(
    (select count(*) from paid_visitors)::numeric
      / nullif((select count(*) from win_visitors), 0), 0),
  'top_sources', coalesce(
    (select jsonb_agg(jsonb_build_object('source', source, 'hits', hits) order by hits desc) from sources), '[]'::jsonb),
  'daily', coalesce(
    (select jsonb_agg(jsonb_build_object('d', d, 'sessions', sessions)) from daily), '[]'::jsonb)
);
$$;

-- Only the server (service role) may run the aggregation. EXECUTE is granted to
-- PUBLIC by default, so revoke that (not just anon/authenticated) then re-grant
-- to service_role only.
revoke all on function public.admin_analytics_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_analytics_summary(timestamptz) to service_role;
