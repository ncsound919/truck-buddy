'use client';

/**
 * Tiny first-party telemetry beacon for the marketing site + portal. Fires a
 * pageview on mount and exposes a track() for events (CTA clicks, pricing,
 * signup starts). No cookies — anonymous session id in-memory for the visit.
 */

let sessionId: string | null = null;

function sid(): string {
  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v_${Math.random().toString(36).slice(2, 12)}`;
  }
  return sessionId;
}

async function post(payload: Record<string, unknown>) {
  try {
    await fetch('/api/ops/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sid() },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // telemetry must never break the page
  }
}

/** Fire once per pathname change (call in an effect keyed on pathname). */
export function trackPageview(path: string, referrer?: string) {
  void post({ type: 'pageview', path, referrer });
}

/** Track a named event, e.g. track('cta_start_shift', { source: 'hero' }). */
export function track(name: string, properties?: Record<string, unknown>) {
  const path = typeof location !== 'undefined' ? location.pathname + location.search : '';
  void post({ type: 'event', name, path, properties });
}
