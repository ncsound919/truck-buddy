-- Moderation fixes (audit): publish the moderation tables to Realtime and let
-- moderators actually remove reported content.

-- 1) Realtime: reports/moderation_actions/listing_media were not published, so
--    subscribeLiveReports never fired.
do $$ begin alter publication supabase_realtime add table public.reports; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.moderation_actions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.listing_media; exception when duplicate_object then null; end $$;

-- 2) Moderators may hide content (set is_removed). RLS already lets signed-in
--    users read these rows; these policies add the moderator write path.
do $$ begin
  create policy "Moderators hide posts" on public.posts
    for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Moderators hide listings" on public.listings
    for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Moderators hide road reports" on public.road_reports
    for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
exception when duplicate_object then null; end $$;
