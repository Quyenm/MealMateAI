-- Admin flag + extend the pin trigger so clients can't self-escalate tier OR is_admin.
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.pin_profile_tier()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.tier is distinct from old.tier then
      new.tier := old.tier;        -- block self-upgrade of tier
    end if;
    if new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin; -- block self-promotion to admin
    end if;
  end if;
  return new;
end $$;

-- Make yourself admin (run once, with YOUR app login email):
--   update public.profiles set is_admin = true where email = 'you@example.com';
