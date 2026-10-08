/**
 * Pure decision + payload logic for the cab's location ping tick.
 *
 * Kept free of react-native/expo imports so it is unit-testable. The impure
 * watcher lives in `services/ping-agent.ts`.
 *
 * Consent scope: pings are sent only while the driver is on shift AND has a live
 * route assigned (employer dispatch tracking). Off shift, or with no dispatch,
 * nothing is sent.
 */

export const PING_MIN_INTERVAL_MS = 30_000;

export interface PingTickInput {
  now: number;
  lastSentAt: number | null;
  onShift: boolean;
  hasActiveRoute: boolean;
}

export function shouldSendPing(input: PingTickInput): boolean {
  if (!input.onShift || !input.hasActiveRoute) return false;
  if (input.lastSentAt == null) return true;
  return input.now - input.lastSentAt >= PING_MIN_INTERVAL_MS;
}

export interface RawFix {
  lat: number;
  lng: number;
  speedKmh?: number | null;
  heading?: number | null;
  accuracyM?: number | null;
}

export interface PingPost {
  lat: number;
  lng: number;
  extra: { speedKmh?: number; heading?: number; accuracyM?: number };
}

export function buildPing(fix: RawFix): PingPost {
  const extra: PingPost['extra'] = {};
  if (typeof fix.speedKmh === 'number' && fix.speedKmh >= 0) extra.speedKmh = fix.speedKmh;
  if (typeof fix.heading === 'number' && fix.heading >= 0) extra.heading = fix.heading;
  if (typeof fix.accuracyM === 'number' && fix.accuracyM >= 0) extra.accuracyM = fix.accuracyM;
  return { lat: fix.lat, lng: fix.lng, extra };
}
