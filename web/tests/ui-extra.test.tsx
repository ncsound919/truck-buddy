import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import * as React from 'react';

import * as Icons from '@/components/icons';
import { ExternalBoards } from '@/components/portal/external-boards';
import { LoadCard, HealthPanel } from '@/components/portal/primitives';
import type { Load, TruckHealth } from '@/lib/domain';

const load: Load = {
  id: 'l1',
  ref: 'BOL-1',
  origin: 'A',
  destination: 'B',
  distanceMi: 100,
  weightLb: 1000,
  equipment: 'Dry Van 53ft',
  equipmentType: 'dry_van',
  payout: 500,
  pickupAt: 'T 09:00',
  deliverBy: 'T 15:00',
  status: 'open',
  shipper: 'Shipper',
  postedBy: 'Broker',
  source: 'Board',
};

const health: TruckHealth = {
  metrics: { coolantTempF: 192, batteryVoltage: 13.8, fuelPct: 76, rpm: 1420 },
  faultCodes: [],
  updatedAt: '',
};

describe('icons', () => {
  it('renders every exported icon without throwing', () => {
    for (const name of Object.keys(Icons)) {
      const Comp = Icons[name as keyof typeof Icons];
      const { container } = render(<Comp />);
      expect(container.querySelector('svg')).toBeTruthy();
    }
  });
});

describe('ExternalBoards panel', () => {
  it('lists the free boards with links', () => {
    const { getByText } = render(<ExternalBoards />);
    expect(getByText('TruckSmarter')).toBeInTheDocument();
    expect(getByText(/DAT/)).toBeInTheDocument();
  });
});

describe('portal primitives', () => {
  it('renders a LoadCard including a verified-accept timestamp', () => {
    const accepted = { ...load, acceptedAt: '2026-09-04T05:20:00Z' };
    const { getByText } = render(<LoadCard load={accepted} />);
    expect(getByText('BOL-1')).toBeInTheDocument();
    expect(getByText(/timestamped/i)).toBeInTheDocument();
  });
  it('renders a healthy HealthPanel with status', () => {
    const { getByText } = render(<HealthPanel health={health} />);
    expect(getByText('Truck health nominal')).toBeInTheDocument();
  });
});
