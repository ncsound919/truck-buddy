-- Tighten the location_pings INSERT policy.
--
-- The original policy only checked `driver_user_id = auth.uid()`, so any driver
-- could stamp a ping with ANY existing org_id and pollute another tenant's feed
-- (pings_org_read uses is_org_member). Require that the driver is a member of
-- the org they are writing the ping for.
--
-- The cab now resolves the driver's own org (first active org_membership) before
-- posting, so this does not block the legitimate path.

drop policy if exists pings_driver_insert on public.location_pings;

create policy pings_driver_insert on public.location_pings
  for insert
  with check (
    driver_user_id = auth.uid()
    and public.is_org_member(org_id)
  );

-- Let a driver move their OWN route's status (assigned -> in_progress ->
-- completed). The cab writes this back on shift start/end; previously only org
-- admins could, so driver writes silently fell back to the mock.
drop policy if exists routes_driver_touch on public.routes;

create policy routes_driver_touch on public.routes
  for update
  using (driver_user_id = auth.uid())
  with check (driver_user_id = auth.uid());
