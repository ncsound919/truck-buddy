import { MockTruckBuddyApi } from '@/services/truck-buddy-api';
import { buildDemoSession } from '@/domain/data';
import { mapRoute, userIdFromJwt, withLiveAssignment, LiveAssignmentFetcher } from '@/services/live-assignment';

const liveSessionPromise = buildDemoSession;

function forgeJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub })).toString('base64url');
  return `${header}.${body}.`;
}

describe('withLiveAssignment merge (cab + AetherRoute tables)', () => {
  it('falls back to the demo session when signed out', async () => {
    const api = withLiveAssignment(new MockTruckBuddyApi(buildDemoSession), {
      getToken: async () => null,
    });
    const session = await api.getTodaySession();
    expect(session.route.name).toBeDefined; // demo route shape preserved
    expect(session.route.stops.length).toBeGreaterThan(0);
  });

  it('substitutes the live route/vehicle for a signed-in driver with a route', async () => {
    const uid = 'driver-42';
    const token = forgeJwt(uid);
    const calls: string[] = [];

    const originalFetch = global.fetch;
    global.fetch = (async (input: any) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('routes?')) {
        return new Response(
          JSON.stringify([
            { id: 'rte-live', status: 'in_progress', date: '2026-10-07', driver_user_id: uid, vehicle_id: 'veh-1' },
          ]),
          { status: 200 },
        );
      }
      if (url.includes('stops?')) {
        return new Response(
          JSON.stringify([
            { id: 'stp-1', route_id: 'rte-live', seq: 2, name: 'Second', address: '2 B St', lat: 1, lng: 2, geofence_meters: 200, eta_minutes: 12, leg_miles: 3, status: 'pending', completed_at: null },
            { id: 'stp-2', route_id: 'rte-live', seq: 1, name: 'First', address: '1 A St', lat: 3, lng: 4, geofence_meters: 200, eta_minutes: 5, leg_miles: 1, status: 'completed', completed_at: '2026-10-07T10:00:00Z' },
          ]),
          { status: 200 },
        );
      }
      if (url.includes('vehicles?')) {
        return new Response(
          JSON.stringify([{ id: 'veh-1', vin: 'VIN1', plate: 'TB-1', make: 'Freightliner', model: 'Cascadia', year: 2022, assigned_driver_id: uid }]),
          { status: 200 },
        );
      }
      return new Response('[]', { status: 200 });
    }) as typeof fetch;

    try {
      const api = withLiveAssignment(new MockTruckBuddyApi(buildDemoSession), {
        getToken: async () => token,
        cfg: { url: 'https://units.test', anonKey: 'anon' },
        fetchImpl: global.fetch,
      });
      const session = await api.getTodaySession();
      expect(session.route.id).toBe('rte-live');
      expect(session.route.stops.map((s) => s.sequence)).toEqual([1, 2]);
      expect(session.route.stops.find((s) => s.id === 'stp-2')?.status).toBe('completed');
      expect(session.vehicle.id).toBe('veh-1');
      expect(session.vehicle.plate).toBe('TB-1');
      expect(session.driver.id).toBe(uid);
      expect(calls.some((u) => u.includes('routes?'))).toBe(true);
      // The in-list must be unquoted, or PostgREST matches no rows.
      expect(calls.some((u) => u.includes('status=in.(assigned,in_progress)'))).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('setStopStatus targets the PostgREST stops row', async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (input: any, init?: RequestInit) => {
      seen.push({ url: String(input), init });
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const fetcher = new LiveAssignmentFetcher(async () => 'token', fetchImpl, { url: 'https://units.test', anonKey: 'anon' });
    const ok = await fetcher.setStopStatus('stp-1', 'completed');
    expect(ok).toBe(true);
    expect(seen[0].url).toContain('/rest/v1/stops?id=eq.stp-1');
    expect(seen[0].init?.method).toBe('PATCH');
    const body = JSON.parse(String(seen[0].init?.body));
    expect(body.status).toBe('completed');
    expect(body.completed_at).toBeTruthy();
  });

  it('mapRoute sorts stops by sequence', () => {
    const route = mapRoute(
      { id: 'r', status: 'assigned', date: 'd', driver_user_id: 'u', vehicle_id: null },
      [
        { id: 'b', route_id: 'r', seq: 5, name: null, address: 'B', lat: 0, lng: 0, geofence_meters: null, eta_minutes: null, leg_miles: null, status: 'pending', completed_at: null },
        { id: 'a', route_id: 'r', seq: 1, name: null, address: 'A', lat: 0, lng: 0, geofence_meters: null, eta_minutes: null, leg_miles: null, status: 'pending', completed_at: null },
      ],
    );
    expect(route.stops.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('userIdFromJwt decodes the sub claim', () => {
    expect(userIdFromJwt(forgeJwt('u-9'))).toBe('u-9');
    expect(userIdFromJwt('garbage')).toBeNull();
  });
});
