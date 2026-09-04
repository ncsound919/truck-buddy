# Compliance & Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two owner-operator portal modules to `web/` — a my-compliance dashboard (credentials/filings/programs with due dates) and a lead-to-contract pipeline (vet → carrier packet → rate-confirm → signed contract) — both gated to independent + own-authority profiles and wired through the existing mock `DataSeam`.

**Architecture:** Pure domain logic (fixture build, status/verdict derivation, packet assembly) lives in small lib modules that are unit-tested. The `MockPortalApi` store in `lib/mock-api.ts` gets new `DataSeam` methods with real in-memory mutations, exposed via route handlers. Pages are Next.js server components that compose the store output; interactive mutations are small client components that POST to a route and `router.refresh()`. No real FMCSA lookups, email, or filing — every external action is a labeled seam.

**Tech Stack:** Next.js 15 (App Router, server components), React 19, TypeScript, Tailwind, Vitest. Repo pattern reference: `web/src/lib/vetting.ts`, `web/src/app/portal/money/factoring.tsx`, `web/src/app/api/portal/loads/route.ts`.

**Spec:** `docs/superpowers/specs/2026-09-04-compliance-and-contracts-design.md`

---

### Task 1: Domain types + profile helper

**Files:**
- Modify: `web/src/lib/domain.ts` (append at end)
- Modify: `web/src/lib/perspective.ts`
- Test: `web/tests/perspective.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `web/tests/perspective.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `web/`): `npx vitest run tests/perspective.test.ts`
Expected: FAIL — `runsOwnAuthority is not a function`.

- [ ] **Step 3: Add domain types**

Append to `web/src/lib/domain.ts` (after the existing `DataSeam` type, keeping it type-only — `DataSeam` gets its new method signatures in Task 4):

```ts
/* ------------------- Compliance — owner-operator dossier ------------------- */

export type ComplianceCategory = 'credential' | 'filing' | 'program';
export type ComplianceStatus = 'active' | 'due_soon' | 'overdue' | 'info_needed';
export type DossierVerdict = 'legal' | 'attention' | 'at_risk';

export interface ComplianceItem {
  id: string;
  category: ComplianceCategory;
  title: string;
  issuer: string;
  frequency: string;
  /** ISO. Absent for standing items that never expire. */
  dueDate?: string;
  status: ComplianceStatus;
  daysUntilDue?: number;
  /** A copy of the credential/filing proof is in the driver's file. */
  docOnFile: boolean;
  nextAction: string;
}

/** A stored file the driver holds — the sources a carrier packet draws from. */
export type PacketItemKey = 'coc' | 'authority' | 'w9' | 'rate_agreement' | 'additional_insured';

export interface DocOnFile {
  key: PacketItemKey | 'boc3';
  label: string;
  issuer: string;
  /** ISO — when the underlying credential expires (COI etc.). */
  expires?: string;
}

export interface ComplianceDossier {
  asOf: string;
  verdict: DossierVerdict;
  items: ComplianceItem[];
  docsOnFile: DocOnFile[];
}

/* ------------------------------ Contracts ---------------------------------- */

export type LeadKind = 'broker' | 'shipper';
export type LeadStage = 'new' | 'vetting' | 'packet_sent' | 'negotiating' | 'signed' | 'closed';

export interface ContractLead {
  id: string;
  company: string;
  kind: LeadKind;
  dot?: string;
  contact?: string;
  source: string;
  stage: LeadStage;
  createdAt: string;
  lastActivityAt: string;
  packetSentAt?: string;
  /** Broker/shipper requires a COI endorsement naming them as additional insured. */
  packetRequiresAdditionalInsured: boolean;
  /** Populated by the vetting seam — never fabricated. */
  vet: VettingResult;
}

export interface PacketItem {
  key: PacketItemKey;
  label: string;
  onFile: boolean;
  fromDossier: boolean;
}

export interface PacketDraft {
  leadId: string;
  items: PacketItem[];
  complete: boolean;
  missing: PacketItemKey[];
}

export type ContractStatus = 'confirmed' | 'sent' | 'signed';

export interface RateContract {
  id: string;
  ref: string;
  leadId: string;
  carrier: string;
  lane: { origin: string; destination: string; milesMi: number };
  rateUsd: number;
  ratePerMileUsd: number;
  pickupAt: string;
  deliverBy: string;
  terms: {
    fuel: string;
    detention: string;
    layover: string;
    accessorial: string;
    payTerms: string;
  };
  status: ContractStatus;
  createdAt: string;
  sentAt?: string;
  signedAt?: string;
}

/** Record of a (mock) packet send — the honest transport seam output. */
export interface ContractReceipt {
  leadId: string;
  deliveredTo: string;
  sourceLabel: string;
  at: string;
}

export interface PacketSendResult {
  lead: ContractLead;
  receipt: ContractReceipt;
}
```

- [ ] **Step 4: Add the profile helper**

Append to `web/src/lib/perspective.ts`:

```ts
/** Owner-operators with their own authority drive compliance + contracting. */
export function runsOwnAuthority(p: OperatingProfile): boolean {
  return canFactor(p);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run (from `web/`): `npx vitest run tests/perspective.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck + commit**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors (domain/perspective additions are additive).

```bash
git add web/src/lib/domain.ts web/src/lib/perspective.ts web/tests/perspective.test.ts
git commit -m "feat(web): add compliance + contracts domain types and owner-operator gate"
```

---

### Task 2: Compliance logic library

**Files:**
- Create: `web/src/lib/compliance.ts`
- Test: `web/tests/compliance.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `web/tests/compliance.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `web/`): `npx vitest run tests/compliance.test.ts`
Expected: FAIL — cannot find module `@/lib/compliance`.

- [ ] **Step 3: Implement `lib/compliance.ts`**

Create `web/src/lib/compliance.ts`:

