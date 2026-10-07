import Constants from 'expo-constants';

import type {
  Driver,
  Route,
  RouteStatus,
  Stop,
  StopStatus,
  Vehicle,
  TodaySession,
} from '@/domain/types';
import type { TruckBuddyApi } from '@/services/truck-buddy-api';

/**
 * PostgREST client for the AetherRoute operating tables that the dispatcher
 * (web portal) writes. Folds them into the cab's TodaySession shape. When the
 * driver is signed out or no live route exists yet, it returns null and the
 * caller keeps showing the demo seam — never a silent fake.
 */
export interface RouteRow {
  id: string;
  status: string;
  date: string;
  driver_user_id: string;
  vehicle_id: string | null;
}

export interface StopRow {
  id: string;
  route_id: string;
  seq: number;
  name: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  geofence_meters: number | null;
  eta_minutes: number | null;
  leg_miles: number | null;
  status: string;
  completed_at: string | null;
}

export interface VehicleRow {
  id: string;
  vin: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  assigned_driver_id: string | null;
}

// PostgREST in-list values must be unquoted (single quotes are literal and
// match nothing).
const ACTIVE_ROUTE_STATUSES = '(assigned,in_progress)';

function config(): { url: string; anonKey: string } | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const url = typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '';
  const anonKey = typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '';
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : null;
}

export function mapStop(row: StopRow): Stop {
  return {
    id: row.id,
    routeId: row.route_id,
    sequence: row.seq,
    name: row.name ?? row.address,
    address: row.address,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    geofenceMeters: row.geofence_meters ?? 300,
    status: (row.status as StopStatus) ?? 'pending',
    etaMinutes: row.eta_minutes ?? 0,
    legMiles: row.leg_miles ?? 0,
    destinations: [],
    completedAt: row.completed_at ?? undefined,
  };
}

export function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    vin: row.vin ?? '',
    plate: row.plate ?? '',
    make: row.make ?? '',
    model: row.model ?? '',
    year: row.year ?? 0,
    assignedDriverId: row.assigned_driver_id ?? '',
  };
}

export function mapRoute(row: RouteRow, stops: StopRow[]): Route {
  return {
    id: row.id,
    driverId: row.driver_user_id,
    date: row.date,
    status: (row.status as RouteStatus) ?? 'assigned',
    stops: stops.sort((a, b) => a.seq - b.seq).map(mapStop),
  };
}

export class LiveAssignmentFetcher {
  private readonly cfg: { url: string; anonKey: string } | null;

  constructor(
    private readonly token: () => Promise<string | null>,
    private readonly fetchImpl: typeof fetch = fetch,
    cfg?: { url: string; anonKey: string } | null,
  ) {
    this.cfg = cfg === undefined ? config() : cfg;
  }

