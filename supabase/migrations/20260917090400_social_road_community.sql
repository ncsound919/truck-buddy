-- ============================================================================
-- 0003 — Road & community: status beacons, road reports, safety reports,
--        member locations (live map), mileage leaderboard + proofs.
-- ============================================================================
-- Firestore mapping:
--   roadStatuses/{id}        -> public.road_statuses (+ road_status_reactions)
--     .userInteractions{}    -> road_status_reactions rows (join table)
--     .waveCount/...Count    -> trigger-maintained counters
--   safetyReports/{id}       -> public.safety_reports (+ safety_report_votes)
--   memberLocations/{id}     -> public.member_locations (one row per driver)
--   mileageLeaderboard/{id}  -> public.mileage_entries
--   mileageProofs/{id}       -> public.mileage_proofs
--
-- Plus public.road_reports (plan §2.6): expiring scale/parking/shipper/fuel/
-- weather/inspection reports that the cab app can also read.
--
-- Idempotent: safe to re-run.
-- ============================================================================

do $$
begin
  create type public.road_reaction as enum ('wave', 'high_beam', 'horn', 'cheers');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.road_report_type as enum
    ('scale', 'parking', 'shipper', 'fuel', 'weather', 'inspection');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.mileage_proof_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Road status beacons (Driver Stories bar) — ephemeral corridor updates.
-- ---------------------------------------------------------------------------
create table if not exists public.road_statuses (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  status_text text not null check (char_length(status_text) between 1 and 500),
  corridor text,
  mile_marker text,
  emoji text,
  media_url text,
  latitude double precision,
  longitude double precision,
  wave_count int not null default 0,
  high_beam_count int not null default 0,
  horn_count int not null default 0,
  cheers_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz default now() + interval '24 hours'
);
create index if not exists idx_road_statuses_feed
  on public.road_statuses (expires_at, created_at desc);
create index if not exists idx_road_statuses_corridor
  on public.road_statuses (corridor, created_at desc);

create table if not exists public.road_status_reactions (
  status_id uuid not null references public.road_statuses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.road_reaction not null,
  created_at timestamptz not null default now(),
  primary key (status_id, user_id, reaction)
);

-- ---------------------------------------------------------------------------
-- Road reports (expiring, map-friendly). Shared with the cab app.
-- ---------------------------------------------------------------------------
create table if not exists public.road_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  report_type public.road_report_type not null,
  title text not null check (char_length(title) between 1 and 200),
  body text,
  latitude double precision,
  longitude double precision,
  location_name text,
  upvote_count int not null default 0,
  is_removed boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_road_reports_type
  on public.road_reports (report_type, created_at desc);
create index if not exists idx_road_reports_active
  on public.road_reports (expires_at) where is_removed = false;

