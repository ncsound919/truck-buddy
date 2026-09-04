import { describe, expect, it } from 'vitest';

import { portalApi } from '@/lib/mock-api';
import { OfflineResearchSeam } from '@/lib/mechanic/search';
import { diagnose } from '@/lib/mechanic/engine';

describe('portalApi — shared portal seam (smoke)', () => {
  it('reads today with a workload and profile', async () => {
    const [today, profile] = await Promise.all([
      portalApi.getToday(),
      portalApi.getOperatingProfile(),
    ]);
    expect(profile.role).toBeTruthy();
    expect(profile.equipment).toBeTruthy();
    expect(today.load?.ref).toBeTruthy();
  });

  it('lists open loads, sources, and your loads', async () => {
    const [open, sources, loads] = await Promise.all([
      portalApi.getOpenLoads(),
      portalApi.getBoardSources(),
      portalApi.getLoads(),
    ]);
    expect(open.length).toBeGreaterThan(0);
    expect(sources.length).toBeGreaterThan(0);
    expect(loads.length).toBeGreaterThan(0);
  });

  it('accepts a load and timestamps it', async () => {
    const profile = await portalApi.getOperatingProfile();
    const before = await portalApi.getOpenLoads();
    const target = before[0];
    const accepted = await portalApi.acceptLoad(target.id);
    expect(accepted.status).toBe('accepted');
    expect(accepted.acceptedAt).toBeTruthy();
    // Restore for isolation in case another suite depends on an open board.
    await portalApi.setOperatingProfile(profile);
  });

  it('can change the operating profile', async () => {
    const p = await portalApi.getOperatingProfile();
    const next = { ...p, equipment: 'box_truck' as const };
    const saved = await portalApi.setOperatingProfile(next);
    expect(saved.equipment).toBe('box_truck');
    await portalApi.setOperatingProfile(p);
  });

  it('exposes vehicle detail with samples', async () => {
    const v = await portalApi.getVehicleDetail();
    expect(v.odometerMi).toBeGreaterThan(0);
    expect(v.samples.length).toBeGreaterThan(0);
  });

  it('round-trips messages and documents', async () => {
    const sent = await portalApi.sendDispatchMessage('test dispatch');
    expect(sent.text).toBe('test dispatch');
    const msgs = await portalApi.getMessages();
    expect(msgs.some((m) => m.id === sent.id)).toBe(true);

    const doc = await portalApi.uploadDocument('DeliveryReceipt', 'BOL-882114');
    expect(doc.kind).toBe('DeliveryReceipt');
    const docs = await portalApi.getDocuments();
    expect(docs.some((d) => d.id === doc.id)).toBe(true);
  });
});

describe('Research seam', () => {
  it('returns ready-to-run queries and an honest offline note', async () => {
    const seam = new OfflineResearchSeam();
    const result = diagnose({ codes: ['SPN 110'] });
    const refs = await seam.research(result);
    expect(refs.some((r) => r.kind === 'query')).toBe(true);
    expect(refs.some((r) => r.text.toLowerCase().includes('offline'))).toBe(true);
  });
});
