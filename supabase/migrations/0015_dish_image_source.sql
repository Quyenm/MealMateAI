-- Track WHERE a cached dish photo came from, so a generic Pexels fallback (saved
-- while YouTube was over quota) can be auto-upgraded to a real YouTube thumbnail
-- on a later day, while a good YouTube result is kept permanently.
alter table public.dish_images add column if not exists source text; -- 'youtube' | 'pexels' | null (miss)
