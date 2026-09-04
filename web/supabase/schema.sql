-- Supabase schema for Truck Buddy portal
-- Run this in the Supabase SQL editor to set up auth and billing tables.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER PROFILES
-- ============================================================================
-- Extends Supabase auth.users with org + billing metadata.
-- One user can belong to multiple orgs (via org_memberships).

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  -- Stripe customer ID, set after first checkout
  stripe_customer_id TEXT UNIQUE,
  -- Active Stripe subscription ID (if any)
  stripe_subscription_id TEXT UNIQUE,
  -- Subscription tier mirrors the org tier
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  subscription_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier, subscription_status);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('independent', 'fleet', 'carrier', 'shipper', 'broker')),
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
  active_seats INTEGER NOT NULL DEFAULT 1,
  seat_limit INTEGER NOT NULL DEFAULT 1,
  -- Billing relationship
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORG MEMBERSHIPS (RBAC anchor)
-- ============================================================================
-- Maps users to orgs with a role. One user can have multiple memberships.

CREATE TABLE IF NOT EXISTS public.org_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'dispatcher', 'driver', 'accountant')),
  equipment TEXT NOT NULL CHECK (equipment IN ('box_truck', 'hotshot', 'dry_van', 'reefer', 'flatbed', 'tanker')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON public.org_memberships(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON public.org_memberships(org_id) WHERE is_active = true;

-- ============================================================================
-- INVOICES
-- ============================================================================
-- Cached copy of Stripe invoices for fast portal display.

CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY, -- Stripe invoice ID
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_due INTEGER NOT NULL, -- in cents
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  description TEXT,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id, created_at DESC);

-- ============================================================================
-- WEBHOOK EVENTS (idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Profiles: users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Orgs: members can read their orgs
CREATE POLICY "Members read orgs"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.org_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

-- Orgs: owners/admins can update
CREATE POLICY "Owners/admins update orgs"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.org_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.is_active = true
    )
  );

-- Memberships: users see their own memberships + members of their orgs
CREATE POLICY "Users read own memberships"
  ON public.org_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users read org memberships"
  ON public.org_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships me
      WHERE me.org_id = org_memberships.org_id
        AND me.user_id = auth.uid()
        AND me.is_active = true
    )
  );

-- Memberships: owners/admins can invite
CREATE POLICY "Owners/admins insert memberships"
  ON public.org_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_memberships me
      WHERE me.org_id = org_memberships.org_id
        AND me.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
        AND me.is_active = true
    )
  );

-- Memberships: owners/admins can update roles
CREATE POLICY "Owners/admins update memberships"
  ON public.org_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships me
      WHERE me.org_id = org_memberships.org_id
        AND me.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
        AND me.is_active = true
    )
  );

-- Invoices: users see their own or their org's invoices
CREATE POLICY "Users read own invoices"
  ON public.invoices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users read org invoices"
  ON public.invoices FOR SELECT
  USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.org_id = invoices.org_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS orgs_updated_at ON public.organizations;
CREATE TRIGGER orgs_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
