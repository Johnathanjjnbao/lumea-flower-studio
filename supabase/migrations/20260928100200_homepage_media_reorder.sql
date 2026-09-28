create or replace function public.reorder_homepage_section_media(
  target_section_id uuid,
  target_media_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  supplied_count integer;
  matched_count integer;
  active_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  supplied_count := coalesce(array_length(target_media_ids, 1), 0);
  if supplied_count = 0 or supplied_count > 10 then
    raise exception 'Gallery order requires between 1 and 10 media items';
  end if;

  select count(distinct id)
  into matched_count
  from public.homepage_section_media
  where homepage_section_id = target_section_id
    and active
    and id = any(target_media_ids);

  select count(*)
  into active_count
  from public.homepage_section_media
  where homepage_section_id = target_section_id
    and active;

  if matched_count <> supplied_count or active_count <> supplied_count then
    raise exception 'Media order contains invalid or inactive items';
  end if;

  update public.homepage_section_media
  set sort_order = sort_order + 10000
  where homepage_section_id = target_section_id
    and active;

  update public.homepage_section_media placement
  set sort_order = requested.ordinality * 10
  from unnest(target_media_ids) with ordinality as requested(id, ordinality)
  where placement.id = requested.id
    and placement.homepage_section_id = target_section_id
    and placement.active;
end;
$$;

revoke all on function public.reorder_homepage_section_media(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_homepage_section_media(uuid, uuid[]) to authenticated;