```ts
import type {
  ComplianceDossier,
  ComplianceItem,
  ComplianceStatus,
  DossierVerdict,
} from '@/lib/domain';

/** ISO date `n` days from today at UTC midnight — keeps the demo evergreen. */
export function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

export interface ComplianceSeed {
  id: string;
  category: ComplianceItem['category'];
  title: string;
  issuer: string;
  frequency: string;
  /** Days until the due date. Absent = standing item that never expires. */
  dueInDays?: number;
  docOnFile: boolean;
  nextAction: string;
}

const SEEDS: ComplianceSeed[] = [
  {
    id: 'authority', category: 'credential', title: 'Operating authority (MC/DOT)', issuer: 'FMCSA',
    frequency: 'Biennial update', dueInDays: 380, docOnFile: true,
    nextAction: 'File the biennial update before the window opens.',
  },
  {
    id: 'coc', category: 'credential', title: 'Auto liability certificate (COI)', issuer: 'Your insurer',
    frequency: 'Annual renewal', dueInDays: 14, docOnFile: true,
    nextAction: 'Renew your COI and file the new certificate.',
  },
  {
    id: 'dot_insp', category: 'credential', title: 'Annual DOT inspection', issuer: 'FMCSA / state',
    frequency: 'Every 12 months', dueInDays: 8, docOnFile: true,
    nextAction: 'Schedule the annual inspection and keep the report on file.',
  },
  {
    id: 'ifta', category: 'filing', title: 'IFTA quarterly fuel tax', issuer: 'NC DMV / FMCSA',
    frequency: 'Quarterly return', dueInDays: 57, docOnFile: true,
    nextAction: 'File the quarterly IFTA return.',
  },
  {
    id: 'ucr', category: 'filing', title: 'Unified Carrier Registration (UCR)', issuer: 'UCR · your state',
    frequency: 'Annual', dueInDays: 45, docOnFile: true,
    nextAction: 'Renew your UCR registration.',
  },
  {
    id: 'h2290', category: 'filing', title: 'HVUT Form 2290', issuer: 'IRS',
    frequency: 'Annual · due ~August', dueInDays: 350, docOnFile: true,
    nextAction: 'Pay and file the next Form 2290.',
  },
  {
    id: 'boc3', category: 'program', title: 'BOC-3 process agent', issuer: 'FMCSA',
    frequency: 'Standing', docOnFile: true,
    nextAction: "None — keep your agent's contact current.",
  },
  {
    id: 'da', category: 'program', title: 'Drug & alcohol consortium', issuer: 'Consortium',
    frequency: 'Standing', docOnFile: false,
    nextAction: 'Add proof of consortium enrollment to your file.',
  },
  {
    id: 'eld', category: 'program', title: 'ELD / HOS provider', issuer: 'FMCSA-registered',
    frequency: 'Standing', docOnFile: true,
    nextAction: 'None — keep your ELD registration current.',
  },
];

/** Derive a compliance status from due date + proof. Pure — unit tested. */
export function deriveStatus(dueInDays: number | undefined, docOnFile: boolean): ComplianceStatus {
  if (dueInDays === undefined) return docOnFile ? 'active' : 'info_needed';
  return dueInDays <= 0 ? 'overdue' : dueInDays <= 30 ? 'due_soon' : 'active';
}

/** Overall dossier verdict. Pure — unit tested. */
export function dossierVerdict(items: ComplianceItem[]): DossierVerdict {
  if (items.some((i) => i.status === 'overdue')) return 'at_risk';
  if (items.some((i) => i.status === 'due_soon' || i.status === 'info_needed')) return 'attention';
  return 'legal';
}

/** Deterministic dossier for the demo owner-operator (relative to today). */
export function buildDossier(): ComplianceDossier {
  const items: ComplianceItem[] = SEEDS.map((s) => ({
    id: s.id,
    category: s.category,
    title: s.title,
    issuer: s.issuer,
    frequency: s.frequency,
    dueDate: s.dueInDays === undefined ? undefined : daysFromNow(s.dueInDays),
    status: deriveStatus(s.dueInDays, s.docOnFile),
    daysUntilDue: s.dueInDays,
    docOnFile: s.docOnFile,
    nextAction: s.nextAction,
  }));

  return {
    asOf: new Date().toISOString(),
    verdict: dossierVerdict(items),
    items,
    docsOnFile: [
      { key: 'coc', label: 'Certificate of insurance (COI)', issuer: 'Brooks Logistics LLC · current policy', expires: daysFromNow(14) },
      { key: 'authority', label: 'MC/DOT authority letter', issuer: 'FMCSA · MC-482119' },
      { key: 'w9', label: 'W-9', issuer: 'IRS · Brooks Logistics LLC' },
      { key: 'rate_agreement', label: 'Blank rate agreement', issuer: 'Brooks Logistics LLC' },
    ],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `web/`): `npx vitest run tests/compliance.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/compliance.ts web/tests/compliance.test.ts
git commit -m "feat(web): compliance dossier build + status/verdict logic"
```

---

### Task 3: Contracts logic library (seeds, packet assembly, transport seam)

**Files:**
- Create: `web/src/lib/contracts.ts`
- Create: `web/src/lib/contract-send.ts`
- Test: `web/tests/contracts.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `web/tests/contracts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `web/`): `npx vitest run tests/contracts.test.ts`
Expected: FAIL — cannot find module `@/lib/contracts`.

- [ ] **Step 3: Implement `lib/contract-send.ts`**

Create `web/src/lib/contract-send.ts`:

```ts
import type { ContractReceipt, PacketDraft } from '@/lib/domain';

/**
 * Packet delivery transport. Offline by default — real email needs the Supabase
 * Edge Function (dispatch-send) + Resend, exactly like the cab app's email path.
 */
export interface ContractSendSeam {
  send(draft: PacketDraft): Promise<ContractReceipt>;
}

export const MOCK_TRANSPORT_LABEL =
  'Mock transport — nothing was emailed. Real packet delivery needs the Supabase Edge Function (dispatch-send) + Resend; see AGENTS.md.';

