-- 0003_storage_buckets.sql
-- Storage buckets + policies (05b §3).
--   advisor-credentials : PRIVATE — only the uploading advisor + OPS can read
--   avatars             : public-read, owner-write

insert into storage.buckets (id, name, public)
values ('advisor-credentials', 'advisor-credentials', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Convention: object path is prefixed with the owner's user id, e.g.
--   advisor-credentials/<auth.uid()::text>/license.pdf
-- so ownership is the first path segment.

-- advisor-credentials: read own or OPS; write own.
create policy credentials_read on storage.objects
  for select using (
    bucket_id = 'advisor-credentials'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_ops())
  );

create policy credentials_write on storage.objects
  for insert with check (
    bucket_id = 'advisor-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: public read; owner write.
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_owner_write on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
