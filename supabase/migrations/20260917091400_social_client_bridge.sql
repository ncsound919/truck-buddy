-- ============================================================================
-- 0008 — Social client bridge: role values + JSONB detail columns.
-- ============================================================================
-- The TruckBuddy-Social client carries a lot of display metadata per record
-- (poll/audioNote/reactions on posts, CB channel + hazmat flags on convoys,
-- speed/heading on map pins, condition flags on listings, ...). Rather than
-- explode the normalised schema, first-class columns stay as they are and the
-- client-only detail is kept in a `metadata` JSONB bag per row. Anything that
-- needs querying, joining or RLS stays a real column.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- The client's UserRole also has instructor / creator.
do $$ begin
  alter type public.user_role add value if not exists 'instructor';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.user_role add value if not exists 'creator';
exception when duplicate_object then null; end $$;

alter table public.profiles        add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.posts           add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.road_statuses   add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.road_reports    add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.safety_reports  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.convoys         add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.member_locations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.listings        add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.mileage_entries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.mileage_proofs  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Indexes for the metadata keys the client filters on most often.
create index if not exists idx_posts_type       on public.posts (post_type, created_at desc) where is_removed = false;
create index if not exists idx_safety_severity  on public.safety_reports ((metadata->>'severity'), created_at desc);
create index if not exists idx_listings_category on public.listings (category, created_at desc) where status = 'active';
