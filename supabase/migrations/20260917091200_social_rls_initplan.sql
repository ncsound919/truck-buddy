-- ============================================================================
-- 0007 — RLS initplan optimisation.
-- ============================================================================
-- Wraps `auth.uid()` / `auth.jwt()` / `auth.role()` in a scalar subselect so
-- the predicate is evaluated once per statement instead of once per row.
-- Clears the `auth_rls_initplan` performance advisor on the social tables.
--
-- Generated from pg_policies (tables owned by the social unification:
-- profiles + the 0002-0004 tables). Idempotent: re-running re-applies the
-- same predicates.
-- ============================================================================

alter policy "Like comments as self" on public."comment_likes"
  with check ((user_id = (select auth.uid())));
alter policy "Unlike comments as self" on public."comment_likes"
  using ((user_id = (select auth.uid())));
alter policy "Authors delete comments" on public."comments"
  using ((author_id = (select auth.uid())));
alter policy "Authors update comments" on public."comments"
  using ((author_id = (select auth.uid())))
  with check ((author_id = (select auth.uid())));
alter policy "Write own comments" on public."comments"
  with check ((author_id = (select auth.uid())));
alter policy "Join convoy as self" on public."convoy_members"
  with check (((user_id = (select auth.uid())) OR is_moderator()));
alter policy "Leave convoy" on public."convoy_members"
  using (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM convoys c
  WHERE ((c.id = convoy_members.convoy_id) AND (c.leader_id = (select auth.uid())))))));
alter policy "Authors delete convoy message" on public."convoy_messages"
  using (((sender_id = (select auth.uid())) OR is_moderator()));
alter policy "Read convoy messages" on public."convoy_messages"
  using (((EXISTS ( SELECT 1
   FROM convoy_members cm
  WHERE ((cm.convoy_id = convoy_messages.convoy_id) AND (cm.user_id = (select auth.uid()))))) OR is_moderator()));
alter policy "Send convoy message" on public."convoy_messages"
  with check (((sender_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM convoy_members cm
  WHERE ((cm.convoy_id = convoy_messages.convoy_id) AND (cm.user_id = (select auth.uid())))))));
alter policy "Create own convoy" on public."convoys"
  with check ((leader_id = (select auth.uid())));
alter policy "Leader deletes convoy" on public."convoys"
  using ((leader_id = (select auth.uid())));
alter policy "Leader updates convoy" on public."convoys"
  using ((leader_id = (select auth.uid())))
  with check ((leader_id = (select auth.uid())));
alter policy "Read active convoys" on public."convoys"
  using ((is_active OR (leader_id = (select auth.uid()))));
alter policy "Follow as self" on public."follows"
  with check ((follower_id = (select auth.uid())));
alter policy "Unfollow as self" on public."follows"
  using ((follower_id = (select auth.uid())));
alter policy "Admins resolve join requests" on public."group_join_requests"
  using ((is_group_admin(group_id) OR (user_id = (select auth.uid()))))
  with check ((is_group_admin(group_id) OR (user_id = (select auth.uid()))));
alter policy "Read own join requests" on public."group_join_requests"
  using (((user_id = (select auth.uid())) OR is_group_admin(group_id)));
alter policy "Request to join" on public."group_join_requests"
  with check ((user_id = (select auth.uid())));
alter policy "Read own / peer memberships" on public."group_members"
  using (((user_id = (select auth.uid())) OR is_group_member(group_id, (select auth.uid()))));
alter policy "Admins update groups" on public."groups"
  using ((is_group_admin(id) OR (created_by = (select auth.uid()))))
  with check ((is_group_admin(id) OR (created_by = (select auth.uid()))));
alter policy "Create groups" on public."groups"
  with check ((created_by = (select auth.uid())));
alter policy "Owner deletes groups" on public."groups"
  using ((created_by = (select auth.uid())));
alter policy "Read visible groups" on public."groups"
  using (((visibility = 'public'::group_visibility) OR is_group_member(id, (select auth.uid())) OR (created_by = (select auth.uid()))));
alter policy "Like as self" on public."likes"
  with check ((user_id = (select auth.uid())));
alter policy "Unlike as self" on public."likes"
  using ((user_id = (select auth.uid())));
alter policy "Seller adds listing media" on public."listing_media"
  with check ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_media.listing_id) AND (l.seller_id = (select auth.uid()))))));
alter policy "Seller removes listing media" on public."listing_media"
  using (((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_media.listing_id) AND (l.seller_id = (select auth.uid()))))) OR is_moderator()));
