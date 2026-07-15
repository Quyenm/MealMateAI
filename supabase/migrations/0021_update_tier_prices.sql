-- Approved production prices (VND). Safe to run repeatedly.
update public.tier_limits set price_vnd = 99000  where tier = 'vip';
update public.tier_limits set price_vnd = 198000 where tier = 'svip';
update public.tier_limits set price_vnd = 499000 where tier = 'family';

do $$
declare
  v_paid_tier_count integer;
  v_correct_price_count integer;
begin
  select count(*)
    into v_paid_tier_count
    from public.tier_limits
   where tier in ('vip', 'svip', 'family');

  select count(*)
    into v_correct_price_count
    from public.tier_limits
   where (tier = 'vip' and price_vnd = 99000)
      or (tier = 'svip' and price_vnd = 198000)
      or (tier = 'family' and price_vnd = 499000);

  if v_paid_tier_count <> 3 or v_correct_price_count <> 3 then
    raise exception
      'tier_limits price verification failed (paid tiers: %, correct prices: %)',
      v_paid_tier_count,
      v_correct_price_count;
  end if;
end
$$;
