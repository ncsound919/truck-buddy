# Truckers Association Social App — Build Plan

A Facebook/Instagram-style social platform for the trucking community, built on React + Vite + Supabase + Vercel, deployed as a mobile-first PWA.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Client (PWA)                               │
│  React + Vite + TypeScript                  │
│  Tailwind CSS · React Router · TanStack     │
│  Query · Capacitor wrapper (later)          │
└──────────────────┬──────────────────────────┘
                   │ HTTPS (Supabase JS SDK)
┌──────────────────▼──────────────────────────┐
│  Supabase Project                           │
│  ├─ Postgres (Row Level Security on)        │
│  ├─ Auth (email + phone/SMS OTP)            │
│  ├─ Storage (post media, avatars)           │
│  ├─ Realtime (comments, notifications)      │
│  └─ Edge Functions (feed ranking, moderation)│
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Vercel                                     │
│  Frontend hosting · preview deploys ·        │
│  serverless API routes (webhooks, extras)   │
└─────────────────────────────────────────────┘
```

**Principles**
- Mobile-first, designed for low bandwidth: lazy-loaded video, client-side image compression, offline draft queueing
- RLS is the security boundary — the client talks to Postgres directly, no custom REST layer needed
- Start with a recency + engagement-weighted feed query; no recommendation engine until there's engagement data
- Moderation hooks from day one (report flow + admin queue)

---

## 2. Supabase Schema (SQL)

### 2.1 Enums

```sql
create type user_role as enum ('driver', 'carrier', 'shop', 'association', 'admin', 'moderator');
create type post_type as enum ('photo', 'video', 'text', 'road_report', 'link');
create type group_visibility as enum ('public', 'private', 'restricted');
create type group_member_role as enum ('member', 'moderator', 'owner');
create type listing_status as enum ('active', 'sold', 'expired', 'removed');
create type notification_type as enum ('like', 'comment', 'follow', 'group_invite', 'group_join_request', 'mention', 'system');
create type report_reason as enum ('spam', 'harassment', 'inappropriate', 'misinformation', 'other');
```

### 2.2 Profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text not null,
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  role user_role not null default 'driver',
  -- trucking-specific
  cdl_class text,                    -- 'A', 'B', 'C'
  years_experience int,
  current_rig text,                  -- e.g. 'Freightliner Cascadia'
  home_base text,                    -- city/state
  lanes text[],                      -- e.g. '{"I-80 Midwest", "Southeast regional"}'
  carrier_name text,
  is_verified boolean default false, -- association-verified drivers
  follower_count int default 0,
  following_count int default 0,
  post_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 2.3 Posts & Media

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,  -- null = public feed
  post_type post_type not null default 'photo',
  caption text check (char_length(caption) <= 2200),
  tags text[],                       -- {'#Freightliner', '#flatbed'}
  location_name text,                -- 'I-40 exit 310, NC'
  location_geo point,                -- lat/lng for road reports
  like_count int default 0,
  comment_count int default 0,
  is_removed boolean default false,
  removed_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  storage_path text not null,        -- 'posts/{post_id}/img-01.webp'
  media_type text not null,          -- 'image' | 'video'
  position int not null default 0,   -- carousel ordering
  width int, height int,             -- for layout without CLS
  duration_seconds int               -- videos
);
```

### 2.4 Engagement

```sql
create table likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade, -- threaded replies
  body text not null check (char_length(body) <= 1000),
  like_count int default 0,
  is_removed boolean default false,
  created_at timestamptz default now()
);

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
```

### 2.5 Groups (Association Chapters)

```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  visibility group_visibility not null default 'public',
  cover_image_url text,
  category text,                     -- 'association', 'carrier', 'region', 'freight_type'
  member_count int default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role group_member_role not null default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz default now(),
  unique (group_id, user_id)
);
```

### 2.6 Road Reports (Phase 3 — schema now, UI later)

```sql
create table road_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  report_type text not null,         -- 'scale', 'parking', 'shipper', 'fuel', 'weather', 'inspection'
  title text not null,
  body text,
  location_geo point not null,
  location_name text,
  expires_at timestamptz,            -- road reports go stale
  upvote_count int default 0,
  created_at timestamptz default now()
);
```

### 2.7 Marketplace (Phase 3)

```sql
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(12,2),
  category text not null,            -- 'parts', 'equipment', 'truck', 'trailer', 'service'
  condition text,                    -- 'new', 'used', 'refurbished'
  location text,
  status listing_status not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  position int not null default 0
);
```