alter policy "Create own listing" on public."listings"
  with check ((seller_id = (select auth.uid())));
alter policy "Seller deletes listing" on public."listings"
  using (((seller_id = (select auth.uid())) OR is_moderator()));
alter policy "Seller updates listing" on public."listings"
  using ((seller_id = (select auth.uid())))
  with check ((seller_id = (select auth.uid())));
alter policy "Delete own location" on public."member_locations"
  using ((user_id = (select auth.uid())));
alter policy "Read sharing members" on public."member_locations"
  using ((is_sharing OR (user_id = (select auth.uid()))));
alter policy "Update own location" on public."member_locations"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));
alter policy "Upsert own location" on public."member_locations"
  with check ((user_id = (select auth.uid())));
alter policy "Insert own mileage" on public."mileage_entries"
  with check ((user_id = (select auth.uid())));
alter policy "Update own unverified mileage" on public."mileage_entries"
  using (((user_id = (select auth.uid())) AND (NOT is_verified)))
  with check ((user_id = (select auth.uid())));
alter policy "Read own or moderated proofs" on public."mileage_proofs"
  using (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])))))));
alter policy "Submit own mileage proof" on public."mileage_proofs"
  with check ((user_id = (select auth.uid())));
alter policy "Moderators write actions" on public."moderation_actions"
  with check (((moderator_id = (select auth.uid())) AND is_moderator()));
alter policy "Mark own notifications read" on public."notifications"
  using ((recipient_id = (select auth.uid())))
  with check ((recipient_id = (select auth.uid())));
alter policy "Read own notifications" on public."notifications"
  using ((recipient_id = (select auth.uid())));
alter policy "System inserts notifications" on public."notifications"
  with check (((actor_id = (select auth.uid())) OR (recipient_id = (select auth.uid()))));
alter policy "Authors add media" on public."post_media"
  with check ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_media.post_id) AND (p.author_id = (select auth.uid()))))));
alter policy "Authors remove media" on public."post_media"
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_media.post_id) AND (p.author_id = (select auth.uid()))))));
alter policy "Authors delete posts" on public."posts"
  using ((author_id = (select auth.uid())));
alter policy "Authors update posts" on public."posts"
  using ((author_id = (select auth.uid())))
  with check ((author_id = (select auth.uid())));
alter policy "Create own posts" on public."posts"
  with check ((author_id = (select auth.uid())));
alter policy "Users insert own profile" on public."profiles"
  with check (((select auth.uid()) = id));
alter policy "Users update own profile" on public."profiles"
  using (((select auth.uid()) = id));
alter policy "File reports" on public."reports"
  with check ((reporter_id = (select auth.uid())));
alter policy "Read own reports or as moderator" on public."reports"
  using (((reporter_id = (select auth.uid())) OR is_moderator()));
alter policy "Clear own road report vote" on public."road_report_votes"
  using ((user_id = (select auth.uid())));
alter policy "Upvote road reports as self" on public."road_report_votes"
  with check ((user_id = (select auth.uid())));
alter policy "Authors delete road reports" on public."road_reports"
  using ((author_id = (select auth.uid())));
alter policy "Authors update road reports" on public."road_reports"
  using ((author_id = (select auth.uid())))
  with check ((author_id = (select auth.uid())));
alter policy "Create own road reports" on public."road_reports"
  with check ((author_id = (select auth.uid())));
alter policy "React as self" on public."road_status_reactions"
  with check ((user_id = (select auth.uid())));
alter policy "Remove own reaction" on public."road_status_reactions"
  using ((user_id = (select auth.uid())));
alter policy "Authors delete road status" on public."road_statuses"
  using ((driver_id = (select auth.uid())));
alter policy "Authors update road status" on public."road_statuses"
  using ((driver_id = (select auth.uid())))
  with check ((driver_id = (select auth.uid())));
alter policy "Create own road status" on public."road_statuses"
  with check ((driver_id = (select auth.uid())));
alter policy "Change own vote" on public."safety_report_votes"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));
alter policy "Clear own vote" on public."safety_report_votes"
  using ((user_id = (select auth.uid())));
alter policy "Vote as self" on public."safety_report_votes"
  with check ((user_id = (select auth.uid())));
alter policy "Authors delete safety reports" on public."safety_reports"
  using ((author_id = (select auth.uid())));
alter policy "Authors update safety reports" on public."safety_reports"
  using ((author_id = (select auth.uid())))
  with check ((author_id = (select auth.uid())));
alter policy "Create own safety reports" on public."safety_reports"
  with check ((author_id = (select auth.uid())));
