import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Real GPS geofencing (open-source: expo-location). Native only — on web the
 * app keeps the "simulate arrival" control, which the whole demo flow also
 * exercises on device. The distance math below is real and shared so the UI can
 * show live "X m to destination".
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export interface GeoWatch {
  stop: () => void;
}

export type GeoPermission = 'granted' | 'denied' | 'unavailable';

export interface GeofenceResult {
  permission: GeoPermission;
  /** Start watching. Calls onFix with live distance; fires onEnter once inside radius. */
  start: (onFix: (meters: number) => void, onEnter: () => void) => GeoWatch;
}

/**
 * Requests foreground permission and returns a watcher for `target`. Returns
 * `null` when GPS is not available (web, or the permission was denied).
 */
export async function geofence(target: GeoPoint, radiusMeters: number): Promise<GeofenceResult | null> {
  if (Platform.OS === 'web') return null;

  let granted: Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>;
  try {
    granted = await Location.requestForegroundPermissionsAsync();
  } catch {
    return { permission: 'denied', start: () => ({ stop: () => {} }) };
  }
  if (granted.status !== 'granted') {
    return { permission: 'denied', start: () => ({ stop: () => {} }) };
  }

  const start: GeofenceResult['start'] = (onFix, onEnter) => {
    let entered = false;
    let removed = false;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 2000 },
      (loc) => {
        if (removed) return;
        const meters = distanceMeters(
          { lat: loc.coords.latitude, lng: loc.coords.longitude },
          target,
        );
        onFix(meters);
        if (!entered && meters <= radiusMeters) {
          entered = true;
          onEnter();
        }
      },
    )
      .then((s) => {
        // stop() may have run before the watcher resolved — honour it.
        if (removed) s.remove();
        else sub = s;
      })
      .catch(() => {
        /* location services off / revoked — degrade silently */
      });
    return {
      stop: () => {
        removed = true;
        sub?.remove();
        sub = null;
      },
    };
  };

  return { permission: 'granted', start };
}
