// Supabase Edge Function: dispatch-send
//
// Cab app's outbound messaging: email direct via Resend, SMS via the
// recipient carrier's email-to-SMS gateway (no telecom account needed —
// delivery rides the same Resend send, addressed to <digits>@<gateway>).
// Voice has no provider: automated calls are not offered; the cab dials
// through the device phone app (`tel:`) instead.
//
// Auth: requires the caller's Supabase access token. The anon key alone is
// not enough (DISPATCH_SEND_ALLOW_ANON=true is a local-dev escape hatch only).
// The Resend key lives in a Supabase secret (`RESEND_API_KEY`).
//
// Deploy (needs a Supabase access token — `supabase login` first):
//   supabase link --project-ref YOUR_PROJECT_REF
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set EMAIL_FROM="Truck Buddy <hello@truckbuddy.online>"
//   supabase functions deploy dispatch-send
//
// Local test:
//   curl -i -X POST \
//     http://localhost:54321/functions/v1/dispatch-send \
//     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"kind":"email","to":"you@example.com","subject":"hi","body":"test"}'

// Deno global types — deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined }; serve: (h: (req: Request) => Response | Promise<Response>) => void };

type SmsCarrier = 'verizon' | 'att' | 'tmobile' | 'uscellular' | 'cricket';

/** Carrier email-to-SMS gateways. Delivery depends on the carrier; the
 *  Resend message id returned proves the handoff to the gateway. */
const SMS_GATEWAYS: Record<SmsCarrier, string> = {
  verizon: 'vtext.com',
  att: 'txt.att.net',
  tmobile: 'tmomail.net',
  uscellular: 'email.uscc.net',
  cricket: 'sms.cricketwireless.net',
};

