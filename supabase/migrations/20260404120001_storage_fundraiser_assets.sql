-- Supabase Storage (platform `storage` schema). Not part of `fundraiser_app` data model.
-- App code uses `supabase.storage` for uploads; DB policies live here.

insert into storage.buckets (id, name, public)
values ('fundraiser-assets', 'fundraiser-assets', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated upload own prefix" on storage.objects;
drop policy if exists "Authenticated update own prefix" on storage.objects;
drop policy if exists "Authenticated delete own prefix" on storage.objects;
drop policy if exists "Public read fundraiser assets" on storage.objects;

create policy "Authenticated upload own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fundraiser-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Authenticated update own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'fundraiser-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Authenticated delete own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fundraiser-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Public read fundraiser assets"
  on storage.objects
  for select
  to public
  using (bucket_id = 'fundraiser-assets');
