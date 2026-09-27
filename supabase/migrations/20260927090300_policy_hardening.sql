revoke all on function public.set_updated_at() from public;
revoke all on function public.enforce_product_lifecycle() from public;
revoke all on function public.product_publication_issues(uuid) from public;

drop policy media_assets_catalog_manager_all on public.media_assets;

create policy media_assets_catalog_manager_all
on public.media_assets
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());