### 2.8 Notifications & Moderation

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type notification_type not null,
  entity_id uuid,                    -- post/comment id
  read_at timestamptz,
  created_at timestamptz default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null,         -- 'post' | 'comment' | 'profile' | 'listing'
  target_id uuid not null,
  reason report_reason not null,
  details text,
  status text not null default 'open', -- 'open' | 'actioned' | 'dismissed'
  created_at timestamptz default now()
);

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references profiles(id),
  report_id uuid references reports(id),
  action text not null,              -- 'remove_content' | 'ban_user' | 'warn' | 'dismiss'
  notes text,
  created_at timestamptz default now()
);
```

### 2.9 Indexes & Performance

```sql
create index idx_posts_feed on posts (created_at desc) where is_removed = false;
create index idx_posts_author on posts (author_id, created_at desc);
create index idx_posts_group on posts (group_id, created_at desc) where group_id is not null;
create index idx_posts_tags on posts using gin (tags);
create index idx_notifications_recipient on notifications (recipient_id, created_at desc) where read_at is null;
create index idx_road_reports_geo on road_reports using gist (location_geo);
create index idx_listings_status on listings (category, status, created_at desc);
```

### 2.10 Row Level Security (core policies)

```sql
alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table follows enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;

-- profiles: public read, self-update
create policy "profiles are public" on profiles for select using (true);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- posts: read if not removed (and group is public/member); write own
create policy "read visible posts" on posts for select
  using (not is_removed and (
    group_id is null
    or exists (
      select 1 from groups g
      where g.id = posts.group_id
        and (g.visibility = 'public'
             or exists (select 1 from group_members gm
                        where gm.group_id = g.id and gm.user_id = auth.uid()))
    )
  ));
create policy "create own posts" on posts for insert with check (author_id = auth.uid());
create policy "delete own posts" on posts for delete using (author_id = auth.uid());

-- comments / likes: read on visible posts, write as self
create policy "read comments" on comments for select using (not is_removed);
create policy "write own comments" on comments for insert with check (author_id = auth.uid());
create policy "read likes" on likes for select using (true);
create policy "like as self" on likes for insert with check (user_id = auth.uid());
create policy "unlike as self" on likes for delete using (user_id = auth.uid());

-- notifications: only your own
create policy "read own notifications" on notifications for select using (recipient_id = auth.uid());

-- reports: anyone can file, only moderators read
create policy "file reports" on reports for insert with check (reporter_id = auth.uid());
```

### 2.11 Counter Maintenance (triggers)

```sql
create or replace function bump_counters() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if (tg_table_name = 'likes') then
      update posts set like_count = like_count + 1 where id = new.post_id;
    elsif (tg_table_name = 'comments') then
      update posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif (tg_table_name = 'follows') then
      update profiles set following_count = following_count + 1 where id = new.follower_id;
      update profiles set follower_count = follower_count + 1 where id = new.following_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if (tg_table_name = 'likes') then
      update posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    elsif (tg_table_name = 'comments') then
      update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    elsif (tg_table_name = 'follows') then
      update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
      update profiles set follower_count = greatest(follower_count - 1, 0) where id = old.following_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger likes_counter after insert or delete on likes
  for each row execute function bump_counters();
create trigger comments_counter after insert or delete on comments
  for each row execute function bump_counters();
create trigger follows_counter after insert or delete on follows
  for each row execute function bump_counters();