export class OfflineContractSendSeam implements ContractSendSeam {
  async send(draft: PacketDraft): Promise<ContractReceipt> {
    await new Promise((r) => setTimeout(r, 350));
    return {
      leadId: draft.leadId,
      deliveredTo: 'Demo outbox (not emailed)',
      sourceLabel: MOCK_TRANSPORT_LABEL,
      at: new Date().toISOString(),
    };
  }
}

export const contractSendSeam: ContractSendSeam = new OfflineContractSendSeam();
```

- [ ] **Step 4: Implement `lib/contracts.ts`**

Create `web/src/lib/contracts.ts`:

```ts
import type {
  ComplianceDossier,
  ContractLead,
  PacketDraft,
  PacketItem,
  PacketItemKey,
  RateContract,
  VettingResult,
} from '@/lib/domain';
import { vettingSeam } from '@/lib/vetting';

const STANDARD_PACKET: { key: PacketItemKey; label: string }[] = [
  { key: 'coc', label: 'Certificate of insurance (COI)' },
  { key: 'authority', label: 'MC/DOT authority letter' },
  { key: 'w9', label: 'W-9' },
  { key: 'rate_agreement', label: 'Blank rate agreement' },
];

/** Build the per-lead packet from the dossier's docs-on-file shelf. Pure. */
export function packetDraft(lead: ContractLead, dossier: ComplianceDossier): PacketDraft {
  const items: PacketItem[] = STANDARD_PACKET.map((p) => ({
    key: p.key,
    label: p.label,
    fromDossier: true,
    onFile: dossier.docsOnFile.some((d) => d.key === p.key),
  }));
  if (lead.packetRequiresAdditionalInsured) {
    items.push({
      key: 'additional_insured',
      label: 'COI endorsement naming this counterparty as additional insured',
      fromDossier: false,
      onFile: dossier.docsOnFile.some((d) => d.key === 'additional_insured'),
    });
  }
  const missing = items.filter((i) => !i.onFile).map((i) => i.key);
  return { leadId: lead.id, items, complete: missing.length === 0, missing };
}

interface LeadSeed {
  id: string;
  company: string;
  kind: ContractLead['kind'];
  dot: string;
  contact: string;
  source: string;
  stage: ContractLead['stage'];
  daysAgo: number;
  requiresEndorsement: boolean;
}

const LEAD_SEEDS: LeadSeed[] = [
  {
    id: 'lead_midlands', company: 'Midlands Produce', kind: 'shipper', dot: '2551400',
    contact: 'Patti Odom · Shipping manager', source: 'Referral — Carolina Co-op',
    stage: 'new', daysAgo: 2, requiresEndorsement: true,
  },
  {
    id: 'lead_acme', company: 'ACME Distribution Center', kind: 'shipper', dot: '3149271',
    contact: 'Pat Nguyen · Dispatcher', source: 'Direct outreach — current customer',
    stage: 'new', daysAgo: 4, requiresEndorsement: false,
  },
  {
    id: 'lead_peach', company: 'Peach Steel', kind: 'shipper', dot: '1762293',
    contact: 'Reggie Cole · Freight buyer', source: 'Load board — Carolina Co-op Board',
    stage: 'negotiating', daysAgo: 9, requiresEndorsement: false,
  },
  {
    id: 'lead_haley', company: 'Haley Logistics', kind: 'broker', dot: '1900452',
    contact: 'Maya Reyes · Dispatcher', source: 'Load board — Haley Logistics Board',
    stage: 'vetting', daysAgo: 1, requiresEndorsement: false,
  },
  {
    id: 'lead_port', company: 'Port Logistics', kind: 'broker', dot: '2448903',
    contact: '—', source: 'Load board — Carolina Co-op Board', stage: 'vetting', daysAgo: 3,
    requiresEndorsement: false,
  },
  {
    id: 'lead_raleigh', company: 'Raleigh Freight Co.', kind: 'shipper', dot: '2088114',
    contact: 'Nina Patel · Account manager', source: 'Load board — Raleigh Freight Board',
    stage: 'signed', daysAgo: 21, requiresEndorsement: false,
  },
];

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};

/** Seed leads, each vetted through the real (offline) vetting seam. */
export async function buildLeadSeeds(): Promise<ContractLead[]> {
  const mk = async (s: LeadSeed): Promise<ContractLead> => {
    const vet: VettingResult = await vettingSeam.check(s.company, s.kind);
    const created = isoDaysAgo(s.daysAgo);
    return {
      id: s.id,
      company: s.company,
      kind: s.kind,
      dot: vet.dotNumber ?? s.dot,
      contact: s.contact,
      source: s.source,
      stage: s.stage,
      createdAt: created,
      lastActivityAt: created,
      packetSentAt: s.stage === 'negotiating' || s.stage === 'signed' ? isoDaysAgo(s.daysAgo - 2) : undefined,
      packetRequiresAdditionalInsured: s.requiresEndorsement,
      vet,
    };
  };
  return Promise.all(LEAD_SEEDS.map(mk));
}

