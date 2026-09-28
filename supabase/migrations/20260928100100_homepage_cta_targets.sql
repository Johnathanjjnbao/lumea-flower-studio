-- Preserve the approved Hero CTA, which opens the fixed Best Sellers chapter.
alter table public.homepage_sections
  drop constraint homepage_sections_primary_cta_safe;

alter table public.homepage_sections
  add constraint homepage_sections_primary_cta_safe check (
    primary_cta_target is null or primary_cta_target in (
      '/flowers', '/create-bouquet', '/flowers?sameDay=true',
      '#best-sellers', '#florist-choice', '#custom', '#gallery', '#visit'
    )
  );
