# Truck Buddy — engineering notes

> Expo SDK has changed a lot. Read the exact versioned docs at
> https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Two apps share this repo — do not cross the streams
- **Cab app (this agent's job):** Expo/React Native under the repo root + `src/`.
  Entry `src/app/`, domain in `src/domain/`, API seam `src/services/`, state in
  `src/store/`.
- **Web marketing/portal (the OTHER agent's job):** a Next.js app under `web/`
  (own tsconfig/package.json) and a static page under `website/`.

Rules:
- Do **not** edit `web/`, `website/`, or `src/app/profile.tsx`-style files the
  other agent owns. Work in **separate branches/worktrees** to avoid clobbering.
- `metro.config.js` ignores `web`/`website` so the cab dev server won't watch
  Next's churning `.next` (it crashes the Metro watcher otherwise).
- Root `tsconfig.json` excludes `web`, `website`, `__tests__`, `dist`, `.expo`.
  The `__tests__/` Jest files are the other agent's (Jest types/config are
  theirs to finish). Typecheck the app with `npx tsc --noEmit` and `npx expo lint`.

## Verify
- `npx tsc --noEmit`, `npx expo lint`
- `npm run test:e2e` → Playwright against the web build. Needs Metro serving on
  :8081 first (`npx expo start`). On web, camera/on-device-OCR/GPS use fallback
  paths (they are native-only), so e2e validates workflow + state + UI logic.
- `npm run android` → native dev build for a device (real camera + ML Kit OCR +
  GPS). Note: `react-native-mlkit-ocr` needed a Gradle-9 fix; it is persisted as
  a patch-package (`patches/`) and auto-applied by the `postinstall` script.

## Honest seams (no fake wires)
The UI/state machine is real. Everything the app dispatches runs through
`sendDispatch` in `src/services/truck-buddy-api.ts`.

| Kind | Transport | Status |
|------|-----------|--------|
| Email (doc-forward, EOD report, fault alert) | `dispatchTransport='mock'`: in-app log only. `dispatchTransport='live'`: Supabase Edge Function → Resend. | ✅ email is wired when `dispatchTransport='live'`. Config in `app.json` `extra.supabaseUrl` + `extra.supabaseAnonKey`. |
| SMS (arrival, consignee text) | Twilio/Bandwidth | ❌ mock only. Wire the same way when you add a provider. |
| Voice call | Twilio voice | ❌ mock only. |
| OCR | ML Kit on device (native) / canned fallback (web) | ✅ native only; web uses demo path. |
| GPS | `expo-location` on device / last-known stub (web) | ✅ native only. |
| Repair auto-ticket | `sendDispatch('email')` → same Resend path | ✅ same as email above. |
| Shared road advisories (read) | `src/services/shared-data.ts` → PostgREST `road_reports` with the anon key from `app.json` extra | ✅ real, read-only. `road_reports` carries a scoped anon-read policy for active rows; all other social tables stay authenticated-only. |

`dispatchTransport` defaults to `'mock'`. Set to `'live'` in the My Tools panel once the Edge Function is deployed.

## Shared backend across the three apps
The cab app, the web portal (`web/`) and the social app (separate repo
`TruckBuddy-Social`, now migrated off Firebase) all point at the **same Supabase
project** (`ennaghywpvlnprsqqzmq`) and the same identity — `auth.users.id`. The
shared schema, RLS, counters, storage buckets and Realtime publication live in
`supabase/migrations/` (applied + recorded in `supabase_migrations`). The web
portal persists its operating profile in `public.profiles.metadata.operatingProfile`
(`web/src/app/api/portal/profile/route.ts`), and the cab app reads shared road
advisories through `src/services/shared-data.ts`.

## AetherRoute dispatch merge (ops + document tables)
AetherRoute now persists to the same project. Two migration families in
`supabase/migrations/`:
- `*_aetherroute_ops_tables.sql` — relational dispatch model keyed to
  `organizations`: `vehicles`, `driver_roster`, `orders`, `routes`, `stops`,
  `location_pings`, with RLS via `is_org_member` / `is_org_admin` and
  driver-scoped ping/stop policies. The cab reads `routes`/`stops`/`vehicles`
  here by the signed-in user's uid (`src/services/live-assignment.ts`).
- `*_aetherroute_document_tables.sql` — `ar_orders/ar_drivers/ar_routes/ar_pings/
  ar_idempotency` JSONB documents; RLS on with no client policies, so only the
  service-role key (server) can touch them.

AetherRoute server env: `SUPABASE_URL` + `SUPABASE_ANON_KEY` (user-token
verification) **and** `SUPABASE_SERVICE_ROLE_KEY` (write-through store +
ops mirror). Without the service key AetherRoute runs in in-memory mode
(`mode: 'memory'`). A driver only appears in the ops tables once its AetherRoute
record carries `orgId` + `authUserId`; the mirror no-ops otherwise.
Credentials for the CLI/`db push` are in `supabase.txt` (git-ignored).

Additional AetherRoute env (all optional; each degrades honestly when unset):
- `AETHERROUTE_ORG_ID` — one active org per session; scopes reads/writes and
  rejects non-members.
- `RESEND_API_KEY` + `EMAIL_FROM` — real email (via the outbox). Unset → email
  is composed only and labelled `demo`, never "sent".
- `POD_SIGNING_SECRET` — HMAC for POD upload tokens; unset uses an ephemeral
  dev secret (never rely on that in production).
- `VROOM_URL` — self-hosted VROOM; unset solves in-process.
- `OUTBOX_PATH` (default `data/outbox.jsonl`), `ALLOW_PRIVATE_WEBHOOKS=true`
  (local webhook targets only).

Outbound webhooks are signed per Standard Webhooks (`webhook-id`,
`webhook-timestamp`, `webhook-signature`). Retention: `private.purge_stale_social()`
is scheduled with pg_cron when available, else run it manually.



## Email transport stack
```
Cab app (sendDispatch)
  → MockTruckBuddyApi.sendDispatch (branches on dispatchTransport)
      → fetch() → POST /functions/v1/dispatch-send
          → Supabase Edge Function (Deno, server-side)
              → https://api.resend.com/emails (POST, token never exposed to client)
                  → inbox
```
Secrets required (never in the repo):
- `RESEND_API_KEY` → Supabase secret (set with `supabase secrets set`)
- `EMAIL_FROM` → Supabase secret (e.g. `Truck Buddy <dispatch@yourdomain.example>`)
- `app.json extra.supabaseUrl` + `extra.supabaseAnonKey` → checked into the repo (safe; anon key is public by design)

## Cab feature map
- Run tracker: detention logger (auto per completed stop), on-duty clock + break
  (`src/hooks/use-now.ts`), fatigue checks, fault triage.
- Auto-pilot prefs (`DriverPrefs` in `src/domain/types.ts`, defaults + migration
  in `src/domain/data.ts`): remembered GPS, auto doc-forward on capture,
  auto end-of-day report, auto fault→fleet alert (once/shift), and a **gated**
  consignee arrival text (off by default, explicit consent in My Tools).

## Deploying the dispatch function
```bash
# 1. Link to your Supabase project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 2. Set secrets
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM="Truck Buddy <dispatch@yourdomain.example>"

# 3. Configure the cab app
#    In app.json, set:
#    "extra": {
#      "supabaseUrl": "https://YOUR_PROJECT_REF.supabase.co",
#      "supabaseAnonKey": "eyJ...",
#      "dispatchFunctionPath": "/functions/v1/dispatch-send"
#    }

# 4. Deploy the function
supabase functions deploy dispatch-send

# 5. Smoke-test (from repo root) — with a *user* access token (sign in via any app),
#    not the anon key. DISPATCH_SEND_ALLOW_ANON=true on the function is the local-dev
#    escape hatch, never set it in production.
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
SUPABASE_ACCESS_TOKEN=eyJ... \
TO_EMAIL=you@example.com \
node scripts/test-dispatch.mjs

# 6. In the cab app: My Tools → "Send email through the live server" → ON
```
