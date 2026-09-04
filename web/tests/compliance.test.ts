import { describe, expect, it } from 'vitest';

import { buildDossier, daysFromNow, deriveStatus, dossierVerdict } from '@/lib/compliance';
import type { ComplianceItem } from '@/lib/domain';

describe('deriveStatus', () => {
  it('flags overdue at 0 days and due_soon up to 30', () => {
    expect(deriveStatus(0, true)).toBe('overdue');
    expect(deriveStatus(1, true)).toBe('due_soon');
    expect(deriveStatus(30, true)).toBe('due_soon');
    expect(deriveStatus(31, true)).toBe('active');
  });

  it('standing items are active with proof and info_needed without', () => {
    expect(deriveStatus(undefined, true)).toBe('active');
    expect(deriveStatus(undefined, false)).toBe('info_needed');
  });
});

describe('dossierVerdict', () => {
  const item = (partial: Partial<ComplianceItem>): ComplianceItem => ({
    id: 'x', category: 'filing', title: 'x', issuer: 'x', frequency: 'x',
    docOnFile: true, nextAction: 'x', ...partial,
  });

  it('escalates: any overdue -> at_risk', () => {
    expect(dossierVerdict([item({ status: 'overdue' }), item({ status: 'active' })])).toBe('at_risk');
  });
  it('any due_soon or info_needed -> attention', () => {
    expect(dossierVerdict([item({ status: 'due_soon' })])).toBe('attention');
    expect(dossierVerdict([item({ status: 'info_needed' })])).toBe('attention');
  });
  it('all active -> legal', () => {
    expect(dossierVerdict([item({ status: 'active' })])).toBe('legal');
  });
});

describe('buildDossier', () => {
  it('produces a deterministic full dossier with the demo anchor items', () => {
    const d = buildDossier();
    const ids = d.items.map((i) => i.id);
    expect(ids).toContain('authority');
    expect(ids).toContain('coc');
    expect(ids).toContain('dot_insp');
    expect(ids).toContain('ifta');
    expect(ids).toContain('ucr');
    expect(ids).toContain('h2290');
    expect(ids).toContain('boc3');
    expect(ids).toContain('da');
    expect(ids).toContain('eld');
  });

  it('computes dueDate from daysFromNow and derives statuses live', () => {
    const d = buildDossier();
    const coc = d.items.find((i) => i.id === 'coc')!;
    expect(coc.dueDate).toBe(daysFromNow(14));
    expect(coc.daysUntilDue).toBe(14);
    expect(coc.status).toBe('due_soon');
    const da = d.items.find((i) => i.id === 'da')!;
    expect(da.status).toBe('info_needed');
    expect(d.verdict).toBe('attention');
  });

  it('has a docs-on-file shelf with the four standard packet files', () => {
    const d = buildDossier();
    const keys = d.docsOnFile.map((f) => f.key);
    expect(keys).toContain('coc');
    expect(keys).toContain('authority');
    expect(keys).toContain('w9');
    expect(keys).toContain('rate_agreement');
    expect(keys).not.toContain('additional_insured');
  });
});
