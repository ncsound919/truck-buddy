# Auth & email setup — operator checklist

The new sign-in screen at `truckbuddy.online/auth` is fully wired in code.
The following steps must be completed in the Supabase + Google Cloud
dashboards for everything to actually work in production.

## Status (completed via AgentBrowser on 2026-09-06)

| Setting | Status |
|---|---|
| Confirm email | ON (was already on) |
| Site URL | `https://truckbuddy.online` ✓ |
| Redirect URLs | `https://truckbuddy.online/account`, `https://truckbuddy.online/portal` ✓ |
| Email delivery | Working — confirmation email arrives via Resend |

## The one remaining item: Google OAuth

The auth page has a working **"Continue with Google"** button that calls
`signInWithOAuth({ provider: 'google' })`. It will not work until a real
Google OAuth Client ID + Secret is created and wired into Supabase.

### In Google Cloud Console

1. Go to `console.cloud.google.com` → pick (or create) the `truckbuddy.online` project.
2. `APIs & Services → OAuth consent screen`:
   - User type: **External**
   - App name: **Truck Buddy**
   - Support email: `hello@truckbuddy.online`
   - Authorized domains: `truckbuddy.online`, `supabase.co`
   - Scopes: `email`, `profile`, `openid`
3. `APIs & Services → Credentials → Create Credentials → OAuth client ID`:
   - Application type: **Web application**
   - Name: `Truck Buddy Auth`
   - Authorized JavaScript origins:
     - `https://truckbuddy.online`
     - `https://bxjtmcumkffcbzuhusxn.supabase.co`
   - Authorized redirect URIs:
     - `https://bxjtmcumkffcbzuhusxn.supabase.co/auth/v1/callback`
   - Save → copy the **Client ID** and **Client Secret**.

### In Supabase dashboard

1. `Authentication → Providers → Google`:
   - Toggle **Enabled** ON
   - Paste **Client ID** + **Client Secret** from the step above
   - Save.
2. The button on `truckbuddy.online/auth` will now route users to Google
   consent and back to `/portal` on success.

## What was changed in code

| File | What | Why |
|------|------|-----|
| `web/src/app/auth/page.tsx` | New hero split layout: left panel = brand message + mascot graphic, right panel = form card | Previous page was a centered plain card with zero brand presence. |
| `web/src/app/auth/auth-form.tsx` | Google OAuth button, "Forgot password?" inline, resend confirmation, better error/notice styling, gradient CTA | Adds the requested features (Google, working email flow UX, better-looking auth). |
| `web/src/components/truck-buddy-mark.tsx` | New SVG cartoon truck mark (vector) | Replaces the "TB" tile with the real brand mascot. |
| `web/src/components/brand-logo.tsx` | Header logo uses the mascot SVG instead of the "TB" tile | Consistent brand across all pages. |
| `web/src/components/icons.tsx` | Added `GoogleIcon` (multicolor "G") | Required for the Google button. |
| `web/src/lib/supabase-client.ts` | Added `resendConfirmation()` helper | Drives the "Resend confirmation" link. |
| `web/public/truckbuddy-logo.jpg`, `logo-glow.png` | Copied from `assets/images/` | Public assets the auth page references. |
| `website/favicon.svg`, `website/og-image.svg` | Recreated with the cartoon mascot + orange/blue brand | Static marketing site matches the new auth screen. |
| `website/index.html` | Replaced the "TB" header mark with an inline cartoon SVG; updated meta description with the new tagline | One consistent product. |

## Verification

- `npx tsc --noEmit` — clean (needed to install missing `@types/react` +
  `@types/react-dom`; pre-existing issue on `main` affecting every TSX file in `web/`).
- `npx next build` — clean, `/auth` route compiles.
- `npx next lint` — broken on this repo for unrelated reasons (root
  `eslint.config.js` imports `eslint-config-expo/flat`, the cab-app config).