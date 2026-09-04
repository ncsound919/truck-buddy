import { describe, expect, it } from 'vitest';

import { buildDossier } from '@/lib/compliance';
import { buildLeadSeeds, packetDraft, seedRateContracts } from '@/lib/contracts';
import { MOCK_TRANSPORT_LABEL, OfflineContractSendSeam } from '@/lib/contract-send';
import { portalApi } from '@/lib/mock-api';
import type { ComplianceDossier, ContractLead, RateContract } from '@/lib/domain';

const LEAD_IDS = ['lead_midlands', 'lead_acme', 'lead_peach', 'lead_haley', 'lead_port', 'lead_raleigh'];

describe('packetDraft', () => {
  const dossier: ComplianceDossier = buildDossier();

  function lead(id: string, requires: boolean): ContractLead {
    return {
      id, company: 'X', kind: 'shipper', source: 's', stage: 'new',
      createdAt: '2026-09-01T00:00:00Z', lastActivityAt: '2026-09-01T00:00:00Z',
      packetRequiresAdditionalInsured: requires,
      vet: { query: 'X', kind: 'shipper', status: 'verified', reasons: [], sourceLabel: 'offline' },
    };
  }

  it('is complete for a lead without the endorsement requirement', () => {
    const draft = packetDraft(lead('a', false), dossier);
    expect(draft.complete).toBe(true);
    expect(draft.missing).toEqual([]);
  });

  it('is incomplete when a broker requires an additional-insured endorsement not on file', () => {
    const draft = packetDraft(lead('a', true), dossier);
    expect(draft.complete).toBe(false);
    expect(draft.missing).toContain('additional_insured');
  });

  it('maps the standard four files from the dossier shelf', () => {
    const draft = packetDraft(lead('a', false), dossier);
    const keys = draft.items.map((i) => i.key);
    expect(keys).toContain('coc');
    expect(keys).toContain('authority');
    expect(keys).toContain('w9');
    expect(keys).toContain('rate_agreement');
    for (const i of draft.items) if (i.fromDossier) expect(i.onFile).toBe(true);
  });
});

describe('buildLeadSeeds', () => {
  it('seeds all six funnel leads with honest vet results, no fabrication', async () => {
    const leads = await buildLeadSeeds();
    const ids = leads.map((l) => l.id);
    for (const id of LEAD_IDS) expect(ids).toContain(id);

    const midlands = leads.find((l) => l.id === 'lead_midlands')!;
    expect(midlands.packetRequiresAdditionalInsured).toBe(true);
    expect(midlands.vet.status).toBe('verified');

    const acme = leads.find((l) => l.id === 'lead_acme')!;
    expect(acme.packetRequiresAdditionalInsured).toBe(false);
    expect(acme.vet.status).toBe('verified');

    const haley = leads.find((l) => l.id === 'lead_haley')!;
    expect(haley.vet.status).toBe('warning');
    expect(haley.vet.reasons.length).toBeGreaterThan(0);
  });
});

describe('seedRateContracts', () => {
  it('seeds a confirm-ready and a signed contract', () => {
    const rcs: RateContract[] = seedRateContracts();
    const ids = rcs.map((r) => r.id);
    expect(ids).toContain('rc_peach');
    expect(ids).toContain('rc_raleigh');
    expect(rcs.find((r) => r.id === 'rc_peach')!.status).toBe('confirmed');
    expect(rcs.find((r) => r.id === 'rc_raleigh')!.status).toBe('signed');
  });
});

describe('OfflineContractSendSeam', () => {
  it('returns a receipt that honestly labels the mock transport', async () => {
    const seam = new OfflineContractSendSeam();
    const draft = packetDraft((await buildLeadSeeds())[0], buildDossier());
    const receipt = await seam.send(draft);
    expect(receipt.deliveredTo).toContain('Demo outbox');
    expect(receipt.sourceLabel).toContain(MOCK_TRANSPORT_LABEL);
    expect(receipt.leadId).toBe(draft.leadId);
  });
});

describe('portalApi — contracts mutations (smoke, run after the pure tests)', () => {
  it('sends a verified complete packet and records a receipt', async () => {
    const before = (await portalApi.getContractLeads()).find((l) => l.id === 'lead_acme')!;
    expect(before.stage).toBe('new');

    const { lead, receipt } = await portalApi.sendPacket('lead_acme');
    expect(lead.stage).toBe('packet_sent');
    expect(lead.packetSentAt).toBeTruthy();
    expect(receipt.leadId).toBe('lead_acme');

    const receipts = await portalApi.getContractReceipts();
    expect(receipts.some((r) => r.leadId === 'lead_acme')).toBe(true);
  });

  it('refuses to send for an unverified lead or an incomplete packet', async () => {
    await expect(portalApi.sendPacket('lead_haley')).rejects.toThrow('lead_not_verified');
    await expect(portalApi.sendPacket('lead_midlands')).rejects.toThrow('packet_incomplete');
  });

  it('sends for signature then signs the peach rate contract', async () => {
    const sent = await portalApi.sendForSignature('rc_peach');
    expect(sent.status).toBe('sent');
    expect(sent.sentAt).toBeTruthy();

    const signed = await portalApi.signContract('rc_peach');
    expect(signed.status).toBe('signed');
    expect(signed.signedAt).toBeTruthy();

    const lead = (await portalApi.getContractLeads()).find((l) => l.id === 'lead_peach')!;
    expect(lead.stage).toBe('signed');
  });

  it('lists the dossier through the shared seam', async () => {
    const dossier = await portalApi.getCompliance();
    expect(dossier.verdict).toBe('attention');
    expect(dossier.items.length).toBe(9);
  });
});
