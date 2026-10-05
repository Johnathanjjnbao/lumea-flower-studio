-- Step 14 follow-up: structured, Admin-managed Visit location and Google Maps configuration.

alter table public.homepage_sections
  add column visit_phone text,
  add column visit_map_enabled boolean not null default false,
  add column visit_map_query text,
  add column visit_google_maps_url text,
  add constraint homepage_sections_visit_phone_safe check (
    visit_phone is null or (
      char_length(btrim(visit_phone)) between 7 and 30
      and btrim(visit_phone) ~ '^[+]?[0-9][0-9() .-]*$'
    )
  ),
  add constraint homepage_sections_visit_map_query_safe check (
    visit_map_query is null or char_length(btrim(visit_map_query)) between 3 and 300
  ),
  add constraint homepage_sections_visit_google_maps_url_safe check (
    visit_google_maps_url is null or (
      btrim(visit_google_maps_url) ~ '^https://(www[.]google[.]com|google[.]com|maps[.]google[.]com)/maps([/?].*)?$'
      or btrim(visit_google_maps_url) ~ '^https://maps[.]app[.]goo[.]gl/[^[:space:]]+$'
      or btrim(visit_google_maps_url) ~ '^https://goo[.]gl/maps/[^[:space:]]+$'
    )
  ),
  add constraint homepage_sections_visit_map_ready check (
    not visit_map_enabled or (
      section_key = 'visit'
      and nullif(btrim(visit_map_query), '') is not null
      and nullif(btrim(visit_google_maps_url), '') is not null
    )
  ),
  add constraint homepage_sections_visit_fields_scope check (
    section_key = 'visit' or (
      visit_phone is null
      and not visit_map_enabled
      and visit_map_query is null
      and visit_google_maps_url is null
    )
  );

comment on column public.homepage_sections.visit_phone is
  'Optional customer-visible studio phone for the Visit section. The client derives a tel URL after validation.';
comment on column public.homepage_sections.visit_map_enabled is
  'Controls whether the Visit section renders a Google Maps embed.';
comment on column public.homepage_sections.visit_map_query is
  'Structured address or place query used to generate a fixed-origin Google Maps embed URL.';
comment on column public.homepage_sections.visit_google_maps_url is
  'Validated HTTPS Google Maps destination opened by the directions CTA. Raw iframe HTML is never stored.';
