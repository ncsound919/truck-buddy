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