/** Rate confirmations on the path to a signed contract. */
export function seedRateContracts(): RateContract[] {
  return [
    {
      id: 'rc_peach',
      ref: 'RC-2026-0417',
      leadId: 'lead_peach',
      carrier: 'Brooks Logistics LLC · MC-482119',
      lane: { origin: 'Charlotte, NC', destination: 'Knoxville, TN', milesMi: 210 },
      rateUsd: 1190,
      ratePerMileUsd: 5.67,
      pickupAt: 'Sat 08:00',
      deliverBy: 'Sat 18:00',
      terms: {
        fuel: 'Fuel surcharge per DOE index',
        detention: '2h free, then $85/h',
        layover: '$200/day after first 24h',
        accessorial: 'Lumper billed back through broker',
        payTerms: 'Net-30 on POD',
      },
      status: 'confirmed',
      createdAt: isoDaysAgo(2),
    },
    {
      id: 'rc_raleigh',
      ref: 'RC-2026-0392',
      leadId: 'lead_raleigh',
      carrier: 'Brooks Logistics LLC · MC-482119',
      lane: { origin: 'Raleigh, NC', destination: 'Charlotte, NC', milesMi: 112 },
      rateUsd: 760,
      ratePerMileUsd: 6.79,
      pickupAt: 'Today 06:40',
      deliverBy: 'Today 12:30',
      terms: {
        fuel: 'Included at $0.60/mi above baseline',
        detention: '90min free, then $75/h',
        layover: '$180/day',
        accessorial: 'None',
        payTerms: 'Net-15 on POD',
      },
      status: 'signed',
      createdAt: isoDaysAgo(21),
      sentAt: isoDaysAgo(18),
      signedAt: isoDaysAgo(17),
    },
  ];
}
```

- [ ] **Step 5: Add the missing DataSeam scaffolding needed by the test's smoke section**

The smoke tests call `portalApi.sendPacket`, `sendForSignature`, `signContract`,
`getContractLeads`, `getRateContracts`, `getContractReceipts`, and `getCompliance`.
`MockPortalApi` does not implement these yet, so the test cannot compile. To keep Task 3
self-contained, add the interface signatures to `DataSeam` in `web/src/lib/domain.ts`
(append to the `DataSeam` type body, after the existing members):

```ts
  getCompliance(): Promise<ComplianceDossier>;
  getContractLeads(): Promise<ContractLead[]>;
  getRateContracts(): Promise<RateContract[]>;
  getContractReceipts(): Promise<ContractReceipt[]>;
  sendPacket(leadId: string): Promise<PacketSendResult>;
  sendForSignature(id: string): Promise<RateContract>;
  signContract(id: string): Promise<RateContract>;
```

- [ ] **Step 6: Implement the methods on `MockPortalApi`**

In `web/src/lib/mock-api.ts`:

1. Extend the type import block at the top of the file to include:
   `ComplianceDossier, ComplianceItem` (unused here — omit), actually add only:
   `ComplianceDossier, ContractLead, ContractReceipt, PacketSendResult, RateContract`.

   Replace the existing import block (lines 1–20) with:

```ts
import type {
  BoardSource,
  ComplianceDossier,
  ContractLead,
  ContractReceipt,
  DataSeam,
  DispatchMessage,
  DocKind,
  DriverProfile,
  Earnings,
  EquipmentId,
  Load,
  OperatingProfile,
  Organization,
  OrgKind,
  OrgMember,
  OrgMembership,
  OrgRole,
  PacketSendResult,
  PortalToday,
  RateContract,
  TruckDoc,
  TruckHealth,
  VehicleDetail,
} from '@/lib/domain';
import { membershipPerspective } from '@/lib/rbac';
import { buildDossier } from '@/lib/compliance';
import { buildLeadSeeds, seedRateContracts } from '@/lib/contracts';
import { contractSendSeam } from '@/lib/contract-send';
```

2. Add private fields + the seven methods inside the `MockPortalApi` class (place after
   `acceptLoad`, before `getVehicleDetail`):

```ts
  private leadsPromise: Promise<ContractLead[]> = buildLeadSeeds();
  private rateContracts: RateContract[] = seedRateContracts();
  private receipts: ContractReceipt[] = [];

  async getCompliance(): Promise<ComplianceDossier> {
    await delay(120);
    return buildDossier();
  }

  async getContractLeads(): Promise<ContractLead[]> {
    await delay(120);
    return (await this.leadsPromise).map(clone);
  }

  async getRateContracts(): Promise<RateContract[]> {
    await delay(100);
    return this.rateContracts.map(clone);
  }

  async getContractReceipts(): Promise<ContractReceipt[]> {
    await delay(80);
    return clone(this.receipts);
  }

  async sendPacket(leadId: string): Promise<PacketSendResult> {
    await delay(450);
    const leads = await this.leadsPromise;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('lead_not_found');
    if (lead.vet.status !== 'verified') throw new Error('lead_not_verified');
    const draft = packetDraft(lead, buildDossier());
    if (!draft.complete) throw new Error('packet_incomplete');
    const receipt = await contractSendSeam.send(draft);
    this.receipts.unshift(receipt);
    lead.stage = 'packet_sent';
    lead.packetSentAt = receipt.at;
    lead.lastActivityAt = receipt.at;
    return { lead: clone(lead), receipt };
  }

  async sendForSignature(id: string): Promise<RateContract> {
    await delay(300);
    const rc = this.rateContracts.find((r) => r.id === id);
    if (!rc) throw new Error('contract_not_found');
    if (rc.status === 'signed') throw new Error('contract_already_signed');
    rc.status = 'sent';
    rc.sentAt = new Date().toISOString();
    return clone(rc);
  }

  async signContract(id: string): Promise<RateContract> {
    await delay(350);
    const rc = this.rateContracts.find((r) => r.id === id);
    if (!rc) throw new Error('contract_not_found');
    if (rc.status === 'signed') throw new Error('contract_already_signed');
    rc.status = 'signed';
    rc.signedAt = new Date().toISOString();
    const leads = await this.leadsPromise;
    const lead = leads.find((l) => l.id === rc.leadId);
    if (lead) {
      lead.stage = 'signed';
      lead.lastActivityAt = rc.signedAt;
    }
    return clone(rc);
  }
```

3. Add the import for `packetDraft` in the contracts import:
   `import { buildLeadSeeds, packetDraft, seedRateContracts } from '@/lib/contracts';`

- [ ] **Step 7: Run the test to verify it passes**

Run (from `web/`): `npx vitest run tests/contracts.test.ts`
Expected: PASS (all describes). Note: vitest isolates each test file in its own module
registry, so `portalApi` here is a fresh singleton; the smoke describes run after the pure
ones in declaration order.

- [ ] **Step 8: Typecheck + commit**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/domain.ts web/src/lib/mock-api.ts web/src/lib/contracts.ts web/src/lib/contract-send.ts web/tests/contracts.test.ts
git commit -m "feat(web): contracts seeds, packet assembly, and contract store mutations"
```

---

### Task 4: Route handlers

