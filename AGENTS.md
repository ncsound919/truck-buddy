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

`dispatchTransport` defaults to `'mock'`. Set to `'live'` in the My Tools panel once the Edge Function is deployed.

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

# 5. Smoke-test (from repo root)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
SUPABASE_ANON_KEY=eyJ... \
TO_EMAIL=you@example.com \
node scripts/test-dispatch.mjs

# 6. In the cab app: My Tools → "Send email through the live server" → ON
```
