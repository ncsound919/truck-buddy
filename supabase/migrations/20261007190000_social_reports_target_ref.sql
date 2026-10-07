-- Moderation reports may target content whose id is not a uuid (seed/demo ids
-- like "post-2"). Keep the real reference in target_ref; target_id stays a uuid.

alter table public.reports add column if not exists target_ref text;
create index if not exists idx_reports_target_ref on public.reports(target_ref);
