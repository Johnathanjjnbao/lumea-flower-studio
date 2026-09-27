insert into storage.buckets (
  id,
  name,
  public,
  allowed_mime_types
)
values
  (
    'public-media',
    'public-media',
    true,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'private-uploads',
    'private-uploads',
    false,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do update
set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types;

create policy public_media_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'public-media');

create policy public_media_catalog_manager_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-media'
  and public.is_catalog_manager()
  and (storage.foldername(name))[1] in (
    'products',
    'occasions',
    'site',
    'homepage',
    'gallery',
    'flowers',
    'wrapping'
  )
);

create policy public_media_catalog_manager_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-media'
  and public.is_catalog_manager()
)
with check (
  bucket_id = 'public-media'
  and public.is_catalog_manager()
  and (storage.foldername(name))[1] in (
    'products',
    'occasions',
    'site',
    'homepage',
    'gallery',
    'flowers',
    'wrapping'
  )
);

create policy public_media_catalog_manager_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-media'
  and public.is_catalog_manager()
);

create policy private_uploads_catalog_manager_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-uploads'
  and public.is_catalog_manager()
);

create policy private_uploads_catalog_manager_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-uploads'
  and public.is_catalog_manager()
  and (storage.foldername(name))[1] = 'custom-requests'
);

create policy private_uploads_catalog_manager_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private-uploads'
  and public.is_catalog_manager()
)
with check (
  bucket_id = 'private-uploads'
  and public.is_catalog_manager()
  and (storage.foldername(name))[1] = 'custom-requests'
);

create policy private_uploads_catalog_manager_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private-uploads'
  and public.is_catalog_manager()
);