create table if not exists public.road_report_votes (
  report_id uuid not null references public.road_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Safety reports + votes
-- ---------------------------------------------------------------------------
create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text,
  category text,
  latitude double precision,
  longitude double precision,
  location_name text,
  upvote_count int not null default 0,
  downvote_count int not null default 0,
  is_removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_safety_reports_feed
  on public.safety_reports (created_at desc) where is_removed = false;

create table if not exists public.safety_report_votes (
  report_id uuid not null references public.safety_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Member locations (US radar map). One row per driver; opt-in sharing.
-- ---------------------------------------------------------------------------
create table if not exists public.member_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  status text,
  is_sharing boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Mileage leaderboard + proofs
-- ---------------------------------------------------------------------------
create table if not exists public.mileage_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null default to_char(now(), 'YYYY-MM'),
  miles numeric(10, 1) not null default 0 check (miles >= 0),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);
create index if not exists idx_mileage_period
  on public.mileage_entries (period, miles desc);

create table if not exists public.mileage_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  miles_logged numeric(10, 1) not null check (miles_logged >= 0),
  period text,
  evidence_url text,
  status public.mileage_proof_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_mileage_proofs_status
  on public.mileage_proofs (status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.road_statuses enable row level security;
alter table public.road_status_reactions enable row level security;
alter table public.road_reports enable row level security;
alter table public.road_report_votes enable row level security;
alter table public.safety_reports enable row level security;
alter table public.safety_report_votes enable row level security;
alter table public.member_locations enable row level security;
alter table public.mileage_entries enable row level security;
alter table public.mileage_proofs enable row level security;

do $$
begin
  -- road_statuses
  create policy "Read road statuses" on public.road_statuses
    for select to authenticated using (true);
  create policy "Create own road status" on public.road_statuses
    for insert to authenticated with check (driver_id = auth.uid());
  create policy "Authors update road status" on public.road_statuses
    for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
  create policy "Authors delete road status" on public.road_statuses
    for delete to authenticated using (driver_id = auth.uid());

  -- road_status_reactions
  create policy "Read road status reactions" on public.road_status_reactions
    for select to authenticated using (true);
  create policy "React as self" on public.road_status_reactions
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Remove own reaction" on public.road_status_reactions
    for delete to authenticated using (user_id = auth.uid());

  -- road_reports
  create policy "Read road reports" on public.road_reports
    for select to authenticated using (is_removed = false);
  create policy "Create own road reports" on public.road_reports
    for insert to authenticated with check (author_id = auth.uid());
  create policy "Authors update road reports" on public.road_reports
    for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
  create policy "Authors delete road reports" on public.road_reports
    for delete to authenticated using (author_id = auth.uid());

  -- road_report_votes
  create policy "Read road report votes" on public.road_report_votes
    for select to authenticated using (true);
  create policy "Upvote road reports as self" on public.road_report_votes
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Clear own road report vote" on public.road_report_votes
    for delete to authenticated using (user_id = auth.uid());

  -- safety_reports
  create policy "Read safety reports" on public.safety_reports
    for select to authenticated using (is_removed = false);
  create policy "Create own safety reports" on public.safety_reports
    for insert to authenticated with check (author_id = auth.uid());
  create policy "Authors update safety reports" on public.safety_reports
    for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
  create policy "Authors delete safety reports" on public.safety_reports
    for delete to authenticated using (author_id = auth.uid());

  -- safety_report_votes
  create policy "Read safety votes" on public.safety_report_votes
    for select to authenticated using (true);
  create policy "Vote as self" on public.safety_report_votes
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Change own vote" on public.safety_report_votes
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  create policy "Clear own vote" on public.safety_report_votes
    for delete to authenticated using (user_id = auth.uid());

  -- member_locations
  create policy "Read sharing members" on public.member_locations
    for select to authenticated using (is_sharing or user_id = auth.uid());
  create policy "Upsert own location" on public.member_locations
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Update own location" on public.member_locations
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  create policy "Delete own location" on public.member_locations
    for delete to authenticated using (user_id = auth.uid());

  -- mileage_entries
  create policy "Read leaderboard" on public.mileage_entries
    for select to authenticated using (true);
  create policy "Insert own mileage" on public.mileage_entries
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Update own unverified mileage" on public.mileage_entries
    for update to authenticated
    using (user_id = auth.uid() and not is_verified)
    with check (user_id = auth.uid());

  -- mileage_proofs
  create policy "Read own or moderated proofs" on public.mileage_proofs
    for select to authenticated using (
      user_id = auth.uid()
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role in ('admin', 'moderator'))
    );
  create policy "Submit own mileage proof" on public.mileage_proofs
    for insert to authenticated with check (user_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Counters
-- ---------------------------------------------------------------------------
create or replace function public.tg_road_status_reactions_counter()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col text;
begin
  col := case coalesce(new.reaction, old.reaction)
           when 'wave' then 'wave_count'
           when 'high_beam' then 'high_beam_count'
           when 'horn' then 'horn_count'
           when 'cheers' then 'cheers_count'
         end;
  if col is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    execute format('update public.road_statuses set %I = %I + 1 where id = $1', col, col)
      using new.status_id;
  else
    execute format('update public.road_statuses set %I = greatest(%I - 1, 0) where id = $1', col, col)
      using old.status_id;
  end if;
  return null;
end;
$$;

drop trigger if exists road_status_reactions_counter on public.road_status_reactions;
create trigger road_status_reactions_counter
  after insert or delete on public.road_status_reactions
  for each row execute function public.tg_road_status_reactions_counter();

-- Road report upvotes (one row per driver, mirroring safety votes).
create or replace function public.tg_road_report_votes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.road_reports set upvote_count = upvote_count + 1 where id = new.report_id;
  else
    update public.road_reports set upvote_count = greatest(upvote_count - 1, 0) where id = old.report_id;
  end if;
  return null;
end;
$$;

drop trigger if exists road_report_votes_counter on public.road_report_votes;
create trigger road_report_votes_counter
  after insert or delete on public.road_report_votes
  for each row execute function public.tg_road_report_votes_counter();

create or replace function public.tg_safety_votes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.vote = 1 then
      update public.safety_reports set upvote_count = upvote_count + 1 where id = new.report_id;
    else
      update public.safety_reports set downvote_count = downvote_count + 1 where id = new.report_id;
    end if;
  elseif tg_op = 'DELETE' then
    if old.vote = 1 then
      update public.safety_reports set upvote_count = greatest(upvote_count - 1, 0) where id = old.report_id;
    else
      update public.safety_reports set downvote_count = greatest(downvote_count - 1, 0) where id = old.report_id;
    end if;
  elsif tg_op = 'UPDATE' then
    update public.safety_reports
       set upvote_count   = greatest(upvote_count   + (case when new.vote = 1  then 1 else 0 end)
                                                      - (case when old.vote = 1  then 1 else 0 end), 0),
           downvote_count = greatest(downvote_count + (case when new.vote = -1 then 1 else 0 end)
                                                      - (case when old.vote = -1 then 1 else 0 end), 0)
     where id = new.report_id;
  end if;
  return null;
end;
$$;

drop trigger if exists safety_votes_counter on public.safety_report_votes;
create trigger safety_votes_counter
  after insert or update or delete on public.safety_report_votes
  for each row execute function public.tg_safety_votes_counter();

drop trigger if exists safety_reports_updated_at on public.safety_reports;
create trigger safety_reports_updated_at
  before update on public.safety_reports
  for each row execute function public.update_updated_at();

drop trigger if exists mileage_entries_updated_at on public.mileage_entries;
create trigger mileage_entries_updated_at
  before update on public.mileage_entries
  for each row execute function public.update_updated_at();

drop trigger if exists member_locations_updated_at on public.member_locations;
create trigger member_locations_updated_at
  before update on public.member_locations
  for each row execute function public.update_updated_at();
