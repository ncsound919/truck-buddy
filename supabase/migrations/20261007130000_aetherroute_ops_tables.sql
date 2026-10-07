-- AetherRoute operational tables, keyed to organizations.
--
-- First step of merging AetherRoute (dispatch) into the Truck Buddy platform:
-- the dispatcher writes routes/stops, the cab app reads them and writes back
-- pings, arrivals and delivery outcomes. Every row carries org_id so RLS
-- follows the existing is_org_member/is_org_admin helpers.

create extension if not exists pgcrypto;

-- Fleet vehicles (mirrors the cab's Vehicle model) -------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vin text,
  plate text,
  make text,
  model text,
  year int,
  assigned_driver_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_vehicles_org on public.vehicles(org_id);
create index if not exists idx_vehicles_driver on public.vehicles(assigned_driver_id);

-- Driver roster in an org (one row per driver user per org) -----------------
create table if not exists public.driver_roster (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status text not null default 'available' check (status in ('available', 'en_route', 'at_stop', 'break', 'off_duty')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_roster_user on public.driver_roster(user_id);

-- Dispatch destinations and jobs --------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  tracking_number text not null unique,
  customer_name text,
  customer_phone text,
  customer_email text,
  address text not null,
  lat double precision,
  lng double precision,
  weight_kg double precision,
  volume_m3 double precision,
  time_window_start text,
  time_window_end text,
  status text not null default 'unassigned' check (status in ('unassigned','assigned','in_transit','arrived','delivered','failed')),
  assigned_driver_id uuid references auth.users(id) on delete set null,
  proof jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_org_status on public.orders(org_id, status);
create index if not exists idx_orders_driver on public.orders(assigned_driver_id);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  date date not null default current_date,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_routes_driver_date on public.routes(driver_user_id, date);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  seq int not null default 0,
  name text,
  address text not null,
  lat double precision,
  lng double precision,
  geofence_meters int not null default 300,
  eta_minutes int,
  leg_miles double precision,
  status text not null default 'pending' check (status in ('pending','arrived','completed','skipped')),
  arrived_at timestamptz,
  completed_at timestamptz
);
create index if not exists idx_stops_route on public.stops(route_id, seq);

create table if not exists public.location_pings (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id) on delete cascade,
  captured_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  speed_kmh double precision,
  heading double precision,
  accuracy_m double precision,
  battery_pct int
);
create index if not exists idx_pings_driver_time on public.location_pings(driver_user_id, captured_at desc);

-- RLS -----------------------------------------------------------------------
alter table public.vehicles enable row level security;
alter table public.driver_roster enable row level security;
alter table public.orders enable row level security;
alter table public.routes enable row level security;
alter table public.stops enable row level security;
alter table public.location_pings enable row level security;

-- Any org member can read operational rows; only org admins/dispatchers write
-- the dispatch side (vehicles, roster, orders, routes, stops). Drivers can
-- insert/post their own pings and arrival timestamps on their rows.
create policy vehicles_org_read on public.vehicles for select using (public.is_org_member(org_id));
create policy vehicles_admin_write on public.vehicles for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy roster_org_read on public.driver_roster for select using (public.is_org_member(org_id));
create policy roster_admin_write on public.driver_roster for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy orders_org_read on public.orders for select using (public.is_org_member(org_id));
create policy orders_admin_write on public.orders for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy routes_org_read on public.routes for select using (public.is_org_member(org_id));
create policy routes_admin_write on public.routes for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy stops_org_read on public.stops for select using (public.is_org_member(org_id));
create policy stops_admin_write on public.stops for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy pings_org_read on public.location_pings for select using (public.is_org_member(org_id));
create policy pings_driver_insert on public.location_pings for insert with check (driver_user_id = auth.uid());

create policy stops_driver_touch on public.stops for update
  using ((select r.driver_user_id from public.routes r where r.id = stops.route_id) = auth.uid())
  with check ((select r.driver_user_id from public.routes r where r.id = stops.route_id) = auth.uid());
