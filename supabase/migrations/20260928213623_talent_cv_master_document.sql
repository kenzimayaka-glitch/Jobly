alter table public."User"
  add column if not exists "cvOriginalStoragePath" text,
  add column if not exists "cvOriginalFileName" text,
  add column if not exists "cvOriginalPageCount" integer,
  add column if not exists "cvOriginalUploadedAt" timestamptz;

insert into storage.buckets (id, name, public)
values ('talent-cvs', 'talent-cvs', false)
on conflict (id) do nothing;

drop policy if exists "talent_cv_insert_own" on storage.objects;
create policy "talent_cv_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'talent-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "talent_cv_select_own" on storage.objects;
create policy "talent_cv_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'talent-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "talent_cv_update_own" on storage.objects;
create policy "talent_cv_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'talent-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'talent-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "talent_cv_delete_own" on storage.objects;
create policy "talent_cv_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'talent-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