```

---

## 3. Storage Buckets

| Bucket | Access | Contents | Limits |
|---|---|---|---|
| `avatars` | Public read | Profile images | 2 MB, images only |
| `post-media` | Public read | Post images/video | 10 MB image / 100 MB video |
| `group-covers` | Public read | Group cover images | 5 MB |
| `listing-media` | Public read | Marketplace photos | 10 MB |
| `reports-evidence` | Private | Moderation evidence | Mod-only access |

Client-side pipeline before upload: `browser-image-compression` → WebP at ~1280px (~200 KB), video capped at 60 s, uploaded with a resumable upload for low-bandwidth areas.

---

## 4. Frontend Structure (React + Vite)

### 4.1 Directory Layout

```
src/
├── main.tsx
├── App.tsx
├── routes/
│   ├── index.tsx                      # app router (createBrowserRouter)
│   ├── auth-guard.tsx                 # protected route wrapper
│   └── routes.ts                      # typed route constants
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── OnboardingPage.tsx     # trucking profile questions
│   │   ├── components/
│   │   │   ├── PhoneOtpForm.tsx
│   │   │   └── OnboardingSteps.tsx
│   │   └── hooks/useAuth.ts
│   ├── feed/
│   │   ├── pages/FeedPage.tsx         # home — "For You" + "Following" tabs
│   │   ├── components/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostComposer.tsx
│   │   │   ├── MediaCarousel.tsx
│   │   │   ├── TagInput.tsx
│   │   │   └── FeedTabs.tsx
│   │   └── hooks/
│   │       ├── useFeed.ts             # infinite query (TanStack)
│   │       └── useCreatePost.ts
│   ├── posts/
│   │   ├── pages/PostDetailPage.tsx
│   │   └── components/
│   │       ├── CommentThread.tsx
│   │       ├── CommentItem.tsx
│   │       └── ReportDialog.tsx
│   ├── profile/
│   │   ├── pages/
│   │   │   ├── ProfilePage.tsx
│   │   │   └── EditProfilePage.tsx
│   │   └── components/
│   │       ├── RigBadge.tsx           # CDL / rig / lanes display
│   │       ├── ProfileStats.tsx
│   │       └── UserPostGrid.tsx       # Instagram-style grid
│   ├── groups/
│   │   ├── pages/
│   │   │   ├── GroupDirectoryPage.tsx
│   │   │   ├── GroupPage.tsx
│   │   │   └── CreateGroupPage.tsx
│   │   └── components/
│   │       ├── GroupCard.tsx
│   │       └── JoinRequestButton.tsx
│   ├── discover/
│   │   ├── pages/DiscoverPage.tsx     # trending tags, people, groups
│   │   └── components/TagCloud.tsx
│   ├── notifications/
│   │   ├── pages/NotificationsPage.tsx
│   │   └── hooks/useRealtimeNotifications.ts
│   ├── marketplace/                   # Phase 3 — scaffold only
│   │   └── pages/MarketplacePage.tsx
│   ├── road-reports/                  # Phase 3 — scaffold only
│   │   └── pages/RoadReportsPage.tsx
│   └── moderation/                    # admin-only
│       ├── pages/ModerationQueuePage.tsx
│       └── components/ReportRow.tsx
├── components/
│   ├── ui/                            # buttons, modals, skeletons (shadcn-style)
│   ├── layout/
│   │   ├── AppShell.tsx               # bottom nav (mobile) + top bar
│   │   ├── BottomNav.tsx              # Feed / Discover / Create / Groups / Profile
│   │   └── TopBar.tsx                 # logo, notifications bell
│   └── media/
│       ├── CompressedImage.tsx        # blurhash placeholder + lazy load
│       └── VideoPlayer.tsx            # muted autoplay, tap for sound
├── lib/
│   ├── supabase.ts                    # client init
│   ├── compression.ts                 # image compress helpers
│   ├── offline-queue.ts               # IndexedDB draft queue
│   ├── schema.ts                      # generated DB types (supabase gen types)
│   └── pwa.ts                         # service worker registration
├── hooks/
│   ├── useInfiniteFeed.ts
│   └── useUploadMedia.ts
└── styles/
```

### 4.2 Route Map

| Route | Page | Access |
|---|---|---|
| `/` | FeedPage | Auth required |
| `/login`, `/signup` | Auth pages | Public |
| `/onboarding` | OnboardingPage | Auth required, once |
| `/discover` | DiscoverPage | Auth required |
| `/post/:id` | PostDetailPage | Auth required |
| `/u/:username` | ProfilePage | Public (SEO) |
| `/u/:username/followers` | FollowListPage | Auth required |
| `/groups` | GroupDirectoryPage | Auth required |
| `/g/:slug` | GroupPage | Member/visibility rules |
| `/g/new` | CreateGroupPage | Auth required |
| `/notifications` | NotificationsPage | Auth required |
| `/market` | MarketplacePage (stub) | Auth required |
| `/reports` | RoadReportsPage (stub) | Auth required |
| `/admin/moderation` | ModerationQueuePage | Admin/mod only |

### 4.3 Core Screens (wireframe descriptions)

**Feed (home)** — top bar with logo + notification bell; tabs "For You" / "Following"; PostCard: avatar, display name, rig badge (e.g. `CDL-A · 12 yrs`), timestamp, location line, media carousel with blurhash placeholders, caption with tappable tags, like/comment row. Bottom nav: Feed · Discover · + (create) · Groups · Profile.

**Post composer** — media picker (camera or gallery), client-side compression preview, caption with tag autocomplete (from a `tags` dictionary seeded with trucking terms), optional location ("Use current location" → reverse geocode), group selector (post to public feed or a group).

**Profile** — cover photo, avatar, stats (posts/followers/following), rig badge strip, bio, Follow/Edit button, then an Instagram-style 3-column media grid.

**Group page** — cover, member count, join button (or pending state for private groups), pinned posts, then group feed. Association chapters get a "verified association" badge.

**Notifications** — realtime via Supabase Realtime subscription on the `notifications` table; unread count badge on the bell.

### 4.4 Key Libraries

| Concern | Library | Why |
|---|---|---|
| Data fetching | TanStack Query | Infinite feed pagination, cache, optimistic likes |
| Styling | Tailwind CSS | Fast mobile-first iteration |
| Routing | React Router v7 | Standard, nested routes |
| Forms | React Hook Form + Zod | Onboarding + composer validation |
| Media | browser-image-compression, blurhash | Low-bandwidth friendliness |
| Offline | IndexedDB (idb-keyval) | Draft queue when signal drops |
| PWA | vite-plugin-pwa | Installable app, offline shell |
| Mobile later | Capacitor | Wrap for App Store/Play Store |

---

## 5. Feed Query (starting point)

```sql
-- "For You": recent posts from public feed + followed accounts,
-- lightly weighted by engagement. Run as a Postgres function
-- called from an RPC so RLS still applies.
create or replace function get_feed(
  p_cursor timestamptz,
  p_limit int default 20
) returns setof posts
language sql stable security invoker as $$
  select p.*
  from posts p
  left join follows f on f.following_id = p.author_id and f.follower_id = auth.uid()
  where not p.is_removed
    and p.group_id is null
    and p.created_at < coalesce(p_cursor, now())
    and (
      f.follower_id is not null                       -- people you follow
      or p.created_at > now() - interval '72 hours'   -- or recent public posts
    )
  order by
    (p.like_count + p.comment_count * 2) desc,        -- engagement signal
    p.created_at desc
  limit p_limit;