**Files:**
- Create: `web/src/app/api/portal/compliance/route.ts`
- Create: `web/src/app/api/portal/contracts/route.ts`

- [ ] **Step 1: Create the compliance route**

Create `web/src/app/api/portal/compliance/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

/**
 * Portal compliance dossier.
 * GET /api/portal/compliance -> { dossier }
 */
export async function GET() {
  const dossier = await portalApi.getCompliance();
  return NextResponse.json({ dossier });
}
```

- [ ] **Step 2: Create the contracts route**

Create `web/src/app/api/portal/contracts/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

/**
 * Portal contracts — reads and the funnel mutations.
 * GET  /api/portal/contracts -> { leads, rateContracts, receipts }
 * POST /api/portal/contracts -> send_packet { leadId } | send_for_signature { id } | sign { id }
 *
 * The authoritative store is the shared server module instance, so a mutation here
 * is visible on the next server render.
 */
export async function GET() {
  const [leads, rateContracts, receipts] = await Promise.all([
    portalApi.getContractLeads(),
    portalApi.getRateContracts(),
    portalApi.getContractReceipts(),
  ]);
  return NextResponse.json({ leads, rateContracts, receipts });
}

const ERROR_STATUS: Record<string, number> = {
  lead_not_found: 404,
  contract_not_found: 404,
  lead_not_verified: 409,
  packet_incomplete: 409,
  contract_already_signed: 409,
};

export async function POST(req: Request) {
  let body: { action?: string; leadId?: string; id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    if (body.action === 'send_packet') {
      if (!body.leadId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
      const result = await portalApi.sendPacket(body.leadId);
      return NextResponse.json({ lead: result.lead, receipt: result.receipt });
    }
    if (body.action === 'send_for_signature') {
      if (!body.id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
      const contract = await portalApi.sendForSignature(body.id);
      return NextResponse.json({ contract });
    }
    if (body.action === 'sign') {
      if (!body.id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
      const contract = await portalApi.signContract(body.id);
      return NextResponse.json({ contract });
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  } catch (e) {
    const err = e instanceof Error ? e.message : 'unknown';
    const status = ERROR_STATUS[err] ?? 500;
    return NextResponse.json({ error: err }, { status });
  }
}
```

- [ ] **Step 3: Typecheck + commit**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/app/api/portal/compliance/route.ts web/src/app/api/portal/contracts/route.ts
git commit -m "feat(web): portal API routes for compliance and contract funnel"
```

---

### Task 5: Icons

**Files:**
- Modify: `web/src/components/icons.tsx`

- [ ] **Step 1: Add two icons**

Append to `web/src/components/icons.tsx`:

```tsx
export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" />
    <path d="M12 9.2v2.6M12 15v.2" />
  </svg>
);

export const ContractIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v4h4" />
    <path d="M12 14.2l4.2-4.2 1.6 1.6-4.2 4.2z" />
    <path d="M11 17.5l-2 .5.5-2z" />
  </svg>
);
```

- [ ] **Step 2: Typecheck + commit**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/components/icons.tsx
git commit -m "feat(web): add compliance shield and contract icons"
```

---

### Task 6: Compliance page

**Files:**
- Create: `web/src/app/portal/compliance/page.tsx`

- [ ] **Step 1: Create the page**

Create `web/src/app/portal/compliance/page.tsx`:

```tsx
import Link from 'next/link';

import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { ShieldIcon } from '@/components/icons';
import { portalApi } from '@/lib/mock-api';
import { runsOwnAuthority } from '@/lib/perspective';
import type {
  ComplianceCategory,
  ComplianceItem,
  ComplianceStatus,
  DossierVerdict,
} from '@/lib/domain';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<ComplianceCategory, string> = {
  credential: 'Credentials',
  filing: 'Filings',
  program: 'Programs',
};

const STATUS_TONE: Record<ComplianceStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  info_needed: 'warning',
};

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  active: 'Active',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  info_needed: 'Needs proof',
};

const VERDICT_BANNER: Record<
  DossierVerdict,
  { tone: 'success' | 'warning' | 'danger'; label: string; body: string }
> = {
  legal: {
    tone: 'success',
    label: 'You’re in good standing',
    body: 'Nothing is due in the next 30 days and your required documents are on file.',
  },
  attention: {
    tone: 'warning',
    label: 'Action needed soon',
    body: 'Something is due in the next 30 days or is missing from your file. Fix it before it bites.',
  },
  at_risk: {
    tone: 'danger',
    label: 'At risk — not legal to run',
    body: 'An item is overdue or your file is missing proof you must carry. Do not dispatch until this is cleared.',
  },
};

export default async function CompliancePage() {
  const [dossier, profile] = await Promise.all([
    portalApi.getCompliance(),
    portalApi.getOperatingProfile(),
  ]);

  if (!runsOwnAuthority(profile)) {
    return (
      <div>
        <PageTitle
          title="Compliance"
          subtitle="What you must keep current to run legal."
        />
        <EmptyState
          icon={<ShieldIcon width={22} height={22} />}
          title="Your employer or carrier holds the compliance file"
          body="As a leased or company driver, the operating authority, filings, and insurance certificates belong to the carrier you run under. Truck Buddy only tracks compliance for independents with their own authority."
        />
      </div>
    );
  }

  const banner = VERDICT_BANNER[dossier.verdict];
  const categories: ComplianceCategory[] = ['credential', 'filing', 'program'];

  return (
    <div>
      <PageTitle
        title="Compliance"
        subtitle="What you must keep current to run legal — reminders only, Truck Buddy never files or pays."
      />

      <div
        className={cn(
          'mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4',
          banner.tone === 'success' && 'border-success-soft bg-success-soft/40',
          banner.tone === 'warning' && 'border-warning-soft bg-warning-soft/50',
          banner.tone === 'danger' && 'border-danger-soft bg-danger-soft/40',
        )}
      >
        <ShieldIcon
          width={22}
          height={22}
          className={
            banner.tone === 'success'
              ? 'text-success'
              : banner.tone === 'warning'
                ? 'text-warning'
                : 'text-danger'
          }
        />
        <div>
          <div
            className={cn(
              'text-[15px] font-extrabold',
              banner.tone === 'success'
                ? 'text-success'
                : banner.tone === 'warning'
                  ? 'text-warning'
                  : 'text-danger',
            )}
          >
            {banner.label}
          </div>
          <p className="mt-0.5 text-sm text-muted">{banner.body}</p>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => {
          const items = dossier.items.filter((i) => i.category === cat);
          if (items.length === 0) return null;
          return (
            <SectionCard
              key={cat}
              title={CATEGORY_LABEL[cat]}
              action={
                <Badge tone="neutral">
                  {items.filter((i) => i.status === 'active').length}/{items.length} good
                </Badge>
              }
            >
              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <ComplianceRow key={item.id} item={item} />
                ))}
              </ul>
            </SectionCard>
          );
        })}

        <SectionCard title="Docs on file" action={<Badge tone="success">{dossier.docsOnFile.length} stored</Badge>}>
          <p className="mb-3 text-sm text-muted">
            These are the stored files your carrier packet draws from when you formalize a new client.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dossier.docsOnFile.map((doc) => (
              <li key={doc.key} className="rounded-xl border border-line bg-bg-alt/40 px-3.5 py-2.5">
                <div className="text-sm font-bold text-ink">{doc.label}</div>
                <div className="text-xs text-faint">{doc.issuer}</div>
                {doc.expires ? (
                  <div className="mt-1 text-xs font-semibold text-warning">
                    Expires {new Date(doc.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>

        <p className="text-xs text-faint">
          Reminders only — Truck Buddy does not file, renew, or pay anything. Renewal dates are
          estimates for this demo and are not sourced from FMCSA, the IRS, or your insurer.
        </p>
      </div>
    </div>
  );
}

function ComplianceRow({ item }: { item: ComplianceItem }) {
  const tone = STATUS_TONE[item.status];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-ink">{item.title}</span>
          <Badge tone={tone} dot>
            {STATUS_LABEL[item.status]}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-faint">
          {item.issuer} · {item.frequency}
          {item.daysUntilDue !== undefined
            ? ` · ${item.daysUntilDue <= 0 ? 'due now' : `due in ${item.daysUntilDue} day${item.daysUntilDue === 1 ? '' : 's'}`}`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline',
            item.docOnFile ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
          )}
        >
          {item.docOnFile ? 'On file' : 'Missing proof'}
        </span>
        <span className="max-w-[220px] text-right text-xs text-muted">{item.nextAction}</span>
      </div>
    </li>
  );
}
```

