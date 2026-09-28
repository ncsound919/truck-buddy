-- ============================================================================
-- 0002 — Social core: groups, posts, media, likes, comments, follows.
-- ============================================================================
-- Normalised Supabase port of the TruckBuddy-Social Firestore model, merged
-- with truckers-social-app-plan.md §2. Field mapping from Firestore:
--   users/{uid}                  -> public.profiles          (migration 0001)
--   posts/{id}                   -> public.posts
--     .content                   -> posts.content
--     .caption                   -> posts.caption
--     .mediaUrl                  -> posts -> post_media (row)
--     .postType 'image'          -> post_type 'photo'
--     .upvotedUserIds[]          -> public.likes (join table)
--     .likesCount/commentsCount  -> trigger-maintained counters
--   posts/{id}/comments/{cid}    -> public.comments
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.post_type as enum ('text', 'photo', 'video', 'poll', 'link', 'road_report');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.group_visibility as enum ('public', 'private', 'restricted');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.group_member_role as enum ('member', 'moderator', 'owner');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Groups (association chapters / carriers / regions)
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  visibility public.group_visibility not null default 'public',
  cover_image_url text,
  category text,
  member_count int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_groups_visibility on public.groups (visibility, created_at desc);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user
  on public.group_members (user_id) ;

create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Posts & media
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  post_type public.post_type not null default 'photo',
  content text,
  caption text check (caption is null or char_length(caption) <= 2200),
  tags text[] not null default '{}',
  location_name text,
  latitude double precision,
  longitude double precision,
  like_count int not null default 0,
  comment_count int not null default 0,
  is_removed boolean not null default false,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_posts_feed on public.posts (created_at desc) where is_removed = false;
create index if not exists idx_posts_author on public.posts (author_id, created_at desc);
create index if not exists idx_posts_group on public.posts (group_id, created_at desc) where group_id is not null;
create index if not exists idx_posts_tags on public.posts using gin (tags);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position int not null default 0,
  width int,
  height int,
  duration_seconds int,
  created_at timestamptz not null default now()
);
create index if not exists idx_post_media_post on public.post_media (post_id, position);

