-- Outbound webhook subscriptions (W5). Service-role only: the AetherRoute
-- server registers and delivers; no client role may read the signing secret.

create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  event_type text not null default 'ALL',
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_subscriptions_active
  on public.webhook_subscriptions(event_type) where active;

alter table public.webhook_subscriptions enable row level security;
