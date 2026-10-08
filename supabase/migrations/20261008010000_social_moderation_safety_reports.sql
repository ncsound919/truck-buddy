-- Moderation: the social app stores road truth in public.safety_reports, but the
-- "remove content" path and the moderator RLS were pointed at public.road_reports
-- (a different table). Add the missing moderator update policy on safety_reports
-- so a moderator can actually hide a reported advisory.
--
-- Companion code fix: resolveLiveReport now maps road_report -> safety_reports.

do $$ begin
  create policy "Moderators hide safety reports" on public.safety_reports
    for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
exception when duplicate_object then null; end $$;