-- ---------------------------------------------------------------------------
-- Engagement
-- ---------------------------------------------------------------------------
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists idx_likes_user on public.likes (user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  like_count int not null default 0,
  is_removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_post on public.comments (post_id, created_at);
create index if not exists idx_comments_parent on public.comments (parent_comment_id);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists idx_follows_following on public.follows (following_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER so group-membership checks don't recurse
-- through group_members' own policies).
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(p_group uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group and gm.user_id = p_user
  );
$$;

create or replace function public.can_view_group(p_group uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = p_group
      and (
        g.visibility = 'public'
        or public.is_group_member(g.id, auth.uid())
        or g.created_by = auth.uid()
      )
  );
$$;

create or replace function public.is_group_admin(p_group uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'moderator')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;

do $$
begin
  -- groups
  create policy "Read visible groups" on public.groups
    for select to authenticated using (
      visibility = 'public'
      or public.is_group_member(id, auth.uid())
      or created_by = auth.uid()
    );
  create policy "Create groups" on public.groups
    for insert to authenticated with check (created_by = auth.uid());
  create policy "Admins update groups" on public.groups
    for update to authenticated
    using (public.is_group_admin(id) or created_by = auth.uid())
    with check (public.is_group_admin(id) or created_by = auth.uid());
  create policy "Owner deletes groups" on public.groups
    for delete to authenticated using (created_by = auth.uid());

  -- group_members
  create policy "Read own / peer memberships" on public.group_members
    for select to authenticated using (
      user_id = auth.uid() or public.is_group_member(group_id, auth.uid())
    );

  -- group_join_requests
  create policy "Read own join requests" on public.group_join_requests
    for select to authenticated using (
      user_id = auth.uid() or public.is_group_admin(group_id)
    );
  create policy "Request to join" on public.group_join_requests
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Admins resolve join requests" on public.group_join_requests
    for update to authenticated
    using (public.is_group_admin(group_id) or user_id = auth.uid())
    with check (public.is_group_admin(group_id) or user_id = auth.uid());

  -- posts
  create policy "Read visible posts" on public.posts
    for select to authenticated using (
      is_removed = false and (group_id is null or public.can_view_group(group_id))
    );
  create policy "Create own posts" on public.posts
    for insert to authenticated with check (author_id = auth.uid());
  create policy "Authors update posts" on public.posts
    for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
  create policy "Authors delete posts" on public.posts
    for delete to authenticated using (author_id = auth.uid());

  -- post_media
  create policy "Read media of visible posts" on public.post_media
    for select to authenticated using (
      exists (select 1 from public.posts p where p.id = post_id and not p.is_removed)
    );
  create policy "Authors add media" on public.post_media
    for insert to authenticated with check (
      exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    );
  create policy "Authors remove media" on public.post_media
    for delete to authenticated using (
      exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    );

  -- likes
  create policy "Read likes" on public.likes
    for select to authenticated using (true);
  create policy "Like as self" on public.likes
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Unlike as self" on public.likes
    for delete to authenticated using (user_id = auth.uid());

  -- comments
  create policy "Read comments" on public.comments
    for select to authenticated using (is_removed = false);
  create policy "Write own comments" on public.comments
    for insert to authenticated with check (author_id = auth.uid());
  create policy "Authors update comments" on public.comments
    for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
  create policy "Authors delete comments" on public.comments
    for delete to authenticated using (author_id = auth.uid());

  -- comment_likes
  create policy "Read comment likes" on public.comment_likes
    for select to authenticated using (true);
  create policy "Like comments as self" on public.comment_likes
    for insert to authenticated with check (user_id = auth.uid());
  create policy "Unlike comments as self" on public.comment_likes
    for delete to authenticated using (user_id = auth.uid());

  -- follows
  create policy "Read follows" on public.follows
    for select to authenticated using (true);
  create policy "Follow as self" on public.follows
    for insert to authenticated with check (follower_id = auth.uid());
  create policy "Unfollow as self" on public.follows
    for delete to authenticated using (follower_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Counter maintenance
-- ---------------------------------------------------------------------------
create or replace function public.tg_likes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.tg_comments_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.tg_comment_likes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
  else
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

create or replace function public.tg_follows_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set follower_count  = follower_count  + 1 where id = new.following_id;
  else
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set follower_count  = greatest(follower_count  - 1, 0) where id = old.following_id;
  end if;
  return null;
end;
$$;

create or replace function public.tg_posts_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set post_count = greatest(post_count - 1, 0) where id = old.author_id;
  end if;
  return null;
end;
$$;

create or replace function public.tg_group_members_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.groups set member_count = member_count + 1 where id = new.group_id;
  else
    update public.groups set member_count = greatest(member_count - 1, 0) where id = old.group_id;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_counter on public.likes;
create trigger likes_counter
  after insert or delete on public.likes
  for each row execute function public.tg_likes_counter();

drop trigger if exists comments_counter on public.comments;
create trigger comments_counter
  after insert or delete on public.comments
  for each row execute function public.tg_comments_counter();

drop trigger if exists comment_likes_counter on public.comment_likes;
create trigger comment_likes_counter
  after insert or delete on public.comment_likes
  for each row execute function public.tg_comment_likes_counter();

drop trigger if exists follows_counter on public.follows;
create trigger follows_counter
  after insert or delete on public.follows
  for each row execute function public.tg_follows_counter();

drop trigger if exists posts_counter on public.posts;
create trigger posts_counter
  after insert or delete on public.posts
  for each row execute function public.tg_posts_counter();

drop trigger if exists group_members_counter on public.group_members;
create trigger group_members_counter
  after insert or delete on public.group_members
  for each row execute function public.tg_group_members_counter();

drop trigger if exists groups_updated_at on public.groups;
create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.update_updated_at();

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.update_updated_at();

-- Auto-enroll a group's creator as its owner.
create or replace function public.tg_group_creator_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists group_creator_membership on public.groups;
create trigger group_creator_membership
  after insert on public.groups
  for each row execute function public.tg_group_creator_membership();

-- ---------------------------------------------------------------------------
-- Feed RPC — "For You": recent public posts, lightly engagement-weighted.
-- SECURITY INVOKER so the caller's RLS still applies.
-- ---------------------------------------------------------------------------
create or replace function public.get_feed(
  p_cursor timestamptz default null,
  p_limit int default 20
)
returns setof public.posts
language sql stable security invoker
as $$
  select p.*
  from public.posts p
  left join public.follows f
    on f.following_id = p.author_id
   and f.follower_id = auth.uid()
  where not p.is_removed
    and p.group_id is null
    and p.created_at < coalesce(p_cursor, now())
    and (
      f.follower_id is not null
      or p.created_at > now() - interval '72 hours'
    )
  order by
    (p.like_count + p.comment_count * 2) desc,
    p.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;
