-- Idempotent driver pings: the ops mirror retries via the outbox, so a ping
-- must upsert on a client-supplied id rather than insert a duplicate row.

alter table public.location_pings add column if not exists client_ping_id text;
create unique index if not exists idx_location_pings_client_id
  on public.location_pings(client_ping_id) where client_ping_id is not null;
