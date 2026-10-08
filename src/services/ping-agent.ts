import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { PING_MIN_INTERVAL_MS, buildPing, shouldSendPing } from '@/domain/ping';

/**
 * Starts the live location ping tick that closes the dispatcher<-cab loop.
 *
 * Native only (web has no GPS). It requests foreground permission, watches
 * position, and submits a throttled ping while the driver is on shift with a
 * live route. Every dependency is injected so the tick is observable and the
 * agent degrades to a no-op when any prerequisite is missing.
 */
export interface PingAgentDeps {
  /** The driver's active org id, or null when unknown. */
  getOrgId: () => Promise<string | null>;
  /** Current signed-in user + shift/route state. */
  getContext: () => Promise<{ userId: string | null; onShift: boolean; hasActiveRoute: boolean }>;
  /** Posts a ping; resolves true when it was accepted. */
  sendPing: (
    orgId: string,
    userId: string,
    lat: number,
    lng: number,
    extra?: { speedKmh?: number; heading?: number; accuracyM?: number },
  ) => Promise<boolean>;
  now?: () => number;
  intervalMs?: number;
}

export interface PingAgent {
  stop: () => void;
}

export function startPingAgent(deps: PingAgentDeps): PingAgent {
  if (Platform.OS === 'web') return { stop: () => {} };

  const now = deps.now ?? (() => Date.now());
  let stopped = false;
  let lastSentAt: number | null = null;
  let sub: Location.LocationSubscription | null = null;

  (async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const s = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: deps.intervalMs ?? PING_MIN_INTERVAL_MS,
          distanceInterval: 50,
        },
        async (loc) => {
          if (stopped) return;
          const ctx = await deps.getContext().catch(() => null);
          if (!ctx || !ctx.userId) return;
          if (!shouldSendPing({ now: now(), lastSentAt, onShift: ctx.onShift, hasActiveRoute: ctx.hasActiveRoute })) {
            return;
          }
          const orgId = await deps.getOrgId().catch(() => null);
          if (!orgId) return;
          const ping = buildPing({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            speedKmh: loc.coords.speed,
            heading: loc.coords.heading,
            accuracyM: loc.coords.accuracy,
          });
          const ok = await deps.sendPing(orgId, ctx.userId, ping.lat, ping.lng, ping.extra).catch(() => false);
          if (ok) lastSentAt = now();
        },
      );
      if (stopped) s.remove();
      else sub = s;
    } catch {
      // Location services off / permission revoked — degrade silently.
    }
  })();

  return {
    stop: () => {
      stopped = true;
      sub?.remove();
      sub = null;
    },
  };
}