  private async getJson<T>(path: string): Promise<T | null> {
    const token = await this.token();
    if (!this.cfg || !token) return null;

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.cfg.url}/rest/v1/${path}`, {
        headers: { Authorization: `Bearer ${token}`, apikey: this.cfg.anonKey, Accept: 'application/json' },
      });
    } catch {
      return null;
    }
    if (!res.ok) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[live-api] GET ${path} -> ${res.status}`);
      }
      return null;
    }
    return (await res.json()) as T;
  }

  private async methodJson<T extends Record<string, unknown>>(method: string, path: string, body: T): Promise<boolean> {
    const token = await this.token();
    if (!this.cfg || !token) return false;
    try {
      const res = await this.fetchImpl(`${this.cfg.url}/rest/v1/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.cfg.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Returns the driver's route and active stops, or null when there is no live dispatch. */
  async fetchActiveSession(userId: string): Promise<{ route: Route; vehicle: Vehicle | null; driver: Driver } | null> {
    const routes = await this.getJson<RouteRow[]>(
      `routes?driver_user_id=eq.${userId}&status=in.${ACTIVE_ROUTE_STATUSES}&order=date.desc&limit=1`,
    );
    const route = routes?.[0];
    if (!route) return null;

    const stops = (await this.getJson<StopRow[]>(`stops?route_id=eq.${route.id}&order=seq.asc`)) ?? [];
    const vehicles = route.vehicle_id
      ? await this.getJson<VehicleRow[]>(`vehicles?id=eq.${route.vehicle_id}&limit=1`)
      : null;

    return {
      route: mapRoute(route, stops),
      vehicle: vehicles?.[0] ? mapVehicle(vehicles[0]) : null,
      driver: {
        id: userId,
        name: 'Driver',
        phone: '',
        email: '',
        membershipTier: 'pro',
      } as Driver,
    };
  }

  async setStopStatus(stopId: string, status: 'arrived' | 'completed'): Promise<boolean> {
    const stamp = new Date().toISOString();
    const patch: Record<string, string> = { status };
    if (status === 'arrived') patch.arrived_at = stamp;
    if (status === 'completed') patch.completed_at = stamp;
    return this.methodJson('PATCH', `stops?id=eq.${stopId}`, patch);
  }

  async setRouteStatus(routeId: string, status: RouteStatus): Promise<boolean> {
    const mapped = status === 'completed' ? 'completed' : status === 'assigned' ? 'assigned' : 'in_progress';
    return this.methodJson('PATCH', `routes?id=eq.${routeId}`, { status: mapped });
  }

  /** Live check-in ping from the cab device. */
  async submitPing(orgId: string, userId: string, lat: number, lng: number, extra: Partial<{ speedKmh: number; heading: number; accuracyM: number; batteryPct: number }> = {}): Promise<boolean> {
    return this.methodJson('POST', 'location_pings', {
      org_id: orgId,
      driver_user_id: userId,
      lat,
      lng,
      speed_kmh: extra.speedKmh ?? null,
      heading: extra.heading ?? null,
      accuracy_m: extra.accuracyM ?? null,
      battery_pct: extra.batteryPct ?? null,
    });
  }
}

/** TodaySession is rebuilt from live rows; falls back to null fields from the mock. */
export type LiveSession = {
  route: Route;
  vehicle: Vehicle | null;
  driver: Driver;
};

export type { TruckBuddyApi };

/** Decode the sub claim of a Supabase access token; null when it can't be read. */
export function userIdFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

export interface LiveApiOptions {
  /** Signed-in user's access token, or null when signed out. */
  getToken?: () => Promise<string | null>;
  /** Override the Supabase config (defaults to app.json extra). For tests. */
  cfg?: { url: string; anonKey: string } | null;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
}

/**
 * MockTruckBuddyApi + real stops/vehicles/pings. When there is no signed-in
 * session or no active live route, every method behaves exactly like the
 * fixture-backed mock — never a silent, fake "live" mode.
 */
export function withLiveAssignment(api: import('@/services/truck-buddy-api').MockTruckBuddyApi, options: LiveApiOptions = {}) {
  const live = new LiveAssignmentFetcher(
    async () => (await options.getToken?.().catch(() => null)) ?? null,
    options.fetchImpl,
    options.cfg,
  );
  const base = api as import('@/services/truck-buddy-api').MockTruckBuddyApi;

  return Object.create(base, {
    getTodaySession: {
      value: async (): Promise<TodaySession> => {
        const demo = await base.getTodaySession();
        const token = options.getToken ? await options.getToken().catch(() => null) : null;
        const uid = token ? userIdFromJwt(token) : null;
        if (!uid) return demo;
        const liveNow = await live.fetchActiveSession(uid);
        if (!liveNow) return demo;
        return {
          ...demo,
          driver: { ...demo.driver, id: uid },
          vehicle: liveNow.vehicle ?? demo.vehicle,
          route: liveNow.route,
        };
      },
    },
    getAssignedVehicle: {
      value: async (): Promise<Vehicle> => {
        const session = await base.getTodaySession();
        const token = options.getToken ? await options.getToken().catch(() => null) : null;
        const uid = token ? userIdFromJwt(token) : null;
        if (uid) {
          const liveNow = await live.fetchActiveSession(uid);
          if (liveNow?.vehicle) return liveNow.vehicle;
        }
        return session.vehicle;
      },
    },
    updateStopStatus: {
      value: async (stopId: string, status: 'arrived' | 'completed'): Promise<void> => {
        const ok = await live.setStopStatus(stopId, status);
        if (!ok) await base.updateStopStatus(stopId, status);
      },
    },
    updateRouteStatus: {
      value: async (routeId: string, status: RouteStatus): Promise<void> => {
        const ok = await live.setRouteStatus(routeId, status);
        if (!ok) await base.updateRouteStatus(routeId, status);
      },
    },
    // Expose the ping capability for the shift/nav tick.
    submitPing: { value: live.submitPing.bind(live) },
  } as PropertyDescriptorMap) as typeof base & { submitPing: LiveAssignmentFetcher['submitPing'] };
}

