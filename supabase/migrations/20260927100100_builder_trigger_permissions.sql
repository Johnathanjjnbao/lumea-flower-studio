-- Builder publication helpers are intentionally not executable by browser roles.
-- Lifecycle triggers therefore run with the migration owner privileges, matching
-- the established Product lifecycle trigger posture.

alter function public.enforce_flower_stem_lifecycle() security definer;
alter function public.enforce_wrapping_option_lifecycle() security definer;
alter function public.enforce_wrapping_variant_lifecycle() security definer;

revoke all on function public.enforce_flower_stem_lifecycle() from public;
revoke all on function public.enforce_wrapping_option_lifecycle() from public;
revoke all on function public.enforce_wrapping_variant_lifecycle() from public;
