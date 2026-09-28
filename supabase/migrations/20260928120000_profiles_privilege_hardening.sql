-- ============================================================================
-- 0011 — Profile privilege hardening.
-- ============================================================================
-- Closes two CRITICAL issues on public.profiles:
--
--   1. Privilege escalation. The "Users update own profile" policy
--      (0001) only checked `auth.uid() = id`, so any signed-in driver could
--      `update profiles set role = 'admin'` on their own row. `is_moderator()`
--      trusts that column, so self-promotion unlocked every moderator-only
--      read/write and the private storage buckets.
--
--   2. Email + billing leak. The "Signed-in users read profiles" policy is
--      `using (true)`, and profiles carries `email`, `stripe_customer_id`
--      and `stripe_subscription_id`. Every authenticated user could enumerate
--      every driver's email and Stripe identifiers via `select *`.
--
-- Strategy:
--   * Column-level SELECT: revoke table SELECT and grant only the public
--     profile columns. PostgREST expands `*` and embedded `profiles(*)` to the
--     granted columns, so existing clients keep working without ever receiving
--     email / Stripe ids.
--   * A BEFORE UPDATE trigger pins server-controlled columns for non-staff
--     callers (role escalation to admin/moderator, verification, reputation and
--     billing). Counter columns (follower/following/post_count) are deliberately
--     left mutable because the like/follow/post triggers update them as the
--     signed-in user.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column-level SELECT: hide email + Stripe ids from clients.
-- ---------------------------------------------------------------------------
do $$ begin
  revoke select on public.profiles from anon, authenticated;
exception when undefined_table then null; end $$;

do $$
declare
  allowed text[] := array[
    'id', 'full_name', 'avatar_url', 'username', 'display_name', 'bio', 'role',
    'cdl_class', 'years_experience', 'current_rig', 'home_base', 'lanes',
    'carrier_name', 'primary_corridor', 'is_verified', 'safe_miles', 'badges',
    'follower_count', 'following_count', 'post_count', 'last_seen_at',
    'created_at', 'updated_at', 'metadata'
  ];
  col text;
begin
  foreach col in array allowed loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = col
    ) then
      execute format('grant select (%I) on public.profiles to authenticated', col);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Guard server-controlled columns on self-update.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role callers (Stripe webhook, admin jobs) and existing staff bypass.
  if coalesce(auth.role(), '') = 'service_role' or public.is_moderator() then
    return new;
  end if;

  -- Never allow self-escalation into a privileged role.
  if new.role in ('admin', 'moderator') then
    new.role := old.role;
  end if;

  -- Server-controlled: verification, reputation and billing identity.
  new.is_verified := old.is_verified;
  new.safe_miles := old.safe_miles;
  new.badges := old.badges;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.subscription_tier := old.subscription_tier;
  new.subscription_status := old.subscription_status;
  new.subscription_period_end := old.subscription_period_end;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();
