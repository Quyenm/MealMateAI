-- Public Storage bucket for user avatars (profiles.avatar_url already exists).
-- Uploads go through the service role, scoped to <user_id>.<ext>; reads are public.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
