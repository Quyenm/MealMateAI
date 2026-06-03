-- 0006_approve_payment_rpc.sql
-- Make admin payment approval ATOMIC. The /api/admin/payment route used to do
-- four separate writes (expire old sub -> insert new sub -> upgrade tier ->
-- mark paid); a failure between them left the user half-upgraded. Wrap them in
-- one SECURITY DEFINER function so it all commits or nothing does.
--
-- SECURITY DEFINER runs as the function owner (not 'authenticated'/'anon'), so
-- the tier-pin trigger (0003) allows the profiles.tier change. Idempotent: a
-- payment already 'paid' is a no-op, so a double-approve can't double-grant.

create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid;
  v_tier   public.subscription_tier;
  v_status public.payment_status;
begin
  select user_id, tier_purchased, status
    into v_user, v_tier, v_status
    from public.payments
   where id = p_payment_id
   for update;

  if v_user is null then
    raise exception 'payment_not_found';
  end if;
  if v_status = 'paid' then
    return; -- already approved
  end if;

  update public.subscriptions
     set status = 'expired'
   where user_id = v_user and status = 'active';

  insert into public.subscriptions (user_id, tier, status, current_period_end)
  values (v_user, v_tier, 'active', now() + interval '30 days');

  update public.profiles set tier = v_tier where id = v_user;

  update public.payments
     set status = 'paid', paid_at = now()
   where id = p_payment_id;
end $$;

grant execute on function public.approve_payment(uuid) to service_role;
