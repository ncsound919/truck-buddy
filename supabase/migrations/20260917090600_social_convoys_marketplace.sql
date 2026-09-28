-- ============================================================================
-- 0004 — Convoys + chat, marketplace, notifications, moderation.
-- ============================================================================
-- Firestore mapping:
--   convoys/{id}             -> public.convoys
--     .leader / .members[]   -> convoy_members (role leader/member)
--     /messages/{id}         -> public.convoy_messages
--   listings/{id}            -> public.listings (+ listing_media)
--   (no Firestore equiv)     -> public.notifications, reports,
--                              moderation_actions (plan §2.8)
--
-- Idempotent: safe to re-run.
-- ============================================================================

do $$
begin
  create type public.convoy_member_role as enum ('leader', 'member');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.listing_status as enum ('active', 'sold', 'expired', 'removed');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.notification_type as enum
    ('like', 'comment', 'follow', 'group_invite', 'group_join_request',
     'mention', 'convoy_invite', 'system');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.report_reason as enum
    ('spam', 'harassment', 'inappropriate', 'misinformation', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Convoys (drafting network) + members + chat
-- ---------------------------------------------------------------------------
create table if not exists public.convoys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  description text,
  leader_id uuid not null references public.profiles(id) on delete cascade,
  origin text,
  destination text,
  departure_at timestamptz,
  is_active boolean not null default true,
  member_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_convoys_active on public.convoys (created_at desc) where is_active;

create table if not exists public.convoy_members (
  convoy_id uuid not null references public.convoys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.convoy_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (convoy_id, user_id)
);
create index if not exists idx_convoy_members_user on public.convoy_members (user_id);

create table if not exists public.convoy_messages (
  id uuid primary key default gen_random_uuid(),
  convoy_id uuid not null references public.convoys(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_convoy_messages on public.convoy_messages (convoy_id, created_at);

-- ---------------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  category text not null,
  condition text,
  location text,
  latitude double precision,
  longitude double precision,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_listings_browse
  on public.listings (category, status, created_at desc);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_listing_media on public.listing_media (listing_id, position);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient
  on public.notifications (recipient_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (recipient_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile', 'listing', 'road_report')),
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_reports_open
  on public.reports (created_at desc) where status = 'open';

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  action text not null check (action in ('remove_content', 'ban_user', 'warn', 'dismiss')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Moderator check (SECURITY DEFINER to read profiles without RLS recursion).
-- ---------------------------------------------------------------------------
create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'moderator')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.convoys enable row level security;
alter table public.convoy_members enable row level security;
alter table public.convoy_messages enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

do $$
begin
  -- convoys
  create policy "Read active convoys" on public.convoys
    for select to authenticated using (is_active or leader_id = auth.uid());
  create policy "Create own convoy" on public.convoys
    for insert to authenticated with check (leader_id = auth.uid());
  create policy "Leader updates convoy" on public.convoys
    for update to authenticated using (leader_id = auth.uid()) with check (leader_id = auth.uid());
  create policy "Leader deletes convoy" on public.convoys
    for delete to authenticated using (leader_id = auth.uid());

  -- convoy_members
  create policy "Read convoy members" on public.convoy_members
    for select to authenticated using (true);
  create policy "Join convoy as self" on public.convoy_members
    for insert to authenticated with check (user_id = auth.uid() or public.is_moderator());
  create policy "Leave convoy" on public.convoy_members
    for delete to authenticated using (
      user_id = auth.uid()
      or exists (select 1 from public.convoys c where c.id = convoy_id and c.leader_id = auth.uid())
    );

  -- convoy_messages
  create policy "Read convoy messages" on public.convoy_messages
    for select to authenticated using (
      exists (select 1 from public.convoy_members cm
              where cm.convoy_id = convoy_messages.convoy_id and cm.user_id = auth.uid())
      or public.is_moderator()
    );
  create policy "Send convoy message" on public.convoy_messages
    for insert to authenticated with check (
      sender_id = auth.uid()
      and exists (select 1 from public.convoy_members cm
                  where cm.convoy_id = convoy_messages.convoy_id and cm.user_id = auth.uid())
    );
  create policy "Authors delete convoy message" on public.convoy_messages
    for delete to authenticated using (sender_id = auth.uid() or public.is_moderator());

  -- listings
  create policy "Read listings" on public.listings
    for select to authenticated using (status <> 'removed');
  create policy "Create own listing" on public.listings
    for insert to authenticated with check (seller_id = auth.uid());
  create policy "Seller updates listing" on public.listings
    for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
  create policy "Seller deletes listing" on public.listings
    for delete to authenticated using (seller_id = auth.uid() or public.is_moderator());

  -- listing_media
  create policy "Read listing media" on public.listing_media
    for select to authenticated using (true);
  create policy "Seller adds listing media" on public.listing_media
    for insert to authenticated with check (
      exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
    );
  create policy "Seller removes listing media" on public.listing_media
    for delete to authenticated using (
      exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
      or public.is_moderator()
    );

  -- notifications
  create policy "Read own notifications" on public.notifications
    for select to authenticated using (recipient_id = auth.uid());
  create policy "Mark own notifications read" on public.notifications
    for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
  create policy "System inserts notifications" on public.notifications
    for insert to authenticated with check (actor_id = auth.uid() or recipient_id = auth.uid());

  -- reports
  create policy "File reports" on public.reports
    for insert to authenticated with check (reporter_id = auth.uid());
  create policy "Read own reports or as moderator" on public.reports
    for select to authenticated using (reporter_id = auth.uid() or public.is_moderator());
  create policy "Moderators resolve reports" on public.reports
    for update to authenticated using (public.is_moderator()) with check (public.is_moderator());

  -- moderation_actions
  create policy "Moderators read actions" on public.moderation_actions
    for select to authenticated using (public.is_moderator());
  create policy "Moderators write actions" on public.moderation_actions
    for insert to authenticated with check (moderator_id = auth.uid() and public.is_moderator());
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Counters + timestamps
-- ---------------------------------------------------------------------------
create or replace function public.tg_convoy_members_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.convoys set member_count = member_count + 1 where id = new.convoy_id;
  else
    update public.convoys set member_count = greatest(member_count - 1, 0) where id = old.convoy_id;
  end if;
  return null;
end;
$$;

drop trigger if exists convoy_members_counter on public.convoy_members;
create trigger convoy_members_counter
  after insert or delete on public.convoy_members
  for each row execute function public.tg_convoy_members_counter();

-- Leader is always a member.
create or replace function public.tg_convoy_leader_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.convoy_members (convoy_id, user_id, role)
  values (new.id, new.leader_id, 'leader')
  on conflict (convoy_id, user_id) do update set role = 'leader';
  return new;
end;
$$;

drop trigger if exists convoy_leader_membership on public.convoys;
create trigger convoy_leader_membership
  after insert on public.convoys
  for each row execute function public.tg_convoy_leader_membership();

drop trigger if exists convoys_updated_at on public.convoys;
create trigger convoys_updated_at
  before update on public.convoys
  for each row execute function public.update_updated_at();

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.update_updated_at();
