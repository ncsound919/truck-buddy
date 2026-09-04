import { describe, expect, it } from 'vitest';

import type { OperatingProfile } from '@/lib/domain';
import { canFactor, runsOwnAuthority } from '@/lib/perspective';

const own: OperatingProfile = { role: 'independent', equipment: 'dry_van', authority: 'own', set: true };
const leasedOwn: OperatingProfile = { role: 'leased', equipment: 'dry_van', authority: 'own', set: true };
const leasedCarrier: OperatingProfile = { role: 'leased', equipment: 'dry_van', authority: 'carrier', set: true };
const company: OperatingProfile = { role: 'company', equipment: 'dry_van', authority: 'employer', set: true };

describe('runsOwnAuthority', () => {
  it('is true only for independents with their own authority', () => {
    expect(runsOwnAuthority(own)).toBe(true);
    expect(runsOwnAuthority(leasedOwn)).toBe(false);
    expect(runsOwnAuthority(leasedCarrier)).toBe(false);
    expect(runsOwnAuthority(company)).toBe(false);
  });

  it('matches the existing canFactor gate', () => {
    expect(runsOwnAuthority(own)).toBe(canFactor(own));
    expect(runsOwnAuthority(company)).toBe(canFactor(company));
  });
});