interface DispatchPayload {
  kind: 'sms' | 'email' | 'call';
  to: string;
  subject: string;
  body: string;
  /** Required for kind 'sms': selects the email-to-SMS gateway. */
  carrier?: SmsCarrier;
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

const sendBudget = new Map<string, { windowStart: number; count: number }>();
const dailyBudget = new Map<string, { day: string; count: number }>();

function emailDomain(addr: string): string {
  const at = addr.lastIndexOf('@');
  return at === -1 ? '' : addr.slice(at + 1).toLowerCase().trim();
}

/**
 * Recipient policy for an authenticated dispatch send. This is a transactional
 * service for the caller's own customers, so it is not a strict allowlist — but
 * it rejects malformed/header-injecting addresses and, when the operator sets
 * DISPATCH_SEND_ALLOWED_DOMAINS, restricts recipients to those domains (plus the
 * caller's own domain and EMAIL_FROM's domain).
 */
function validateRecipient(
  payload: DispatchPayload,
  opts: { allowDomains: string[]; callerEmail: string | null },
): { ok: true } | { ok: false; error: string } {
  const to = (payload.to ?? '').trim();
  if (!to || /[\r\n]/.test(to) || to.length > 254) return { ok: false, error: 'invalid recipient' };
  if (payload.kind === 'sms') {
    if (!digitsOnly(to)) return { ok: false, error: 'sms needs a 10-digit US number' };
    return { ok: true };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: 'invalid email recipient' };
  if (opts.allowDomains.length) {
    const dom = emailDomain(to);
    const fromDom = emailDomain(Deno.env.get('EMAIL_FROM') ?? '');
    const callerDom = opts.callerEmail ? emailDomain(opts.callerEmail) : '';
    const allowed = opts.allowDomains.includes(dom) || (dom !== '' && (dom === fromDom || dom === callerDom));
    if (!allowed) return { ok: false, error: 'recipient domain not allowed' };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true }, { status: 204 });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method not allowed' }, { status: 405 });
  }
  // Auth: require a *real* user JWT, not just any non-empty Authorization.
  // SUPABASE_URL / SUPABASE_ANON_KEY are provided by the runtime in production.
  // Local escape hatch for `supabase functions serve`:
  //   DISPATCH_SEND_ALLOW_ANON=true
  const auth = req.headers.get('authorization');
  if (!auth) {
    return json({ ok: false, error: 'missing authorization' }, { status: 401 });
  }
  const allowAnon = Deno.env.get('DISPATCH_SEND_ALLOW_ANON') === 'true';
  let callerId: string | null = null;
  let callerEmail: string | null = null;
  if (!allowAnon) {
    const supaUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supaUrl || !anonKey) {
      return json({ ok: false, error: 'function not configured for auth' }, { status: 503 });
    }
    const check = await fetch(`${supaUrl}/auth/v1/user`, {
      headers: { authorization: auth, apikey: anonKey },
    });
    if (!check.ok) {
      return json({ ok: false, error: 'invalid session' }, { status: 401 });
    }
    const me = await check.json().catch(() => ({} as { id?: string; email?: string }));
    callerId = typeof me.id === 'string' ? me.id : null;
    callerEmail = typeof me.email === 'string' ? me.email : null;
  }

  // Per-user flood guard (per function instance): 30 messages per minute.
  const now = Date.now();
  const bucket = sendBudget.get(callerId ?? 'anon');
  if (!bucket || now - bucket.windowStart > 60_000) {
    // Bound the map so a busy instance cannot grow without limit.
    if (sendBudget.size > 5000) sendBudget.clear();
    sendBudget.set(callerId ?? 'anon', { windowStart: now, count: 1 });
  } else {
    bucket.count += 1;
    if (bucket.count > 30) {
      return json({ ok: false, error: 'rate limited' }, { status: 429 });
    }
  }

  // Per-user daily ceiling (default 500) so a single account cannot mass-mail
  // from the verified sending domain.
  const today = new Date().toISOString().slice(0, 10);
  const maxPerDay = Number(Deno.env.get('DISPATCH_SEND_MAX_PER_DAY') ?? '500') || 500;
  const dayKey = callerId ?? 'anon';
  const d = dailyBudget.get(dayKey);
  if (!d || d.day !== today) {
    if (dailyBudget.size > 5000) dailyBudget.clear();
    dailyBudget.set(dayKey, { day: today, count: 1 });
  } else {
    d.count += 1;
    if (d.count > maxPerDay) {
      return json({ ok: false, error: 'daily dispatch limit reached' }, { status: 429 });
    }
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

  const allowDomains = (Deno.env.get('DISPATCH_SEND_ALLOWED_DOMAINS') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const recipient = validateRecipient(payload, { allowDomains, callerEmail });
  if (!recipient.ok) {
    return json({ ok: false, error: recipient.error }, { status: 400 });
  }

  if (payload.kind === 'call') {
    return json(
      { ok: false, error: 'automated calls are not offered — dial from the device phone app' },
      { status: 501 },
    );
  }

  const result = payload.kind === 'sms'
    ? await sendViaSmsGateway(payload)
    : await sendViaResend(payload);
  const status = result.ok ? 200 : 502;
  return json(result, { status });
});

function digitsOnly(phone: string): string {
  const d = phone.replace(/\D/g, '');
  // Accept 10-digit NANP or 11-digit with leading 1.
  if (/^1?\d{10}$/.test(d)) return d.length === 11 ? d.slice(1) : d;
  return '';
}

/** SMS via the recipient carrier's email-to-SMS gateway, sent through Resend.
 *  Free — no telecom account. Requires the recipient's carrier. */
async function sendViaSmsGateway(payload: DispatchPayload): Promise<DispatchResult> {
  const gateway = payload.carrier ? SMS_GATEWAYS[payload.carrier] : undefined;
  if (!gateway) {
    return { ok: false, transport: 'resend', error: 'sms needs a carrier (verizon|att|tmobile|uscellular|cricket)' };
  }
  const digits = digitsOnly(payload.to);
  if (!digits) {
    return { ok: false, transport: 'resend', error: 'sms needs a 10-digit US number' };
  }
  return sendViaResend({ ...payload, to: `${digits}@${gateway}` });
}
