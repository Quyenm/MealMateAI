-- Allow admin (Supabase dashboard / SQL editor / service role) to change profiles.tier,
-- while still blocking end users (authenticated/anon) from self-upgrading.
create or replace function public.pin_profile_tier()
returns trigger language plpgsql as $$
begin
  if new.tier is distinct from old.tier and current_user in ('authenticated', 'anon') then
    new.tier := old.tier;  -- ignore client attempts to change their own tier
  end if;
  return new;
end $$;
