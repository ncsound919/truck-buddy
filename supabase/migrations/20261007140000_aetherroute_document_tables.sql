-- AetherRoute document tables (Hyperfine store), applied to the shared project
-- `ennaghywpvlnprsqqzmq`. Pulled into the same apply step as the ops tables so
-- a single `supabase db push` provisions everything AetherRoute needs.
--
-- RLS is enabled with NO client policies: only the server's service-role key
-- may read/write. Every app-side read/write goes through the auth-enforced
-- Express API, never directly from a browser.

create table if not exists public.ar_orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_drivers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_routes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_pings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_idempotency (
  key text primary key,
  status int not null,
  body jsonb,
  created_at timestamptz not null default now()
);

alter table public.ar_orders enable row level security;
alter table public.ar_drivers enable row level security;
alter table public.ar_routes enable row level security;
alter table public.ar_pings enable row level security;
alter table public.ar_idempotency enable row level security;
