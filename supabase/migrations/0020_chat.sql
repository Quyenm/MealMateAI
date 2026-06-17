-- AI cooking chatbot — per-tier daily message cap. No chat history is stored
-- (conversations are ephemeral, kept client-side within a session); we only count
-- messages per user per day to enforce the tier limit.

-- 1) Chat limit becomes a tier attribute (shows up in admin config + upgrade page).
--    -1 = unlimited (still bounded by the global spend cap).
alter table public.tier_limits add column if not exists daily_chat_limit int not null default 5;
update public.tier_limits set daily_chat_limit =
  case tier when 'free' then 5 when 'vip' then 50 when 'svip' then -1 when 'family' then -1 else 5 end;

-- 2) Per-user daily counter (VN day). RLS: read own; writes only via the RPC (service role).
create table if not exists public.chat_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  count      int  not null default 0,
  primary key (user_id, usage_date)
);
alter table public.chat_usage enable row level security;
drop policy if exists chat_usage_select_own on public.chat_usage;
create policy chat_usage_select_own on public.chat_usage
  for select to authenticated using (user_id = auth.uid());

-- 3) Atomic check-and-increment. Returns ok=false (without incrementing) when the
--    user has hit today's tier limit. limit = -1 means unlimited.
create or replace function public.bump_chat_usage(p_user uuid)
returns table(ok boolean, used int, chat_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier  public.subscription_tier;
  v_limit int;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_used  int;
begin
  select tier into v_tier from public.profiles where id = p_user;
  select daily_chat_limit into v_limit from public.tier_limits where tier = coalesce(v_tier, 'free');
  v_limit := coalesce(v_limit, 5);

  insert into public.chat_usage(user_id, usage_date, count) values (p_user, v_today, 0)
    on conflict (user_id, usage_date) do nothing;
  select count into v_used from public.chat_usage
    where user_id = p_user and usage_date = v_today for update;

  if v_limit >= 0 and v_used >= v_limit then
    return query select false, v_used, v_limit;
    return;
  end if;

  update public.chat_usage set count = count + 1
    where user_id = p_user and usage_date = v_today;
  return query select true, v_used + 1, v_limit;
end $$;

revoke all on function public.bump_chat_usage(uuid) from public, anon, authenticated;
grant execute on function public.bump_chat_usage(uuid) to service_role;
