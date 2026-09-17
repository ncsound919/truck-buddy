-- ============================================================================
-- 0006 — Hardening pass after the social migrations.
-- ============================================================================
-- Resolves the Supabase database advisors raised by migrations 0001–0005:
--   * ERROR  rls_disabled_in_public          -> stripe_webhook_events
--   * WARN   function_search_path_mutable     -> update_updated_at, get_feed
--   * WARN   security_definer_function_executable -> revoke EXECUTE from
--            anon/authenticated where trigger-only, and from anon for the
--            RLS helpers (which still need authenticated EXECUTE).
--   * WARN   multiple_permissive_policies     -> drop the now-redundant
--            portal "Users read own profile" policy.
--   * INFO   unindexed_foreign_keys           -> covering indexes.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- stripe_webhook_events is server-only (service role); enable RLS with no
-- policies so PostgREST can never reach it with anon/authenticated.
-- ---------------------------------------------------------------------------
alter table public.stripe_webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: the broad policy supersedes the portal's self-read policy.
-- ---------------------------------------------------------------------------
drop policy if exists "Users read own profile" on public.profiles;

-- ---------------------------------------------------------------------------
-- Pin search_path on functions the advisors flagged.
-- ---------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.get_feed(
  p_cursor timestamptz default null,
  p_limit int default 20
)
returns setof public.posts
language sql stable security invoker
set search_path = public, pg_temp
as $$
  select p.*
  from public.posts p
  left join public.follows f
    on f.following_id = p.author_id
   and f.follower_id = auth.uid()
  where not p.is_removed
    and p.group_id is null
    and p.created_at < coalesce(p_cursor, now())
    and (
      f.follower_id is not null
      or p.created_at > now() - interval '72 hours'
    )
  order by
    (p.like_count + p.comment_count * 2) desc,
    p.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- Lock down function execution.
--   * Trigger functions never need a direct EXECUTE grant.
--   * RLS helpers must stay executable by `authenticated` (policies call them)
--     but not by `anon` or PUBLIC.
--   * get_feed is a client RPC -> authenticated only.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user()                        from public, anon, authenticated;
revoke execute on function public.tg_likes_counter()                       from public, anon, authenticated;
revoke execute on function public.tg_comments_counter()                    from public, anon, authenticated;
revoke execute on function public.tg_comment_likes_counter()               from public, anon, authenticated;
revoke execute on function public.tg_follows_counter()                     from public, anon, authenticated;
revoke execute on function public.tg_posts_counter()                       from public, anon, authenticated;
revoke execute on function public.tg_group_members_counter()               from public, anon, authenticated;
revoke execute on function public.tg_group_creator_membership()            from public, anon, authenticated;
revoke execute on function public.tg_road_status_reactions_counter()       from public, anon, authenticated;
revoke execute on function public.tg_road_report_votes_counter()           from public, anon, authenticated;
revoke execute on function public.tg_safety_votes_counter()                from public, anon, authenticated;
revoke execute on function public.tg_convoy_members_counter()              from public, anon, authenticated;
revoke execute on function public.tg_convoy_leader_membership()            from public, anon, authenticated;

revoke execute on function public.is_group_member(uuid, uuid) from public, anon;
revoke execute on function public.can_view_group(uuid)        from public, anon;
revoke execute on function public.is_group_admin(uuid)        from public, anon;
revoke execute on function public.is_moderator()              from public, anon;
revoke execute on function public.get_feed(timestamptz, int)  from public, anon;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.can_view_group(uuid)        to authenticated;
grant execute on function public.is_group_admin(uuid)        to authenticated;
grant execute on function public.is_moderator()              to authenticated;
grant execute on function public.get_feed(timestamptz, int)  to authenticated;

-- ---------------------------------------------------------------------------
-- Covering indexes for every foreign key flagged by the performance advisor.
-- ---------------------------------------------------------------------------
create index if not exists idx_comment_likes_user    on public.comment_likes (user_id);
create index if not exists idx_comments_author       on public.comments (author_id);
create index if not exists idx_convoy_messages_sender on public.convoy_messages (sender_id);
create index if not exists idx_convoys_leader        on public.convoys (leader_id);
create index if not exists idx_group_join_requests_user on public.group_join_requests (user_id);
create index if not exists idx_groups_created_by     on public.groups (created_by);
create index if not exists idx_listings_seller       on public.listings (seller_id);
create index if not exists idx_mileage_proofs_reviewer on public.mileage_proofs (reviewed_by);
create index if not exists idx_mileage_proofs_user   on public.mileage_proofs (user_id);
create index if not exists idx_moderation_actions_moderator on public.moderation_actions (moderator_id);
create index if not exists idx_moderation_actions_report on public.moderation_actions (report_id);
create index if not exists idx_notifications_actor   on public.notifications (actor_id);
create index if not exists idx_reports_reporter      on public.reports (reporter_id);
create index if not exists idx_reports_resolved_by   on public.reports (resolved_by);
create index if not exists idx_road_report_votes_user on public.road_report_votes (user_id);
create index if not exists idx_road_reports_author   on public.road_reports (author_id);
create index if not exists idx_road_status_reactions_user on public.road_status_reactions (user_id);
create index if not exists idx_road_statuses_driver  on public.road_statuses (driver_id);
create index if not exists idx_safety_report_votes_user on public.safety_report_votes (user_id);
create index if not exists idx_safety_reports_author on public.safety_reports (author_id);
