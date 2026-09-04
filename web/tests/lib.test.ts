import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/cn';
import { EXTERNAL_BOARDS } from '@/lib/boards';
import { haversineMi, roadMilesMi, coordDistanceMi, ROAD_FACTOR } from '@/lib/geo';
import { money, mi, pct, initials } from '@/lib/format';
import { vettingSeam } from '@/lib/vetting';
import {
  compatibleEquipments,
  canFactor,
  huntsOwnWork,
  perspectiveLabel,
  ROLE_LABEL,
  EQUIPMENT_LABEL,
} from '@/lib/perspective';
import {
  diagnose,
  normalizeCodes,
  symptomSteps,
  triageRank,
  SYMPTOMS,
} from '@/lib/mechanic/engine';
import { OfflineAiSeam, getAiSeam } from '@/lib/mechanic/ai';
import { budgetStatus, ledger, ANALYSES_PER_MONTH, type Plan } from '@/lib/mechanic/budget';

describe('cn', () => {
  it('joins truthy classes and drops falsy', () => {
    expect(cn('a', 'b', false, undefined, null, '')).toBe('a b');
  });
  it('returns empty string for nothing', () => {
    expect(cn()).toBe('');
  });
});

describe('boards', () => {
  it('exposes a non-empty set of external boards with URLs', () => {
    expect(EXTERNAL_BOARDS.length).toBeGreaterThan(0);
    for (const b of EXTERNAL_BOARDS) {
      expect(b.url).toMatch(/^https?:\/\//);
      expect(b.name.length).toBeGreaterThan(0);
    }
  });
});

describe('geo (real geodesic math)', () => {
  it('is zero for identical points', () => {
    expect(haversineMi(35.78, -78.639, 35.78, -78.639)).toBeCloseTo(0, 3);
  });
  it('returns a plausible distance for a known lane', () => {
    // Raleigh, NC -> Charlotte, NC ~ 130 mi straight-ish / ~112 road miles.
    const d = haversineMi(35.78, -78.639, 35.227, -80.843);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });
  it('applies the labelled road factor', () => {
    expect(ROAD_FACTOR).toBe(1.25);
    expect(roadMilesMi(100)).toBe(125);
  });
  it('returns null when coords are missing', () => {
    expect(coordDistanceMi(null, { lat: 1, lng: 1 })).toBeNull();
    expect(coordDistanceMi({ lat: 1, lng: 1 }, undefined)).toBeNull();
  });
  it('computes a road-adjusted coord distance', () => {
    expect(coordDistanceMi({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });
});

describe('format', () => {
  it('formats money without cents', () => {
    expect(money(760)).toBe('$760');
    expect(money(1000000)).toBe('$1,000,000');
  });
  it('formats miles and percents', () => {
    expect(mi(1240)).toBe('1,240 mi');
    expect(pct(76)).toBe('76%');
  });
  it('builds initials', () => {
    expect(initials('Terrence Brooks')).toBe('TB');
    expect(initials('ACME Distribution Center')).toBe('AD');
  });
});

describe('vetting', () => {
  it('verifies a known payer', async () => {
    const r = await vettingSeam.check('ACME Distribution Center', 'shipper');
    expect(r.status).toBe('verified');
    expect(r.authorityActive).toBe(true);
    expect(r.insuranceActive).toBe(true);
    expect(r.dotNumber).toBeTruthy();
  });
  it('flags a payer without insurance', async () => {
    const r = await vettingSeam.check('Haley Logistics', 'broker');
    expect(r.status).toBe('warning');
    expect(r.insuranceActive).toBe(false);
  });
  it('returns unverified for an unknown payer', async () => {
    const r = await vettingSeam.check('Unknown Broker LLC', 'broker');
    expect(r.status).toBe('unverified');
  });
});

describe('perspective helpers', () => {
  const base = { equipment: 'dry_van', authority: 'own', set: true } as const;

  it('classifies who hunts their own work', () => {
    expect(huntsOwnWork({ ...base, role: 'independent' })).toBe(true);
    expect(huntsOwnWork({ ...base, role: 'leased' })).toBe(true);
    expect(huntsOwnWork({ ...base, role: 'company' })).toBe(false);
  });
  it('allows factoring only for independent + own authority', () => {
    expect(canFactor({ ...base, role: 'independent', authority: 'own' })).toBe(true);
    expect(canFactor({ ...base, role: 'leased', authority: 'carrier' })).toBe(false);
    expect(canFactor({ ...base, role: 'company', authority: 'employer' })).toBe(false);
  });
  it('returns compatible equipment per profile', () => {
    expect(compatibleEquipments('box_truck')).toEqual(['box_truck']);
    expect(compatibleEquipments('reefer')).toContain('reefer');
    expect(compatibleEquipments('tanker')).toContain('tanker');
  });
  it('produces a readable label', () => {
    expect(perspectiveLabel({ ...base, role: 'company' })).toContain('Company');
    expect(ROLE_LABEL).toBeDefined();
    expect(EQUIPMENT_LABEL).toBeDefined();
  });
});

describe('Roadside Mechanic engine', () => {
  it('decodes a known severe code to red triage', () => {
    const r = diagnose({ codes: ['SPN 110'] });
    expect(r.codes).toHaveLength(1);
    expect(r.codes[0].name).toContain('Coolant');
    expect(r.triage).toBe('red');
    expect(r.stopConditions.length).toBeGreaterThan(0);
    expect(r.steps.length).toBeGreaterThan(0);
  });
  it('handles FMI suffixes', () => {
    const r = diagnose({ codes: ['spn100 fmi 4'] });
    expect(r.codes[0].plain).toContain('FMI 4');
    expect(r.triage).toBe('red');
  });
  it('routes unknown codes to an honest path, no fabricated fix', () => {
    const r = diagnose({ codes: ['SPN 99999'] });
    expect(r.unknown).toContain('SPN 99999');
    expect(r.codes).toHaveLength(0);
    // Generic baseline steps exist, not a made-up cause.
    expect(r.steps.some((s) => s.title.toLowerCase().includes('record'))).toBe(true);
  });
  it('returns green monitor with no input', () => {
    const r = diagnose({});
    expect(r.triage).toBe('green');
  });
  it('adds symptom steps when a symptom is chosen', () => {
    const r = diagnose({ symptom: 'overheating' });
    expect(r.summary).toContain('Overheating');
    expect(symptomSteps('no_start').length).toBeGreaterThan(0);
    expect(SYMPTOMS.length).toBeGreaterThan(0);
  });
  it('ranks red < yellow < green', () => {
    expect(triageRank('red')).toBeLessThan(triageRank('yellow'));
    expect(triageRank('yellow')).toBeLessThan(triageRank('green'));
  });
});

describe('Mechanic AI seam', () => {
  it('offline seam returns rule-based, labelled insights', async () => {
    const result = diagnose({ codes: ['SPN 110'] });
    const seam = new OfflineAiSeam();
    const insight = await seam.deepAnalyze(result);
    expect(insight.mode).toBe('offline');
    expect(insight.verdict.length).toBeGreaterThan(10);
    expect(insight.disclaimer).toContain('not generative AI');
  });
  it('uses offline mode when no provider key is set', () => {
    delete process.env.AI_PROVIDER_API_KEY;
    expect(getAiSeam()).toBeInstanceOf(OfflineAiSeam);
  });
});

describe('AI budget ledger', () => {
  it('derives an allowance from the price', () => {
    expect(ANALYSES_PER_MONTH).toBe(10);
  });
  it('reports pro status', () => {
    const s = budgetStatus();
    expect(s.plan).toBe('pro');
    expect(s.allowance).toBe(ANALYSES_PER_MONTH);
  });
  it('debits credits until exhausted', () => {
    const plan: Plan = 'fleet';
    let ok = true;
    for (let i = 0; i < ANALYSES_PER_MONTH; i += 1) ok = ledger.debit(plan) && ok;
    expect(ok).toBe(true);
    expect(ledger.debit(plan)).toBe(false);
  });
});
