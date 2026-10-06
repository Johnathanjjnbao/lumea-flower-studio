-- Step 15: canonical public site identity and Admin-managed discovery bands.

create table public.site_profile (
  singleton boolean primary key default true,
  business_name text not null,
  phone text,
  email text,
  instagram_url text,
  instagram_handle text,
  updated_at timestamptz not null default now(),
  constraint site_profile_singleton check (singleton),
  constraint site_profile_business_name_length check (char_length(btrim(business_name)) between 2 and 120),
  constraint site_profile_phone_safe check (
    phone is null or (
      char_length(btrim(phone)) between 7 and 30
      and btrim(phone) ~ '^[+]?[0-9][0-9() .-]*$'
    )
  ),
  constraint site_profile_email_safe check (
    email is null or (
      char_length(btrim(email)) between 3 and 254
      and btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    )
  ),
  constraint site_profile_instagram_url_safe check (
    instagram_url is null or btrim(instagram_url) ~* '^https://(www[.])?instagram[.]com/[A-Za-z0-9._-]+/?$'
  ),
  constraint site_profile_instagram_handle_safe check (
    instagram_handle is null or btrim(instagram_handle) ~ '^@[A-Za-z0-9._]{1,30}$'
  )
);

insert into public.site_profile (singleton, business_name, phone)
select true, 'Luméa Flower Studio', nullif(btrim(section.visit_phone), '')
from public.homepage_sections section
where section.section_key = 'visit'
on conflict (singleton) do update
set phone = coalesce(excluded.phone, public.site_profile.phone);

create trigger site_profile_set_updated_at
before update on public.site_profile
for each row execute function public.set_updated_at();

comment on table public.site_profile is
  'Canonical singleton for public business identity and contact fields. Payment and delivery configuration remain in their own protected domains.';

alter table public.site_profile enable row level security;
revoke all on table public.site_profile from anon, authenticated;
grant select on table public.site_profile to anon, authenticated;
grant select, insert, update on table public.site_profile to authenticated;

create policy site_profile_public_read on public.site_profile
for select to anon, authenticated using (singleton);
create policy site_profile_admin_write on public.site_profile
for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.homepage_sections
  drop constraint homepage_sections_visit_fields_scope,
  drop constraint homepage_sections_visit_phone_safe,
  drop column visit_phone;

create table public.budget_ranges (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  min_amount bigint not null default 0,
  max_amount bigint,
  visibility public.visibility_status not null default 'DRAFT',
  sort_order integer not null default 0,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_ranges_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint budget_ranges_min_nonnegative check (min_amount >= 0),
  constraint budget_ranges_max_valid check (max_amount is null or max_amount >= min_amount),
  constraint budget_ranges_amount_safe check (min_amount <= 9999999999999 and (max_amount is null or max_amount <= 9999999999999)),
  constraint budget_ranges_sort_nonnegative check (sort_order >= 0),
  constraint budget_ranges_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint budget_ranges_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.budget_range_translations (
  budget_range_id uuid not null references public.budget_ranges (id) on delete cascade,
  locale public.locale_code not null,
  scale_label text,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (budget_range_id, locale),
  constraint budget_range_translations_scale_length check (scale_label is null or char_length(btrim(scale_label)) between 1 and 80),
  constraint budget_range_translations_label_length check (char_length(btrim(label)) between 1 and 120),
  constraint budget_range_translations_description_length check (description is null or char_length(btrim(description)) <= 300)
);

create index budget_ranges_public_order_idx on public.budget_ranges (sort_order, id)
where visibility = 'PUBLISHED' and archived_at is null;

create trigger budget_ranges_set_updated_at
before update on public.budget_ranges
for each row execute function public.set_updated_at();
create trigger budget_range_translations_set_updated_at
before update on public.budget_range_translations
for each row execute function public.set_updated_at();

alter table public.budget_ranges enable row level security;
alter table public.budget_range_translations enable row level security;
revoke all on table public.budget_ranges, public.budget_range_translations from anon, authenticated;
grant select on table public.budget_ranges, public.budget_range_translations to anon, authenticated;
grant select, insert, update, delete on table public.budget_ranges, public.budget_range_translations to authenticated;

create policy budget_ranges_public_read on public.budget_ranges
for select to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);
create policy budget_ranges_admin_all on public.budget_ranges
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy budget_range_translations_public_read on public.budget_range_translations
for select to anon, authenticated
using (exists (
  select 1 from public.budget_ranges range
  where range.id = budget_range_translations.budget_range_id
    and range.visibility = 'PUBLISHED'
    and range.archived_at is null
));
create policy budget_range_translations_admin_all on public.budget_range_translations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

with source(stable_code, min_amount, max_amount, sort_order) as (values
  ('small', 0::bigint, 499999::bigint, 10),
  ('medium', 500000::bigint, 799999::bigint, 20),
  ('large', 800000::bigint, 1200000::bigint, 30),
  ('statement', 1200001::bigint, null::bigint, 40)
)
insert into public.budget_ranges (stable_code, min_amount, max_amount, visibility, sort_order, published_at)
select stable_code, min_amount, max_amount, 'PUBLISHED', sort_order, now() from source
on conflict (stable_code) do nothing;

insert into public.budget_range_translations (budget_range_id, locale, scale_label, label, description)
select range.id, copy.locale::public.locale_code, copy.scale_label, copy.label, copy.description
from public.budget_ranges range
join (values
  ('small', 'vi', 'Nhẹ nhàng', 'Dưới 500k', 'Một lời nhỏ, thật dịu dàng'),
  ('small', 'ko', '라이트', '500k 미만', '부드러운 마음 한마디'),
  ('medium', 'vi', 'Signature', '500–800k', 'Đủ đầy cho một khoảnh khắc đáng nhớ'),
  ('medium', 'ko', '시그니처', '500–800k', '기억할 순간을 위한 풍성함'),
  ('large', 'vi', 'Đầy đặn', '800k–1.2m', 'Nhiều tầng hoa, nhiều dư âm'),
  ('large', 'ko', '풍성하게', '800k–1.2m', '여러 겹의 플라워 구성'),
  ('statement', 'vi', 'Statement', 'Trên 1.2m', 'Một ấn tượng được trao tận tay'),
  ('statement', 'ko', '스테이트먼트', '1.2m 초과', '첫눈에 전해지는 인상')
) as copy(stable_code, locale, scale_label, label, description)
  on copy.stable_code = range.stable_code
on conflict (budget_range_id, locale) do nothing;

comment on table public.budget_ranges is
  'Admin-managed discovery bands. Bounds filter catalog prices but never alter product pricing.';
