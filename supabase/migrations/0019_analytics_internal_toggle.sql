-- Make internal-traffic exclusion OPTIONAL.
-- 0018 always excluded admin/internal visitors, which means an early-stage product
-- (where the only visitor is the owner) shows all-zeros. Add a p_include_internal
-- flag so the dashboard can show all traffic (default) or real-users-only (toggle).
-- This is a standard "include/exclude internal traffic" analytics filter — it changes
-- WHICH real events are counted, it does not fabricate any data.

drop function if exists public.admin_analytics_summary(timestamptz);

create or replace function public.admin_analytics_summary(
  p_since timestamptz,
  p_include_internal boolean default true
)
returns jsonb
language sql
stable
as $$
with
admin_visitors as (
  select distinct e.visitor_id
  from public.analytics_events e
  join public.profiles p on p.id = e.user_id
  where p.is_admin = true
),
ev as (
  select e.*
  from public.analytics_events e
  where e.created_at >= p_since
    and (p_include_internal or e.visitor_id not in (select visitor_id from admin_visitors))
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

revoke all on function public.admin_analytics_summary(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.admin_analytics_summary(timestamptz, boolean) to service_role;
