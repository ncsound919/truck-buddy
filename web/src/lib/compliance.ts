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
