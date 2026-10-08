import { NextResponse } from 'next/server';

import { insert, opsConfigured } from '@/lib/ops/admin-client';

/**
 * Telemetry ingest endpoint. Called from the marketing site + portal via a tiny
 * fetch beacon (no cookies needed). Writes page views + custom events into the
 * Supabase ops tables through the service role (client never sees a secret).
 *
 * Public by design, so it is bounded: a per-IP rate limit and a size cap on the
 * caller-supplied properties, to prevent DB-fill abuse.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const MAX_PROPERTIES_BYTES = 4096;
const hits = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  if (!opsConfigured()) {
    return NextResponse.json({ ok: false, error: 'ops_not_configured' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else if (++entry.count > RATE_MAX) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: {
    type: 'pageview' | 'event';
    path?: string;
    name?: string;
    properties?: Record<string, unknown>;
    referrer?: string;
    ua?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  if (body.properties && JSON.stringify(body.properties).length > MAX_PROPERTIES_BYTES) {
    return NextResponse.json({ ok: false, error: 'properties_too_large' }, { status: 413 });
  }

  const ua = body.ua || req.headers.get('user-agent') || '';
  const isBot = /bot|crawl|spider|slurp|preview|headless/i.test(ua);
  const sessionId =
    req.headers.get('x-session-id') || req.headers.get('x-visitor-id') || crypto.randomUUID();
  const ipAddr = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

  if (body.type === 'pageview' && body.path) {
    const { data, error } = await insert<{ id: string }>('tb_pageviews', {
      session_id: sessionId,
      path: body.path.slice(0, 500),
      referrer: body.referrer ? body.referrer.slice(0, 500) : null,
      country: ipAddr ? 'unknown' : null,
      device: ua ? (/Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop') : null,
      browser: ua ? browserFrom(ua) : null,
      user_agent: ua.slice(0, 300) || null,
      is_bot: isBot,
      happened_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.[0]?.id });
  }

  if (body.type === 'event' && body.name) {
    const { data, error } = await insert<{ id: string }>('tb_events', {
      session_id: sessionId,
      name: body.name.slice(0, 100),
      page_path: body.path ? body.path.slice(0, 500) : null,
      properties: body.properties ?? null,
      happened_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.[0]?.id });
  }

  return NextResponse.json({ ok: false, error: 'unsupported' }, { status: 400 });
}

function browserFrom(ua: string): string | null {
  if (/edg/i.test(ua)) return 'edge';
  if (/chrome|crios/i.test(ua)) return 'chrome';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua)) return 'safari';
  if (/opera|opr/i.test(ua)) return 'opera';
  return null;
}
