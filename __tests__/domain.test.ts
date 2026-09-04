import {
  DEFAULT_PROFILE,
  profileLabel,
  ROLE_LABEL,
  EQUIPMENT_LABEL,
  AUTHORITY_LABEL,
  ROLES,
  EQUIPMENT,
  AUTHORITY,
} from '@/domain/profile';
import {
  makeDemoRoute,
  buildDemoSession,
  makeMockDocument,
  DEMO_INSPECTION_ITEMS,
  DEMO_DRIVER_ID,
} from '@/domain/data';

describe('domain/profile (operating perspective)', () => {
  it('exposes labelled vocabularies', () => {
    expect(ROLE_LABEL.company).toContain('Company');
    expect(EQUIPMENT_LABEL.box_truck).toBe('Box truck');
    expect(AUTHORITY_LABEL.own).toContain('operating authority');
    expect(ROLES.length).toBe(3);
    expect(EQUIPMENT.length).toBe(6);
    expect(AUTHORITY.length).toBe(3);
  });

  it('defaults to an independent dry-van owner-operator', () => {
    expect(DEFAULT_PROFILE).toEqual({
      role: 'independent',
      equipment: 'dry_van',
      authority: 'own',
      set: true,
    });
  });

  it('builds a readable perspective label', () => {
    expect(profileLabel({ ...DEFAULT_PROFILE, role: 'company' })).toContain('Company');
    expect(profileLabel(DEFAULT_PROFILE)).toContain('Box truck'.length > 0 ? 'Dry van' : '');
  });
});

describe('domain/data fixtures', () => {
  it('makes a deterministic route with stops', () => {
    const route = makeDemoRoute();
    expect(route.stops.length).toBeGreaterThan(0);
    expect(route.stops[0].sequence).toBe(1);
    expect(route.status).toBe('assigned');
  });

  it('builds a full session', async () => {
    const session = await buildDemoSession();
    expect(session.driver.id).toBe(DEMO_DRIVER_ID);
    expect(session.vehicle.vin.length).toBeGreaterThan(10);
    expect(session.workflow.currentStep).toBe('idle');
    expect(session.route.stops.length).toBeGreaterThan(0);
  });

  it('provides inspection items', () => {
    expect(DEMO_INSPECTION_ITEMS.length).toBeGreaterThan(0);
    expect(DEMO_INSPECTION_ITEMS[0].label.length).toBeGreaterThan(0);
  });

  it('builds a typed mock document with parsed fields', () => {
    const doc = makeMockDocument('stop_1', 'BOL', {
      bol_number: 'BOL-1',
      shipper: 'S',
      consignee: 'C',
      weight: 100,
      date: '2026-09-04',
    });
    expect(doc.type).toBe('BOL');
    expect(doc.parsedFields.bol_number).toBe('BOL-1');
    expect(doc.driverId).toBe(DEMO_DRIVER_ID);
  });
});
