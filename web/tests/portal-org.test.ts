import { describe, it, expect } from 'vitest';
import { planMembership, personalOrgName } from '@/lib/portal-org';

describe('portal org provisioning (no tenant takeover)', () => {
  it('never joins an existing org from a client-supplied name', () => {
    const plan = planMembership({ userName: 'PRL Logistical Solutions', userId: 'u-1' });
    expect(plan.action).toBe('create');
  });

  it('joins only an explicitly mapped org (server-side config)', () => {
    const plan = planMembership({
      mapped: { org: 'PRL Logistical Solutions', role: 'owner' },
      userName: 'anything',
      userId: 'u-1',
    });
    expect(plan).toEqual({ action: 'join', orgName: 'PRL Logistical Solutions', role: 'owner' });
  });

  it('defaults a personal org with owner role and a usable name', () => {
    const plan = planMembership({ userName: '  ', userId: 'u-1' });
    expect(plan).toEqual({ action: 'create', orgName: 'Independent', role: 'owner' });
  });

  it('disambiguates a personal org name that is already taken', () => {
    const suffixed = personalOrgName('Dana', 'abcdefgh-1234-5678', true);
    expect(suffixed).not.toBe('Dana');
    expect(suffixed.startsWith('Dana')).toBe(true);
    expect(personalOrgName('Dana', 'abcdefgh-1234-5678', false)).toBe('Dana');
  });
});
