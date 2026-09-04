import { describe, expect, it } from 'vitest';

import { predictMaintenance } from '@/lib/predict';
import type { VehicleDetail } from '@/lib/domain';

function vehicle(over: Partial<VehicleDetail> = {}): VehicleDetail {
  return {
    plate: 'NC-7A2K19',
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2023,
    vin: '3AKJHHDR8LSLA9381',
    odometerMi: 214300,
    nextServiceMi: 218000,
    health: {
      metrics: { coolantTempF: 192, batteryVoltage: 13.8, fuelPct: 76, rpm: 1420 },
      faultCodes: [],
      updatedAt: '2026-09-04T06:00:00Z',
    },
    faultHistory: [],
    maintenance: [],
    samples: [
      { at: '2026-08-05T06:00:00Z', coolantTempF: 190, batteryVoltage: 14.2, fuelPct: 88 },
      { at: '2026-09-04T06:00:00Z', coolantTempF: 191, batteryVoltage: 14.0, fuelPct: 80 },
    ],
    ...over,
  };
}

describe('predictMaintenance (rule-based, not ML)', () => {
  it('flags no risks on a healthy truck', () => {
    expect(predictMaintenance(vehicle())).toHaveLength(0);
  });

  it('flags service overdue when past the interval', () => {
    const risks = predictMaintenance(vehicle({ odometerMi: 218400, nextServiceMi: 218000 }));
    const r = risks.find((x) => x.id === 'overdue');
    expect(r?.severity).toBe('high');
  });

  it('flags charging when battery voltage trends down', () => {
    const risks = predictMaintenance(
      vehicle({
        samples: [
          { at: 'a', coolantTempF: 190, batteryVoltage: 14.2, fuelPct: 80 },
          { at: 'b', coolantTempF: 190, batteryVoltage: 13.0, fuelPct: 80 },
        ],
      }),
    );
    expect(risks.some((x) => x.id === 'charging')).toBe(true);
  });

  it('flags active faults that are not cleared', () => {
    const risks = predictMaintenance(
      vehicle({ faultHistory: [{ id: 'f1', code: 'SPN 158', label: 'Battery low', at: '', cleared: false }] }),
    );
    const r = risks.find((x) => x.id === 'faults');
    expect(r?.severity).toBe('high');
  });
});
