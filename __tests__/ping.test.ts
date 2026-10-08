import { shouldSendPing, buildPing, PING_MIN_INTERVAL_MS } from '@/domain/ping';

describe('ping agent decision', () => {
  it('never pings when off shift or with no active route', () => {
    expect(shouldSendPing({ now: 0, lastSentAt: null, onShift: false, hasActiveRoute: true })).toBe(false);
    expect(shouldSendPing({ now: 0, lastSentAt: null, onShift: true, hasActiveRoute: false })).toBe(false);
  });

  it('sends the first ping immediately when on shift with a live route', () => {
    expect(shouldSendPing({ now: 1_000, lastSentAt: null, onShift: true, hasActiveRoute: true })).toBe(true);
  });

  it('throttles to the minimum interval', () => {
    const sent = 1_000;
    expect(shouldSendPing({ now: sent + 10_000, lastSentAt: sent, onShift: true, hasActiveRoute: true })).toBe(false);
    expect(shouldSendPing({ now: sent + PING_MIN_INTERVAL_MS, lastSentAt: sent, onShift: true, hasActiveRoute: true })).toBe(true);
  });
});

describe('ping payload', () => {
  it('builds lat/lng and omits unavailable extras', () => {
    const p = buildPing({ lat: 37.7, lng: -122.4, speedKmh: null, heading: null, accuracyM: 8 });
    expect(p.lat).toBe(37.7);
    expect(p.lng).toBe(-122.4);
    expect(p.extra.accuracyM).toBe(8);
    expect(p.extra.speedKmh).toBeUndefined();
    expect(p.extra.heading).toBeUndefined();
  });

  it('drops negative speed (a common "unknown" sentinel)', () => {
    const p = buildPing({ lat: 1, lng: 2, speedKmh: -1 });
    expect(p.extra.speedKmh).toBeUndefined();
  });
});
