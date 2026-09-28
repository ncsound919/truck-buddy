-- ============================================================================
-- 0012 — Portal live slice: loads, documents, dispatch messages.
-- ============================================================================
-- Replaces the in-memory mock portal store for the three operational surfaces
-- that matter most (loads / load board, documents, dispatch thread) with real
-- per-user Supabase tables and RLS.
--
-- Access model:
--   * loads            — the board is readable by any signed-in driver; a
--                        poster manages the loads they posted; a driver takes
--                        a load only through the accept_load() RPC, so nobody
--                        can tamper with another carrier's rate/route.
--   * documents        — private to the owning user (auth.users.id).
--   * dispatch_messages— private to the owning user.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- loads (freight board + the driver's accepted work)
-- ---------------------------------------------------------------------------
create table if not exists public.loads (
  id             text primary key default ('load_' || encode(gen_random_bytes(6), 'hex')),
  ref            text not null,
  origin         text not null,
  destination    text not null,
  distance_mi    int  not null default 0,
  weight_lb      int  not null default 0,
  equipment      text not null default '',
  equipment_type text,
  payout         numeric(10,2) not null default 0,
  pickup_at      timestamptz,
  deliver_by     timestamptz,
  status         text not null default 'open'
                 check (status in ('open', 'accepted', 'in_progress', 'delivered')),
  shipper        text not null default '',
  posted_by      uuid references auth.users(id) on delete set null,
  source         text not null default '',
  origin_lat     double precision,
  origin_lng     double precision,
  dest_lat       double precision,
  dest_lng       double precision,
  accepted_by    uuid references auth.users(id) on delete set null,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_loads_status       on public.loads (status);
create index if not exists idx_loads_accepted_by  on public.loads (accepted_by) where accepted_by is not null;
create index if not exists idx_loads_posted_by    on public.loads (posted_by)   where posted_by is not null;

alter table public.loads enable row level security;

do $$ begin
  create policy "Signed-in users read the load board"
    on public.loads for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Posters create their own loads"
    on public.loads for insert to authenticated
    with check ((select auth.uid()) = posted_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Posters manage their own loads"
    on public.loads for update to authenticated
    using ((select auth.uid()) = posted_by)
    with check ((select auth.uid()) = posted_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Posters delete their own loads"
    on public.loads for delete to authenticated
    using ((select auth.uid()) = posted_by);
exception when duplicate_object then null; end $$;

-- Atomic accept: the only way a driver takes a load, so rate/route can't be
-- edited in the same update. SECURITY DEFINER because RLS deliberately does
-- not grant drivers UPDATE on someone else's load row.
create or replace function public.accept_load(p_load_id text)
returns public.loads
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.loads;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.loads
     set status      = 'accepted',
         accepted_by = auth.uid(),
         accepted_at = now()
   where id = p_load_id
     and status = 'open'
     and accepted_by is null
  returning * into v;

  if v.id is null then
    raise exception 'load_not_available';
  end if;

  return v;
end;
$$;

revoke execute on function public.accept_load(text) from public, anon;
grant  execute on function public.accept_load(text) to authenticated;

-- ---------------------------------------------------------------------------
-- documents (private to the owning user)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('BOL', 'Invoice', 'DeliveryReceipt')),
  load_ref    text not null default '',
  bol_number  text not null default '',
  shipper     text not null default '',
  consignee   text not null default '',
  weight_lb   int  not null default 0,
  amount      numeric(10,2) not null default 0,
  status      text not null default 'pending'
              check (status in ('pending', 'verified', 'error')),
  file_name   text,
  storage_path text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_documents_user on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

do $$ begin
  create policy "Owners read their documents"
    on public.documents for select to authenticated
    using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners insert their documents"
    on public.documents for insert to authenticated
    with check ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners update their documents"
    on public.documents for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners delete their documents"
    on public.documents for delete to authenticated
    using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- dispatch_messages (private thread per user)
-- ---------------------------------------------------------------------------
create table if not exists public.dispatch_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender     text not null check (sender in ('dispatch', 'me')),
  from_label text not null default '',
  body       text not null,
  unread     boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_dispatch_messages_user
  on public.dispatch_messages (user_id, created_at desc);

alter table public.dispatch_messages enable row level security;

do $$ begin
  create policy "Owners read their dispatch thread"
    on public.dispatch_messages for select to authenticated
    using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners write to their dispatch thread"
    on public.dispatch_messages for insert to authenticated
    with check ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners update their dispatch thread"
    on public.dispatch_messages for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners clear their dispatch thread"
    on public.dispatch_messages for delete to authenticated
    using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Seed the demo board (posted_by null = partner-board freight). Idempotent.
-- pickup/deliver are relative to now() so the board always looks current.
-- ---------------------------------------------------------------------------
insert into public.loads
  (id, ref, origin, destination, distance_mi, weight_lb, equipment, equipment_type,
   payout, pickup_at, deliver_by, status, shipper, source,
   origin_lat, origin_lng, dest_lat, dest_lng)
values
  ('load_882114', 'BOL-882114', 'Charlotte, NC', 'Raleigh, NC', 165, 18750, 'Dry Van 53ft', 'dry_van',
   980, now() + interval '1 day', now() + interval '1 day 7 hours', 'open', 'Raleigh Freight Co.', 'Raleigh Freight Board',
   35.227, -80.843, 35.78, -78.639),
  ('load_882431', 'BOL-882431', 'Greensboro, NC', 'Richmond, VA', 240, 31000, 'Refrigerated 53ft', 'reefer',
   1480, now() + interval '2 days', now() + interval '2 days 9 hours', 'open', 'Piedmont Cold', 'Haley Logistics Board',
   36.073, -79.792, 37.541, -77.436),
  ('load_882703', 'BOL-882703', 'Atlanta, GA', 'Knoxville, TN', 210, 22500, 'Flatbed', 'flatbed',
   1190, now() + interval '3 days', now() + interval '3 days 10 hours', 'open', 'Peach Steel', 'Carolina Co-op Board',
   33.749, -84.388, 35.961, -83.921),
  ('load_882941', 'BOL-882941', 'Columbia, SC', 'Norfolk, VA', 390, 26500, 'Dry Van 53ft', 'dry_van',
   2210, now() + interval '8 hours', now() + interval '1 day 3 hours', 'open', 'Midlands Produce', 'Haley Logistics Board',
   34.0, -81.035, 36.851, -76.285),
  ('load_883052', 'BOL-883052', 'Charleston, SC', 'Baltimore, MD', 520, 41200, 'Refrigerated 53ft', 'reefer',
   3180, now() + interval '2 days 5 hours', now() + interval '3 days', 'open', 'Harbor Cold', 'Raleigh Freight Board',
   32.776, -79.931, 39.29, -76.612),
  ('load_883117', 'BOL-883117', 'Wilmington, NC', 'Greenville, SC', 245, 12000, 'Dry Van 53ft', 'dry_van',
   1050, now() + interval '3 days 9 hours', now() + interval '3 days 20 hours', 'open', 'Port Logistics', 'Carolina Co-op Board',
   34.226, -77.945, 34.853, -82.394),
  ('load_883230', 'BOL-883230', 'Raleigh, NC', 'Durham, NC', 26, 3200, 'Box Truck 26ft', 'box_truck',
   180, now() + interval '5 hours', now() + interval '9 hours', 'open', 'Triangle Furniture', 'Haley Logistics Board',
   35.78, -78.639, 35.994, -78.899),
  ('load_883411', 'BOL-883411', 'Greensboro, NC', 'Winston-Salem, NC', 34, 4100, 'Box Truck 26ft', 'box_truck',
   210, now() + interval '1 day 2 hours', now() + interval '1 day 7 hours', 'open', 'Triad Wholesale', 'Raleigh Freight Board',
   36.073, -79.792, 36.0999, -80.2442)
on conflict (id) do nothing;
