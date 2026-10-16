-- Luméa V2.2: bounded commercial content and localized Product guidance.

create table public.commercial_content_sections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  visibility public.visibility_status not null default 'DRAFT',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_content_sections_fixed_code check (code in (
    'DELIVERY',
    'RETURNS_REFUNDS',
    'PAYMENT',
    'CONTACT_INQUIRY',
    'FLOWER_CARE_DEFAULT',
    'FRESHNESS_SUBSTITUTION_DEFAULT'
  )),
  constraint commercial_content_sections_visibility check (visibility in ('DRAFT', 'PUBLISHED')),
  constraint commercial_content_sections_sort_order check (sort_order between 0 and 1000)
);

create table public.commercial_content_translations (
  commercial_content_section_id uuid not null references public.commercial_content_sections (id) on delete cascade,
  locale public.locale_code not null,
  title text not null default '',
  summary text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (commercial_content_section_id, locale),
  constraint commercial_content_translations_title_length check (char_length(title) <= 160),
  constraint commercial_content_translations_summary_length check (char_length(summary) <= 600),
  constraint commercial_content_translations_body_length check (char_length(body) <= 12000)
);

create index commercial_content_sections_public_order_idx
  on public.commercial_content_sections (sort_order, id)
  where visibility = 'PUBLISHED';

create trigger commercial_content_sections_set_updated_at
before update on public.commercial_content_sections
for each row execute function public.set_updated_at();

create trigger commercial_content_translations_set_updated_at
before update on public.commercial_content_translations
for each row execute function public.set_updated_at();

create function public.enforce_commercial_content_code_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.code is distinct from new.code then
    raise exception using errcode = '22023', message = 'COMMERCIAL_CONTENT_CODE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger commercial_content_sections_code_immutable
before update of code on public.commercial_content_sections
for each row execute function public.enforce_commercial_content_code_immutable();

alter table public.product_translations
  add column care_instructions text,
  add column freshness_seasonality_note text,
  add column substitution_note text,
  add column fulfillment_note text,
  add constraint product_translations_care_instructions_length
    check (care_instructions is null or char_length(care_instructions) <= 8000),
  add constraint product_translations_freshness_seasonality_note_length
    check (freshness_seasonality_note is null or char_length(freshness_seasonality_note) <= 4000),
  add constraint product_translations_substitution_note_length
    check (substitution_note is null or char_length(substitution_note) <= 4000),
  add constraint product_translations_fulfillment_note_length
    check (fulfillment_note is null or char_length(fulfillment_note) <= 4000);

insert into public.commercial_content_sections (code, visibility, sort_order)
values
  ('DELIVERY', 'DRAFT', 10),
  ('RETURNS_REFUNDS', 'DRAFT', 20),
  ('PAYMENT', 'DRAFT', 30),
  ('CONTACT_INQUIRY', 'DRAFT', 40),
  ('FLOWER_CARE_DEFAULT', 'DRAFT', 50),
  ('FRESHNESS_SUBSTITUTION_DEFAULT', 'DRAFT', 60)
on conflict (code) do nothing;

alter table public.commercial_content_sections enable row level security;
alter table public.commercial_content_translations enable row level security;

revoke all on table public.commercial_content_sections from public, anon, authenticated;
revoke all on table public.commercial_content_translations from public, anon, authenticated;
grant select on table public.commercial_content_sections to anon, authenticated;
grant select on table public.commercial_content_translations to anon, authenticated;

create policy commercial_content_sections_public_read
on public.commercial_content_sections
for select to anon, authenticated
using (visibility = 'PUBLISHED');

create policy commercial_content_sections_admin_read
on public.commercial_content_sections
for select to authenticated
using (public.is_admin());

create policy commercial_content_translations_public_read
on public.commercial_content_translations
for select to anon, authenticated
using (exists (
  select 1
  from public.commercial_content_sections section
  where section.id = commercial_content_translations.commercial_content_section_id
    and section.visibility = 'PUBLISHED'
));