Note: the banner/verify badges use the existing utility color classes already referenced
elsewhere in the repo (`bg-success-soft`, `text-warning`, `border-warning-soft`, etc.) — do
not invent new ones; if `danger-soft`/`success-soft` shades are already used (they are, e.g.
`money/factoring.tsx` and `primitives.tsx`), keep them.

- [ ] **Step 2: Typecheck + lint**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

Run (from `web/`): `npm run lint`
Expected: no new errors for this file.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/portal/compliance/page.tsx
git commit -m "feat(web): compliance dashboard page (gated to owner-operators)"
```

---

### Task 7: Contracts page — server shell + client sections

**Files:**
- Create: `web/src/app/portal/contracts/page.tsx`
- Create: `web/src/app/portal/contracts/packet.tsx`
- Create: `web/src/app/portal/contracts/rate-contracts.tsx`

The page is a server component that loads the funnel data + dossier, computes packet
drafts, and composes three client sections. File layout mirrors `portal/money/factoring.tsx`.

- [ ] **Step 1: Create the packet composer client component**

Create `web/src/app/portal/contracts/packet.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, ShieldIcon } from '@/components/icons';
import type { ContractLead, ContractReceipt, PacketDraft } from '@/lib/domain';
import { cn } from '@/lib/cn';

export interface PacketEntry {
  lead: ContractLead;
  draft: PacketDraft;
}

