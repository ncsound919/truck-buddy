-- ============================================================================
-- 0007a — Portal billing tables.
-- ============================================================================
-- public.organizations, public.org_memberships, public.invoices and
-- public.stripe_webhook_events previously existed ONLY in
-- web/supabase/schema.sql, which is pasted into the SQL editor by hand.
--
-- That made the migration set unable to build a fresh database: 091000
-- (social_hardening) already runs `alter table public.stripe_webhook_events
-- enable row level security`, so `supabase db push` onto an empty project died
-- with `relation "public.stripe_webhook_events" does not exist`. The web portal
-- also queries organizations/org_memberships/invoices from its Stripe webhook
-- route, so a database built from migrations alone served 400s on billing.
--
-- Definitions are copied verbatim from web/supabase/schema.sql (tables 38-105,
-- RLS 112-114, policies 126-207, trigger 246-248) with the profiles section
-- deliberately excluded -- profiles and its trigger/functions belong to
-- 090000_unified_identity and 091200_profiles_privilege_hardening.
--
-- Version 090900 places this BEFORE 091000_social_hardening, which depends on it.
--
-- Idempotent: safe to re-run, and safe on databases where the tables were
-- created by hand from schema.sql (policies are dropped then recreated).
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  kind text not null check (kind in ('independent', 'fleet', 'carrier', 'shipper', 'broker')),
  tier text not null default 'basic' check (tier in ('basic', 'pro', 'enterprise')),
  active_seats integer not null default 1,
  seat_limit integer not null default 1,
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Org memberships (RBAC anchor)
-- ---------------------------------------------------------------------------
create table if not exists public.org_memberships (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'dispatcher', 'driver', 'accountant')),
  equipment text not null check (equipment in ('box_truck', 'hotshot', 'dry_van', 'reefer', 'flatbed', 'tanker')),
  is_active boolean not null default true,
  joined_at timestamptz default now(),
  unique (org_id, user_id)
);

create index if not exists idx_org_memberships_user on public.org_memberships(user_id) where is_active = true;
create index if not exists idx_org_memberships_org on public.org_memberships(org_id) where is_active = true;

-- ---------------------------------------------------------------------------
-- Invoices (cached copy of Stripe invoices for portal display)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id text primary key,
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  amount_due integer not null,
  amount_paid integer not null default 0,
  currency text not null default 'usd',
  status text not null check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  description text,
  hosted_invoice_url text,
  invoice_pdf text,
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_invoices_org on public.invoices(org_id, created_at desc);
create index if not exists idx_invoices_user on public.invoices(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Webhook events (Stripe idempotency; server-only)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.invoices enable row level security;
-- Server-only: no policies at all, so PostgREST can never reach it with
-- anon/authenticated (091000_social_hardening repeats this line).
alter table public.stripe_webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- Policies (drop-then-create so this file can be re-run on a database where
-- schema.sql already installed them)
-- ---------------------------------------------------------------------------
drop policy if exists "Members read orgs" on public.organizations;
create policy "Members read orgs"
  on public.organizations for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

drop policy if exists "Owners/admins update orgs" on public.organizations;
create policy "Owners/admins update orgs"
  on public.organizations for update
  using (
    exists (
      select 1 from public.org_memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

drop policy if exists "Users read own memberships" on public.org_memberships;
create policy "Users read own memberships"
  on public.org_memberships for select
  using (user_id = auth.uid());

drop policy if exists "Users read org memberships" on public.org_memberships;
create policy "Users read org memberships"
  on public.org_memberships for select
  using (
    exists (
      select 1 from public.org_memberships me
      where me.org_id = org_memberships.org_id
        and me.user_id = auth.uid()
        and me.is_active = true
    )
  );

drop policy if exists "Owners/admins insert memberships" on public.org_memberships;
create policy "Owners/admins insert memberships"
  on public.org_memberships for insert
  with check (
    exists (
      select 1 from public.org_memberships me
      where me.org_id = org_memberships.org_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
        and me.is_active = true
    )
  );

drop policy if exists "Owners/admins update memberships" on public.org_memberships;
create policy "Owners/admins update memberships"
  on public.org_memberships for update
  using (
    exists (
      select 1 from public.org_memberships me
      where me.org_id = org_memberships.org_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
        and me.is_active = true
    )
  );

drop policy if exists "Users read own invoices" on public.invoices;
create policy "Users read own invoices"
  on public.invoices for select
  using (user_id = auth.uid());

drop policy if exists "Users read org invoices" on public.invoices;
create policy "Users read org invoices"
  on public.invoices for select
  using (
    org_id is not null and exists (
      select 1 from public.org_memberships m
      where m.org_id = invoices.org_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- updated_at trigger (update_updated_at already exists from 090000)
-- ---------------------------------------------------------------------------
drop trigger if exists orgs_updated_at on public.organizations;
create trigger orgs_updated_at before update on public.organizations
  for each row execute function public.update_updated_at();
