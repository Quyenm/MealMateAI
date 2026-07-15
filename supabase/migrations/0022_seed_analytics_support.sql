-- Explicit ownership for auditable, retry-safe synthetic analytics batches.
alter table public.analytics_events
  add column if not exists is_synthetic boolean not null default false,
  add column if not exists seed_batch text,
  add column if not exists seed_event_key text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.analytics_events'::regclass
       and conname = 'analytics_events_synthetic_ownership_check'
  ) then
    alter table public.analytics_events
      add constraint analytics_events_synthetic_ownership_check
      check (
        (
          is_synthetic
          and seed_batch is not null
          and seed_event_key is not null
        )
        or
        (
          not is_synthetic
          and seed_batch is null
          and seed_event_key is null
        )
      ) not valid;
  end if;
end
$$;

alter table public.analytics_events
  validate constraint analytics_events_synthetic_ownership_check;

do $$
declare
  v_constraint_definition text;
  v_constraint_validated boolean;
begin
  select
      lower(regexp_replace(pg_get_constraintdef(oid, true), '[[:space:]()]', '', 'g')),
      convalidated
    into v_constraint_definition, v_constraint_validated
    from pg_constraint
   where conrelid = 'public.analytics_events'::regclass
     and conname = 'analytics_events_synthetic_ownership_check'
     and contype = 'c';

  if v_constraint_definition is distinct from
       'checkis_syntheticandseed_batchisnotnullandseed_event_keyisnotnullornotis_syntheticandseed_batchisnullandseed_event_keyisnull'
     or v_constraint_validated is distinct from true then
    raise exception
      'analytics_events_synthetic_ownership_check has an unexpected definition or is not validated';
  end if;
end
$$;

-- Deliberately non-concurrent: Supabase migration runners may wrap this file in a
-- transaction, while CREATE INDEX CONCURRENTLY is forbidden inside transactions.
create unique index if not exists analytics_events_seed_event_key_unique
  on public.analytics_events (seed_event_key)
  where seed_event_key is not null;

do $$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_class index_relation on index_relation.oid = i.indexrelid
      join pg_am access_method on access_method.oid = index_relation.relam
     where i.indexrelid = to_regclass('public.analytics_events_seed_event_key_unique')
       and i.indrelid = 'public.analytics_events'::regclass
       and i.indisunique
       and i.indisvalid
       and i.indisready
       and i.indnkeyatts = 1
       and i.indnatts = 1
       and access_method.amname = 'btree'
       and pg_get_indexdef(i.indexrelid, 1, true) = 'seed_event_key'
       and lower(regexp_replace(
             pg_get_expr(i.indpred, i.indrelid),
             '[[:space:]()]',
             '',
             'g'
           )) = 'seed_event_keyisnotnull'
  ) then
    raise exception
      'analytics_events_seed_event_key_unique has an unexpected definition or is invalid';
  end if;
end
$$;

create index if not exists analytics_events_seed_batch_idx
  on public.analytics_events (seed_batch)
  where seed_batch is not null;