export function PacketComposer({ entries, receipts }: { entries: PacketEntry[]; receipts: ContractReceipt[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(entries[0]?.lead.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const entry = entries.find((e) => e.lead.id === selectedId) ?? entries[0];
  if (!entry) return null;
  const { lead, draft } = entry;
  const sentReceipt = receipts.find((r) => r.leadId === lead.id);

  async function send() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch('/api/portal/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_packet', leadId: lead.id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'send_failed');
      }
      const data = (await res.json()) as { receipt: ContractReceipt };
      setFlash({ ok: true, text: 'Packet sent — ' + data.receipt.deliveredTo });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[15px] font-extrabold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            <ShieldIcon width={18} height={18} />
          </span>
          Carrier packet
        </div>
        <div className="flex gap-2">
          {entries.map((e) => (
            <button
              key={e.lead.id}
              onClick={() => setSelectedId(e.lead.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition',
                e.lead.id === entry.lead.id
                  ? 'bg-accent text-white'
                  : 'border border-line bg-white text-ink-2 hover:bg-bg-alt',
              )}
            >
              {e.lead.company}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Files {lead.company} asks for before they&rsquo;ll book you.
        </p>
        <Badge tone={draft.complete ? 'success' : 'warning'}>
          {draft.items.filter((i) => i.onFile).length}/{draft.items.length} ready
        </Badge>
      </div>

      <ul className="space-y-2">
        {draft.items.map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5',
              item.onFile ? 'border-line bg-bg-alt/40' : 'border-dashed border-line bg-white',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  item.onFile ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
                )}
              >
                {item.onFile ? '✓' : '!'}
              </span>
              <div>
                <div className="text-sm font-bold text-ink">{item.label}</div>
                <div className="text-xs text-faint">
                  {item.onFile
                    ? item.fromDossier
                      ? 'From your compliance docs on file'
                      : 'On file'
                    : 'Not on file'}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!draft.complete ? (
        <div className="mt-3 rounded-xl border border-warning-soft bg-warning-soft/50 px-3.5 py-2.5">
          <p className="text-[13px] font-semibold text-warning">
            {lead.packetRequiresAdditionalInsured
              ? `${lead.company} requires a COI endorsement naming them as additional insured. Get an updated COI from your insurer first.`
              : 'Get the missing files on file before you send this packet.'}
          </p>
          <Link
            href="/portal/compliance"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
          >
            Open compliance <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
      {flash && flash.ok ? (
        <p className="mt-3 rounded-xl border border-success-soft bg-success-soft px-3.5 py-2.5 text-sm font-semibold text-success">
          {flash.text}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={send} disabled={busy || !draft.complete || lead.vet.status !== 'verified' || lead.stage === 'packet_sent'}>
          {busy
            ? 'Sending…'
            : lead.stage === 'packet_sent'
              ? 'Packet already sent'
              : 'Send packet'}
        </Button>
        {sentReceipt ? (
          <span className="rounded-full border border-dashed border-line px-3 py-1 text-xs font-semibold text-faint">
            Queued to the demo outbox — nothing was emailed
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Packet delivery is demo-only: no email is sent from this portal yet. Real delivery
        routes through the Supabase Edge Function + Resend when it is deployed.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create the rate-contract client component**

Create `web/src/app/portal/contracts/rate-contracts.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckIcon, ContractIcon } from '@/components/icons';
import type { ContractStatus, RateContract } from '@/lib/domain';
import { money } from '@/lib/format';

const STATUS_BADGE: Record<ContractStatus, { label: string; tone: 'accent' | 'success' | 'warning' }> = {
  confirmed: { label: 'Confirmed', tone: 'accent' },
  sent: { label: 'Sent for signature', tone: 'warning' },
  signed: { label: 'Signed', tone: 'success' },
};

export function RateContractsSection({ contracts }: { contracts: RateContract[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = contracts.filter((c) => c.status !== 'signed');
  const signed = contracts.filter((c) => c.status === 'signed');

  async function run(action: 'send_for_signature' | 'sign', id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/portal/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'action_failed');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {active.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((c) => {
            const b = STATUS_BADGE[c.status];
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-ink">{c.ref}</span>
                      <Badge tone={b.tone} dot>{b.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{c.lane.origin} → {c.lane.destination} · {c.lane.milesMi} mi</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-ink">{money(c.rateUsd)}</div>
                    <div className="text-xs text-faint">${c.ratePerMileUsd.toFixed(2)}/mi</div>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-faint">Pickup</dt><dd className="font-semibold text-ink">{c.pickupAt}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-faint">Deliver</dt><dd className="font-semibold text-ink">{c.deliverBy}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-faint">Detention</dt><dd className="font-semibold text-ink">{c.terms.detention}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-faint">Pay terms</dt><dd className="font-semibold text-ink">{c.terms.payTerms}</dd></div>
                </dl>

                <div className="mt-4 flex items-center gap-2">
                  {c.status === 'confirmed' ? (
                    <Button size="sm" disabled={busyId === c.id} onClick={() => run('send_for_signature', c.id)}>
                      {busyId === c.id ? 'Sending…' : 'Send for signature'}
                    </Button>
                  ) : c.status === 'sent' ? (
                    <Button size="sm" disabled={busyId === c.id} onClick={() => run('sign', c.id)}>
                      {busyId === c.id ? 'Signing…' : 'Mark signed'}
                    </Button>
                  ) : null}
                  <span className="text-xs text-faint">{c.carrier}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-bg-alt/40 px-4 py-3 text-sm text-muted">
          No rate confirmations waiting on a signature right now.
        </p>
      )}

      {signed.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-2">Signed contracts</h3>
          <ul className="space-y-2.5">
            {signed.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success-soft bg-success-soft/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-white">
                    <ContractIcon width={18} height={18} />
                  </span>
                  <div>
                    <div className="font-mono text-sm font-extrabold text-ink">{c.ref}</div>
                    <div className="text-xs text-faint">
                      {c.lane.origin} → {c.lane.destination} · {c.terms.payTerms}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-success">{money(c.rateUsd)}</div>
                  <div className="flex items-center justify-end gap-1 text-xs text-success">
                    <CheckIcon width={12} height={12} />
                    {c.signedAt ? `Signed ${new Date(c.signedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Signed'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
```

Check `web/src/lib/format.ts` exports `money` (it does — `export function money(n: number): string`); if the signature differs, adapt the import accordingly.

- [ ] **Step 3: Create the contracts page (server shell + leads list)**

Create `web/src/app/portal/contracts/page.tsx`:

```tsx
import Link from 'next/link';

import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { ContractIcon, ShieldIcon } from '@/components/icons';
import { packetDraft } from '@/lib/contracts';
import { portalApi } from '@/lib/mock-api';
import { runsOwnAuthority } from '@/lib/perspective';
import { vettingLabel } from '@/lib/vetting';
import type { ContractLead, LeadStage } from '@/lib/domain';
import { PacketComposer, type PacketEntry } from './packet';
import { RateContractsSection } from './rate-contracts';

export const dynamic = 'force-dynamic';

const STAGE_BADGE: Record<LeadStage, { label: string; tone: 'accent' | 'success' | 'warning' | 'neutral' }> = {
  new: { label: 'New', tone: 'accent' },
  vetting: { label: 'Vetting', tone: 'warning' },
  packet_sent: { label: 'Packet sent', tone: 'warning' },
  negotiating: { label: 'Negotiating', tone: 'accent' },
  signed: { label: 'Signed', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export default async function ContractsPage() {
  const [leads, rateContracts, receipts, dossier, profile] = await Promise.all([
    portalApi.getContractLeads(),
    portalApi.getRateContracts(),
    portalApi.getContractReceipts(),
    portalApi.getCompliance(),
    portalApi.getOperatingProfile(),
  ]);

  if (!runsOwnAuthority(profile)) {
    return (
      <div>
        <PageTitle title="Contracts" subtitle="Turn leads into signed loads." />
        <EmptyState
          icon={<ContractIcon width={22} height={22} />}
          title="Your employer or carrier handles contracting"
          body="As a leased or company driver, work is assigned by your dispatcher — you do not chase or contract shippers yourself. Truck Buddy only offers lead-to-contract tooling for independents with their own authority."
        />
      </div>
    );
  }

  const packetEntries: PacketEntry[] = leads
    .filter((l) => l.stage === 'new')
    .map((lead) => ({ lead, draft: packetDraft(lead, dossier) }));

  const open = leads.filter((l) => l.stage !== 'signed' && l.stage !== 'closed');
  const signed = leads.filter((l) => l.stage === 'signed');

  return (
    <div>
      <PageTitle
        title="Contracts"
        subtitle="Vet who you work with, send your carrier packet, and lock the rate."
      />

      <SectionCard title="Leads — who you could be contracting with">
        <ul className="space-y-2.5">
          {open.map((lead) => {
            const stage = STAGE_BADGE[lead.stage];
            const risky = lead.vet.status !== 'verified';
            return (
              <li key={lead.id} className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-ink">{lead.company}</span>
                        <Badge tone="neutral" className="normal-case tracking-normal">
                          {lead.kind}
                        </Badge>
                        <Badge tone={stage.tone} dot>{stage.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-faint">
                        {lead.contact} · {lead.source}
                        {lead.dot ? ` · DOT ${lead.dot}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={risky ? 'warning' : 'success'}
                      className="normal-case tracking-normal"
                    >
                      {vettingLabel(lead.vet.status)}
                    </Badge>
                    {lead.stage === 'negotiating' ? (
                      <span className="text-xs font-semibold text-accent">Rate card below ↓</span>
                    ) : null}
                  </div>
                </div>
                {risky ? (
                  <ul className="mt-2 space-y-0.5 rounded-lg border border-warning-soft bg-warning-soft/40 px-3 py-2">
                    {lead.vet.reasons.map((r) => (
                      <li key={r} className="text-xs font-medium text-warning">{r}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-faint">
          Counterparty records come from the demo FMCSA registry (
          {leads[0]?.vet.sourceLabel ?? 'live FMCSA lookup needed before you trust a payer'}
          ). Real-time FMCSA lookups and packet delivery are future seams, not live today.
        </p>
      </SectionCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
            <ShieldIcon width={16} height={16} /> Carrier packet
          </h2>
          <PacketComposer entries={packetEntries} receipts={receipts} />

          <h2 className="mt-8 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
            <ContractIcon width={16} height={16} /> Rate confirmations
          </h2>
          <RateContractsSection contracts={rateContracts} />
        </div>

        <div className="space-y-6">
          <SectionCard title="Signed relationships">
            {signed.length === 0 ? (
              <p className="text-sm text-muted">No signed contracts yet.</p>
            ) : (
              <ul className="space-y-3">
                {signed.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-ink">{lead.company}</div>
                      <div className="text-xs text-faint">{lead.kind === 'broker' ? 'Broker' : 'Shipper'} · signed deal on file</div>
                    </div>
                    <Link href="#signed" className="text-xs font-bold text-accent hover:underline">View →</Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

Run (from `web/`): `npm run lint`
Expected: no new errors in these files.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/portal/contracts/page.tsx web/src/app/portal/contracts/packet.tsx web/src/app/portal/contracts/rate-contracts.tsx
git commit -m "feat(web): contracts page with packet composer and rate-confirm signing"
```

---

### Task 8: Nav wiring

**Files:**
- Modify: `web/src/app/portal/layout.tsx`

- [ ] **Step 1: Add nav entries**

In `web/src/app/portal/layout.tsx`:

1. Add to the icon import from `@/components/icons` (currently imports Bell, Chat, Clipboard,
   Doc, Health, Money, Route, Truck, Users): add `ContractIcon` and `ShieldIcon`.
2. Insert two entries into `BASE_NAV` after the `Paperwork desk` row:

```tsx
  { href: '/portal/paperwork', label: 'Paperwork desk', icon: ClipboardIcon },
  { href: '/portal/contracts', label: 'Contracts', icon: ContractIcon },
  { href: '/portal/compliance', label: 'Compliance', icon: ShieldIcon },
  { href: '/portal/documents', label: 'Documents', icon: DocIcon },
```

- [ ] **Step 2: Typecheck + lint**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

Run (from `web/`): `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/portal/layout.tsx
git commit -m "feat(web): add Contracts and Compliance to the portal nav"
```

---

### Task 9: Full verification

- [ ] **Step 1: Unit tests**

Run (from `web/`): `npx vitest run`
Expected: existing suite + the new `perspective`, `compliance`, and `contracts` suites all PASS.

- [ ] **Step 2: Typecheck**

Run (from `web/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run (from `web/`): `npm run lint`
Expected: clean (no new errors in changed files).

- [ ] **Step 4: Production build**

Run (from `web/`): `npm run build`
Expected: build succeeds. Watch the App Router output for the three new routes
(`/portal/compliance`, `/portal/contracts`) being prerendered/compiled.

- [ ] **Step 5: Manual smoke (dev server)**

Run (from `web/`): `npm run dev`, open `http://localhost:3000/portal/compliance` and
`http://localhost:3000/portal/contracts`. Verify:
1. Compliance shows the attention banner, COI due-in-14-days and inspection due-in-8-days
   rows, and the docs-on-file shelf with four files.
2. Contracts shows five open leads (one `Port Logistics` vetting warning block with
   reasons), the packet composer defaulted to `Midlands Produce` with the missing
   additional-insured callout, and Haley Logistics switchable + sendable. After send,
   Haley flips to "Packet sent" and shows the demo-outbox note.
3. The `RC-2026-0417` card "Send for signature" → becomes "Sent for signature" →
   "Mark signed" → moves to the Signed shelf.
4. Switching the operating profile (portal setup) to `company` shows both modules'
   gated empty states instead of fabricated content.
