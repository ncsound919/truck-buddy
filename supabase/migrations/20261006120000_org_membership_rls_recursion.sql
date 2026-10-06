-- ============================================================================
-- 0014 — Fix infinite recursion in the org RLS policies.
-- ============================================================================
-- The organizations / org_memberships policies copied from
-- web/supabase/schema.sql test membership with an inline
--   EXISTS (SELECT 1 FROM public.org_memberships m WHERE ...)
-- inside a policy ON public.org_memberships. Postgres evaluates that subquery
-- under RLS, which re-enters the same policy -> `42P17 infinite recursion
-- detected in policy for relation "org_memberships"`. Any authenticated read of
-- org_memberships 500s.
--
-- Fix: move the membership test into SECURITY DEFINER helper functions that read
-- the table privileged (RLS bypassed), and have the policies call those.
--
-- Idempotent.
-- ============================================================================

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.org_memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.org_memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('owner', 'admin')
  );
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- org_memberships policies
-- ---------------------------------------------------------------------------
drop policy if exists "Users read own memberships" on public.org_memberships;
create policy "Users read own memberships"
  on public.org_memberships for select
  using (user_id = auth.uid());

drop policy if exists "Users read org memberships" on public.org_memberships;
create policy "Users read org memberships"
  on public.org_memberships for select
  using (public.is_org_member(org_memberships.org_id));

drop policy if exists "Owners/admins insert memberships" on public.org_memberships;
create policy "Owners/admins insert memberships"
  on public.org_memberships for insert
  with check (public.is_org_admin(org_memberships.org_id));

drop policy if exists "Owners/admins update memberships" on public.org_memberships;
create policy "Owners/admins update memberships"
  on public.org_memberships for update
  using (public.is_org_admin(org_memberships.org_id));

-- ---------------------------------------------------------------------------
-- organizations policies (these read org_memberships too, so they also recurse)
-- ---------------------------------------------------------------------------
drop policy if exists "Members read orgs" on public.organizations;
create policy "Members read orgs"
  on public.organizations for select
  using (public.is_org_member(public.organizations.id));

drop policy if exists "Owners/admins update orgs" on public.organizations;
create policy "Owners/admins update orgs"
  on public.organizations for update
  using (public.is_org_admin(public.organizations.id));
