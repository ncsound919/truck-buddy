-- ============================================================================
-- 0009 — Realtime: add social tables to the supabase_realtime publication.
-- ============================================================================
-- Supabase Realtime `postgres_changes` only streams tables that are members of
-- the `supabase_realtime` publication. The social client subscribes to these
-- for live feeds, convoys, the member map and notifications.
--
-- Idempotent: safe to re-run.
-- ============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'groups', 'group_members', 'posts', 'post_media', 'comments',
    'likes', 'road_statuses', 'road_status_reactions', 'road_reports',
    'safety_reports', 'safety_report_votes', 'convoys', 'convoy_members',
    'convoy_messages', 'member_locations', 'mileage_entries', 'mileage_proofs',
    'listings', 'notifications'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
