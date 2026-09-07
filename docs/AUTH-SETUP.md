# Auth & email setup — operator checklist

The new sign-in screen at `truckbuddy.online/auth` is fully wired in code.
The following steps must be completed in the Supabase + Google Cloud
dashboards for everything to actually work in production. None of this
is guesswork — every checkbox below maps to a specific feature on the
auth page.

## Why emails weren't arriving

`src/app/auth/actions.ts` calls `sb.auth.signUp({...})` correctly.
That hands off to Supabase Auth, which is responsible for sending the
confirmation email. If that email isn't arriving, it's almost always one
of three things — and **all three are configured in the Supabase
dashboard, not in this codebase**:

1. **Email Auth → "Confirm email" is OFF.** In Supabase, go to
   `Authentication → Providers → Email`. The toggle **"Confirm email"**
   must be **ON** for sign-ups to receive a verification link. If it's
   OFF, the API still returns a session immediately, but the user never
   receives anything.
2. **No SMTP customizer is set + free-tier rate-limited.** On the
   Supabase free tier, the built-in email sender is shared and frequently
   rate-limited. Check `Authentication → Logs` for the entry — if it says
   "rate limit exceeded" or "email not sent", you need to either upgrade
   the Supabase plan or hook a real provider (Resend, Postmark, SendGrid)
   via `Authentication → Email Templates → SMTP Settings`. **Resend is
   already used for the cab-app `dispatch-send` Edge Function** — reuse
   the same `RESEND_API_KEY` secret you already have in Supabase.
3. **The email landed in spam.** The from-address is something like
   `noreply@mail.app.supabase.io` by default. Setting a custom SMTP
   sender (e.g. `Truck Buddy <hello@truckbuddy.online>`) fixes
   deliverability for good.

### Concrete steps

1. **Supabase dashboard** → `Authentication → Providers → Email`
   - Toggle **Confirm email**: **ON**
   - Set a "from" address: `Truck Buddy <hello@truckbuddy.online>`
2. **Supabase dashboard** → `Authentication → Email Templates`
   - Open the **Confirm signup** template
   - Replace the subject + body with a brand-on email (logo, "Welcome
     to Truck Buddy", confirmation link, support email). The template
     supports `{{ .ConfirmationURL }}` and `{{ .Email }}`.
3. **Supabase dashboard** → `Authentication → URL Configuration`
   - **Site URL:** `https://truckbuddy.online`
   - **Additional redirect URLs:** add both:
     - `https://truckbuddy.online/account`
     - `https://truckbuddy.online/portal`
4. **(Optional but recommended) Custom SMTP via Resend**
   - `Authentication → Providers → Email → SMTP Settings`
   - Enable "Custom SMTP"
   - Host: `smtp.resend.com`, Port `465`, Username `resend`, Password =
     the `RESEND_API_KEY` already in your Supabase secrets
   - Sender: `Truck Buddy <hello@truckbuddy.online>`
   - This routes ALL auth emails through Resend, same as the cab-app's
     `dispatch-send` function.

## Google sign-in

The new auth page has a real **"Continue with Google"** button at the
top. The Supabase client already calls `signInWithOAuth({ provider:
'google' })` in `web/src/lib/supabase-client.ts`. To make this work:

### In Google Cloud Console

1. Go to `console.cloud.google.com` → pick (or create) the
   `truckbuddy.online` project.
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
     - `https://bxjtmcumkffcbzuhusxn.supabase.co`  ← your project ref
   - Authorized redirect URIs:
     - `https://bxjtmcumkffcbzuhusxn.supabase.co/auth/v1/callback`
   - Save → copy the **Client ID** and **Client Secret**.

### In Supabase dashboard

1. `Authentication → Providers → Google`:
   - Toggle **Enabled** ON
   - Paste **Client ID** + **Client Secret** from the step above
   - Scopes: `email` (default)
   - Save.
2. The button on `truckbuddy.online/auth` will now route users to Google
   consent and back to `/portal` on success.

## What was changed in code

| File | What | Why |
|------|------|-----|
| `web/src/app/auth/page.tsx` | New hero split layout: left panel = brand message + mascot graphic, right panel = form card | The previous page was a centered plain card on a gray background — zero brand presence. |
| `web/src/app/auth/auth-form.tsx` | Google OAuth button, "Forgot password?" inline, resend confirmation, better error/notice styling, gradient CTA, hero typography | Adds the three requested features (Google, working email flow UX, better-looking auth) |
| `web/src/components/truck-buddy-mark.tsx` | New SVG cartoon truck mark (vector) | The "TB" tile has been replaced with the real brand mascot so the brand is consistent everywhere. |
| `web/src/components/brand-logo.tsx` | Header logo now uses the new mascot SVG instead of the "TB" tile | Same — used in the sticky header across all pages. |
| `web/src/components/icons.tsx` | Added `GoogleIcon` (multicolor "G") | Required for the new Google button. |
| `web/src/lib/supabase-client.ts` | Added `resendConfirmation()` helper | Drives the "Resend confirmation" link. |
| `web/public/truckbuddy-logo.jpg`, `logo-glow.png` | Copied from `assets/images/` | Public assets the auth page references. |
| `website/favicon.svg`, `website/og-image.svg` | Recreated with the cartoon mascot + orange/blue brand | The static marketing site now matches the new auth screen. |
| `website/index.html` | Replaced the "TB" header mark with an inline cartoon SVG; updated meta description with the new tagline | The full marketing site now feels like one product, not two. |

## What was NOT changed (intentional)

- The mobile `src/constants/brand.ts` and Expo app — those keep the
  Inter font + blue/orange brand tokens they already had, which match
  the new mascot.
- The Supabase schema, RLS, Edge Function, or any backend route. None
  of that needed to change for this work.
- The `actions.ts` server actions. They were already correct; only the
  UI around them was rebuilt.

## Verification

- `npx tsc --noEmit` → clean (had to install missing `@types/react` and
  `@types/react-dom` for the project; the same fix is needed on the
  `main` branch — that was a pre-existing issue affecting every TSX
  file in `web/`, not just the new auth code).
- `npx next build` → clean, `/auth` route 3.85 kB + 179 kB shared.
- `npx next lint` → broken on this repo for unrelated reasons (the
  root `eslint.config.js` imports `eslint-config-expo/flat` which is
  the cab-app config; pre-existing, not from this change).

## To deploy

```bash
# in the worktree
git add -A
git commit -m "feat(auth): hero sign-in redesign with cartoon mascot, Google OAuth, password reset, resend confirmation"
git push -u origin fix/auth-hero-and-google
# then PR into main; Vercel will pick it up on merge
```

No environment variable changes are required for this work — all new
features use the existing `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` already in Vercel. Google + SMTP setup
is done in dashboards, not in code.