create policy commercial_content_translations_admin_read
on public.commercial_content_translations
for select to authenticated
using (public.is_admin());

create or replace function public.admin_save_commercial_content(
  target_code text,
  target_visibility public.visibility_status,
  target_title_vi text,
  target_summary_vi text,
  target_body_vi text,
  target_title_ko text,
  target_summary_ko text,
  target_body_ko text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_section_id uuid;
  normalized_title_vi text := btrim(coalesce(target_title_vi, ''));
  normalized_summary_vi text := btrim(coalesce(target_summary_vi, ''));
  normalized_body_vi text := btrim(coalesce(target_body_vi, ''));
  normalized_title_ko text := btrim(coalesce(target_title_ko, ''));
  normalized_summary_ko text := btrim(coalesce(target_summary_ko, ''));
  normalized_body_ko text := btrim(coalesce(target_body_ko, ''));
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_COMMERCIAL_CONTENT_FORBIDDEN';
  end if;

  if target_code is null
    or target_code not in (
      'DELIVERY',
      'RETURNS_REFUNDS',
      'PAYMENT',
      'CONTACT_INQUIRY',
      'FLOWER_CARE_DEFAULT',
      'FRESHNESS_SUBSTITUTION_DEFAULT'
    )
    or target_visibility is null
    or target_visibility not in ('DRAFT', 'PUBLISHED')
    or char_length(normalized_title_vi) > 160
    or char_length(normalized_title_ko) > 160
    or char_length(normalized_summary_vi) > 600
    or char_length(normalized_summary_ko) > 600
    or char_length(normalized_body_vi) > 12000
    or char_length(normalized_body_ko) > 12000 then
    raise exception using errcode = '22023', message = 'ADMIN_COMMERCIAL_CONTENT_INVALID';
  end if;

  if target_visibility = 'PUBLISHED' and (
    normalized_title_vi = ''
    or normalized_summary_vi = ''
    or normalized_body_vi = ''
    or normalized_title_ko = ''
    or normalized_summary_ko = ''
    or normalized_body_ko = ''
  ) then
    raise exception using errcode = '22023', message = 'ADMIN_COMMERCIAL_CONTENT_TRANSLATIONS_REQUIRED';
  end if;

  select section.id into saved_section_id
  from public.commercial_content_sections section
  where section.code = target_code
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ADMIN_COMMERCIAL_CONTENT_NOT_FOUND';
  end if;

  insert into public.commercial_content_translations (
    commercial_content_section_id,
    locale,
    title,
    summary,
    body
  ) values
    (saved_section_id, 'vi', normalized_title_vi, normalized_summary_vi, normalized_body_vi),
    (saved_section_id, 'ko', normalized_title_ko, normalized_summary_ko, normalized_body_ko)
  on conflict (commercial_content_section_id, locale) do update set
    title = excluded.title,
    summary = excluded.summary,
    body = excluded.body;

  update public.commercial_content_sections
  set visibility = target_visibility
  where id = saved_section_id;

  return saved_section_id;
end;
$$;

comment on table public.commercial_content_sections is
  'Fixed V2.2 commercial-policy and flower-guidance sections. Layout remains in React.';
comment on table public.commercial_content_translations is
  'Plain-text VI/KO commercial content. Published sections require complete translations.';
comment on function public.admin_save_commercial_content(
  text, public.visibility_status, text, text, text, text, text, text
) is 'ADMIN-only atomic save for one fixed commercial content section and its VI/KO copy.';
comment on function public.enforce_commercial_content_code_immutable() is
  'Prevents canonical V2.2 commercial content identities from being renamed.';

revoke all on function public.enforce_commercial_content_code_immutable()
  from public, anon, authenticated;

revoke all on function public.admin_save_commercial_content(
  text, public.visibility_status, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.admin_save_commercial_content(
  text, public.visibility_status, text, text, text, text, text, text
) to authenticated;
