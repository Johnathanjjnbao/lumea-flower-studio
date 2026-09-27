drop policy public_media_read on storage.objects;

create policy public_media_catalog_manager_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'public-media'
  and public.is_catalog_manager()
);
