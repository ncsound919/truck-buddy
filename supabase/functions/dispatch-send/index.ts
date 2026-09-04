// Supabase Edge Function: dispatch-send
//
// Single entry point for the cab app's outbound email. Calls Resend
// (https://resend.com/docs/api-reference/emails/send-email) and returns a
// structured result so the cab can fall back to its mock seam cleanly.
//
// Auth: requires the function to be called with the Supabase anon key in the
// `Authorization` header. The Resend key lives in a Supabase secret
// (`RESEND_API_KEY`) and never leaves the function.
//
// Deploy:
//   supabase functions deploy dispatch-send
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set EMAIL_FROM="Truck Buddy <dispatch@yourdomain.example>"
//
// Local test:
//   curl -i -X POST \
//     http://localhost:54321/functions/v1/dispatch-send \
//     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"kind":"email","to":"you@example.com","subject":"hi","body":"test"}'

// Deno global types — deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined }; serve: (h: (req: Request) => Response | Promise<Response>) => void };

interface DispatchPayload {
  /** Only email is wired today. SMS/call return a structured 501. */
  kind: 'sms' | 'email' | 'call';
  to: string;
  subject: string;
  body: string;
  /** Optional pass-through. Not used by the function; logged for debugging. */
  category?: string;
  /** Stable id from the cab so we can correlate. */
  dispatchId?: string;
}

interface DispatchResult {
  ok: boolean;
  transport: 'resend' | 'mock';
  id?: string;
  error?: string;
}

const RESEND_URL = 'https://api.resend.com/emails';

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      ...(init.headers ?? {}),
    },
  });
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function bodyToHtml(body: string): string {
  // Plain text -> minimal HTML. The cab already composes friendly prose.
  const safe = htmlEscape(body);
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">${safe.replace(/\n/g, '<br>')}</div>`;
}

async function sendViaResend(payload: DispatchPayload): Promise<DispatchResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'Truck Buddy <onboarding@resend.dev>';
  if (!apiKey) {
    return { ok: false, transport: 'resend', error: 'RESEND_API_KEY not set' };
  }
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: bodyToHtml(payload.body),
      text: payload.body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, transport: 'resend', error: `resend ${res.status}: ${text.slice(0, 200)}` };
  }
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof data.id === 'string' ? data.id : undefined;
  return { ok: true, transport: 'resend', id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true }, { status: 204 });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method not allowed' }, { status: 405 });
  }
  // Supabase automatically validates the Authorization header against the
  // project's anon key when the function is invoked via the Functions URL.
  // We accept any non-empty Authorization here so local `supabase functions
  // serve` works without a JWT.
  const auth = req.headers.get('authorization');
  if (!auth) {
    return json({ ok: false, error: 'missing authorization' }, { status: 401 });
  }

  let payload: DispatchPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  if (!payload?.to || !payload?.subject || payload?.body == null) {
    return json({ ok: false, error: 'to, subject, body required' }, { status: 400 });
  }

  if (payload.kind !== 'email') {
    return json(
      { ok: false, error: `kind "${payload.kind}" not wired (email only today)` },
      { status: 501 },
    );
  }

  const result = await sendViaResend(payload);
  const status = result.ok ? 200 : 502;
  return json(result, { status });
});
