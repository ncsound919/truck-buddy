-- ============================================================================
-- Truck Buddy Ops Console — telemetry / analytics / CRM / SEO schema
-- Companion to schema.sql (auth + billing). Run in the Supabase SQL editor.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ANALYTICS / TELEMETRY
-- ----------------------------------------------------------------------------
-- One row per page view (marketing site + portal). session_id groups events.

CREATE TABLE IF NOT EXISTS public.tb_pageviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  device TEXT,
  browser TEXT,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tb_pv_path ON public.tb_pageviews(path, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_pv_session ON public.tb_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_tb_pv_at ON public.tb_pageviews(happened_at);

-- Custom tracked events (clicks on CTAs, pricing, signup starts, etc.)
CREATE TABLE IF NOT EXISTS public.tb_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  name TEXT NOT NULL,
  page_path TEXT,
  properties JSONB,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tb_events_name ON public.tb_events(name, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_events_at ON public.tb_events(happened_at);

-- Daily rollup for fast dashboards (computed by a scheduled job or on ingest).
CREATE TABLE IF NOT EXISTS public.tb_analytics_daily (
  day DATE PRIMARY KEY,
  pageviews INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  events INTEGER NOT NULL DEFAULT 0,
  top_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- CRM — leads, accounts (orgs), and notes/activity
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tb_crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source TEXT,               -- form, manual, load_board, etc.
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','negotiating','customer','lost')),
  owner TEXT,                -- email of the ops user responsible
  notes TEXT,
  value_usd INTEGER,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tb_leads_status ON public.tb_crm_leads(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tb_crm_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.tb_crm_leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,        -- call, email, note, meeting, status_change
  summary TEXT,
  actor TEXT,
  happened_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tb_activity_lead ON public.tb_crm_activity(lead_id, happened_at DESC);

-- ----------------------------------------------------------------------------
-- SEO — crawl/audit snapshots per marketing page
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tb_seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  meta_description TEXT,
  canonical TEXT,
  h1 TEXT,
  word_count INTEGER,
  status_code INTEGER,
  crawlable BOOLEAN,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tb_seo_url ON public.tb_seo_pages(url);

CREATE TABLE IF NOT EXISTS public.tb_seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  score INTEGER,              -- 0-100 lighthouse-style
  issues JSONB,               -- [{code, severity, message}]
  audit_type TEXT NOT NULL DEFAULT 'lighthouse',
  audited_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tb_seo_audits_url ON public.tb_seo_audits(url, audited_at DESC);

-- ----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Ops data is private: only the service role and authenticated staff can touch it.
ALTER TABLE public.tb_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_crm_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_seo_audits ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: these tables are only reachable via the
-- service role (server-side Next.js API routes). This deliberately closes
-- direct client access to ops data.
