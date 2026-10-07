-- Org scoping for the AetherRoute document tables.
--
-- One active org per server session: the AetherRoute server is bound to a
-- single org id (AETHERRoute_ORG_ID / first membership) and only reads/writes
-- rows for that org. Service-role access bypasses RLS, so the scoping is
-- enforced in the server query, and org_id here makes that enforceable and
-- indexable.

alter table public.ar_orders add column if not exists org_id uuid;
alter table public.ar_drivers add column if not exists org_id uuid;
alter table public.ar_routes add column if not exists org_id uuid;
alter table public.ar_pings add column if not exists org_id uuid;

create index if not exists idx_ar_orders_org on public.ar_orders(org_id);
create index if not exists idx_ar_drivers_org on public.ar_drivers(org_id);
create index if not exists idx_ar_routes_org on public.ar_routes(org_id);
create index if not exists idx_ar_pings_org on public.ar_pings(org_id);

-- Backfill from the JSON documents where the org is already present.
update public.ar_orders  set org_id = (data->>'tenant_id')::uuid where org_id is null and (data->>'tenant_id') ~ '^[0-9a-f-]{36}$';
update public.ar_drivers set org_id = (data->>'orgId')::uuid     where org_id is null and (data->>'orgId') ~ '^[0-9a-f-]{36}$';
update public.ar_routes  set org_id = (data->>'tenant_id')::uuid where org_id is null and (data->>'tenant_id') ~ '^[0-9a-f-]{36}$';
