-- Server-minted customer tracking tokens (W4).
--
-- A customer never receives the order id: lookup exchanges a tracking number +
-- verification for an opaque random token. Only the SHA-256 hash is stored.
-- RLS is on with no client policies, so only the service-role key can touch it.

create table if not exists public.tracking_tokens (
  token_hash text primary key,
  order_id text not null,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  used_count int not null default 0,
  last_used_at timestamptz
);

create index if not exists idx_tracking_tokens_order on public.tracking_tokens(order_id);
create index if not exists idx_tracking_tokens_expiry on public.tracking_tokens(expires_at);

alter table public.tracking_tokens enable row level security;