$$;
```

Keep it deterministic and explainable — no ML ranking until usage data justifies it.

---

## 6. Phased Roadmap

### Phase 1 — Core Social (Weeks 1–3)
- Auth (email + phone OTP), onboarding, profiles with trucking fields
- Create posts with compressed media, tags, location
- Feed (For You / Following), likes, threaded comments
- Follows, notifications (Realtime), basic report flow
- PWA shell deployed on Vercel, RLS verified with tests

### Phase 2 — Groups & Validation (Weeks 4–6)
- Public/private groups, join requests, group feeds, member roles
- Discover page (trending tags, suggested drivers/groups)
- Moderation queue for admins
- Landing page + recruitment posts in trucking Facebook groups
- Onboard a first cohort of 10–20 drivers for feedback

### Phase 3 — Trucking-Native Features (Weeks 7–12)
- Road reports (map view + feed, expiring entries)
- Marketplace scaffold (listings, categories, seller contact)
- Jobs board (carrier post-a-job flow — first monetization hook)
- Capacitor wrap for app stores

### Phase 4 — Monetization & Scale
- Promoted listings / boosted posts
- Association subscription tiers (branded private groups)
- Carrier recruiter accounts with job-post billing (Stripe)
- Content recommendation upgrade based on real engagement data

---

## 7. Non-Functional Checklist

- **Moderation**: report flow live in Phase 1; keyword blocklist on captions/comments; single-admin queue before scaling to community moderators
- **Privacy**: default profiles public, but support DMs-off and location-approximation (show region, not exact coordinates, on profiles)
- **Performance budget**: initial bundle < 200 KB gzipped; feed images lazy-loaded with blurhash; video never autoplays on cellular
- **Offline**: composer drafts persisted to IndexedDB; queued uploads retry on reconnect (core trucker scenario — dead zones)
- **Testing**: RLS policy tests (pgTAP or Supabase test helpers), Vitest for components, Playwright for the post → feed → comment critical path
- **Cost control**: Supabase free tier through Phase 1–2 (auth MAU caps, storage cleanup job for removed media), Vercel Hobby until custom domain + traffic justify Pro

---

## 8. Repository Conventions

- `main` protected; feature branches `feat/feed-infinite-scroll`, `fix/rls-post-visibility`
- `supabase/migrations/` — numbered SQL migrations committed to the repo
- `supabase/seed.sql` — seed tags, one association group, demo drivers
- CI on every PR: typecheck, lint, unit tests, RLS tests against a branch database
- Deployment: Vercel preview per PR; production deploy on merge to `main`
