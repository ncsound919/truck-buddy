-- ============================================================================
-- 0010 — Shared road reports: public read for the cab app.
-- ============================================================================
-- The cab app (Expo) talks to the shared project with the anon key and has no
-- driver session yet. Road advisories (scale/parking/shipper/fuel/weather/
-- inspection) are public-safety information, so anonymous SELECT is granted on
-- active, non-removed rows only. Writes and all other social tables stay
-- authenticated-only.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.road_reports enable row level security;

do $$ begin
  create policy "Anon reads active road reports"
    on public.road_reports for select to anon
    using (is_removed = false);
exception when duplicate_object then null; end $$;

-- Keep the cab app's query cheap (active advisories, newest first).
create index if not exists idx_road_reports_feed
  on public.road_reports (created_at desc) where is_removed = false;
