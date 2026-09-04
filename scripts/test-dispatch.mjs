#!/usr/bin/env node
// scripts/test-dispatch.mjs
//
// Send a test email through the deployed dispatch-send Edge Function.
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_ANON_KEY=eyJ... \
//   TO_EMAIL=you@example.com \
//   node scripts/test-dispatch.mjs
//
// The function must be deployed with RESEND_API_KEY and (optionally) EMAIL_FROM
// already set in Supabase secrets. The receiver's address must be allowed by
// Resend (use onboarding@resend.dev for free-tier testing, or a domain you own).

const base = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const to = process.env.TO_EMAIL;

if (!base || !anon || !to) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or TO_EMAIL in env.');
  process.exit(2);
}

const url = `${base.replace(/\/$/, '')}/functions/v1/dispatch-send`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anon}`,
  },
  body: JSON.stringify({
    kind: 'email',
    to,
    subject: 'Truck Buddy dispatch-send smoke test',
    body: 'If you can read this, the Edge Function is wired to Resend.\n— Truck Buddy',
  }),
});

const text = await res.text();
let body;
try { body = JSON.parse(text); } catch { body = text; }

console.log(`status: ${res.status}`);
console.log(JSON.stringify(body, null, 2));
process.exit(res.ok ? 0 : 1);
