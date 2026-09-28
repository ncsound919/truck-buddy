-- ============================================================================
-- 0001 — Unified identity: one profile for cab app, web portal, and social.
-- ============================================================================
-- All three clients authenticate against the same Supabase project and are
-- keyed by `auth.users.id`. This migration takes the portal's billing-oriented
-- `public.profiles` (see web/supabase/schema.sql) and extends it with the
-- driver / social fields the TruckBuddy-Social app (formerly Firebase
-- `users/{uid}`) needs, so a driver is the *same row* on every surface.
--
-- Idempotent: safe to re-run. If the portal schema has not been applied yet,
-- the base table is created here first.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Base table (fresh-project safety net). Mirrors web/supabase/schema.sql.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_tier text check (subscription_tier in ('basic', 'pro', 'enterprise')),
  subscription_status text check (subscription_status in ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  subscription_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Social role enum (distinct from org_memberships.role, which is an org RBAC).
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.user_role as enum
    ('driver', 'carrier', 'shop', 'association', 'admin', 'moderator');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Driver / social columns. Mirrors the Firestore `users/{uid}` document plus
-- the trucking fields from truckers-social-app-plan.md §2.2.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists role public.user_role not null default 'driver',
  add column if not exists cdl_class text,
  add column if not exists years_experience int,
  add column if not exists current_rig text,
  add column if not exists home_base text,
  add column if not exists lanes text[],
  add column if not exists carrier_name text,
  add column if not exists primary_corridor text,
  add column if not exists is_verified boolean not null default false,
  add column if not exists safe_miles int not null default 0,
  add column if not exists badges text[] not null default '{}',
  add column if not exists follower_count int not null default 0,
  add column if not exists following_count int not null default 0,
  add column if not exists post_count int not null default 0,
  add column if not exists last_seen_at timestamptz;

-- Backfill display_name from the portal's full_name / email local part.
update public.profiles
set display_name = coalesce(nullif(display_name, ''), nullif(full_name, ''), split_part(email, '@', 1))
where display_name is null or display_name = '';

-- Usernames are optional (portal-only accounts may never pick one) but unique
-- when present, case-insensitively.
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_verified on public.profiles (is_verified) where is_verified;
create index if not exists idx_profiles_corridor on public.profiles (primary_corridor);

-- Shape checks mirroring the Firestore rules (username <= 50, name <= 100,
-- bio <= 500).
do $$ begin
  alter table public.profiles add constraint profiles_username_len
    check (username is null or char_length(username) between 3 and 30);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_display_name_len
    check (display_name is null or char_length(display_name) <= 100);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 500);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   Portal policy allowed self-read only. The social feed needs every
--   signed-in driver to read other profiles (Firestore: `read if isSignedIn`).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

do $$ begin
  create policy "Signed-in users read profiles"
    on public.profiles for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users insert own profile"
    on public.profiles for insert to authenticated with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users update own profile"
    on public.profiles for update to authenticated
    using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Signup trigger: provision a profile row for every new auth user, minting a
-- unique username so the social app can render a handle immediately.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := regexp_replace(
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    '[^a-z0-9_]', '', 'g'
  );
  if base is null or char_length(base) < 3 then
    base := 'driver';
  end if;
  base := left(base, 24);

  candidate := base;
  while exists (select 1 from public.profiles p where lower(p.username) = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, email, full_name, display_name, username, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    candidate,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email        = excluded.email,
    full_name    = coalesce(public.profiles.full_name, excluded.full_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    username     = coalesce(public.profiles.username, excluded.username),
    avatar_url   = coalesce(public.profiles.avatar_url, excluded.avatar_url)
  ;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance (shared by profiles + social tables).
-- ---------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
