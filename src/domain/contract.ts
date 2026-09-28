/**
 * Contract-based compliance — final-mile retail delivery work for major
 * companies (Ashley Furniture, Lowe's, HHGregg, …).
 *
 * Kept in sync with the web portal's vocabulary:
 *   web/src/lib/compliance.ts  → ComplianceItem / dossier derivation
 *   web/src/lib/domain.ts      → ComplianceDossier / Contract types
 *
 * Two layers, and the point is where they meet:
 *   1. ComplianceDossier — the driver/carrier's own credentials & insurance
 *      (their "file"): authority, COIs, cargo, workers' comp, medical card,
 *      MVR, background, drug consortium, ELD.
 *   2. DeliveryContract — what a major-company shipper/broker requires ON TOP
 *      of FMCSA, with the contract's own bars (e.g. "Auto liability ≥ $1M CSL",
 *      "named additional insured", "First Advantage background badge").
 *
 * `buildContractCompliance()` crosses the two into the gate the cab checks
 * before the driver rolls: can we legally run this contract today?
 *
 * Requirements researched live (public sources, 2026): Ashley Distribution
 * Services SAFER/USDOT filing; Lowe's PROvider background/badge program and
 * published COI requirements; retail appliance/furniture delivery insurance
 * standards; white-glove service-level norms.
 */

/* ----------------------------- dossier types ----------------------------- */

export type ComplianceCategory = 'credential' | 'filing' | 'program';
export type ComplianceStatus = 'active' | 'due_soon' | 'overdue' | 'info_needed';
export type DossierVerdict = 'legal' | 'attention' | 'at_risk';
export type PacketItemKey = 'coc' | 'authority' | 'w9' | 'rate_agreement' | 'additional_insured';

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

/* ---------------------------- contract types ----------------------------- */

export type ContractParty = 'shipper' | 'broker' | '3pl';
export type RetailProgram = 'furniture' | 'appliance' | 'home_improvement' | 'electronics';

/** A requirement a major-company contract places on the driver's file. */
export interface ContractRequirement {
  /** References a ComplianceItem.id in the driver's dossier. */
  itemId: string;
  /** The contract's bar, e.g. "Auto liability ≥ $1M CSL". */
  spec: string;
  required: boolean;
}

/** An on-site step the contract's service standard requires per delivery. */
export interface ServiceStep {
  id: string;
  label: string;
}

export interface DeliveryContract {
  id: string;
  counterparty: string;
  party: ContractParty;
  program: RetailProgram;
  lane?: string;
  dot?: string;
  /** Dossier items this contract gates on. */
  requirements: ContractRequirement[];
  /** Whether the contract demands a COI naming them additional insured. */
  requiresAdditionalInsured: boolean;
  /** White-glove / service steps required per stop. */
  serviceSteps: ServiceStep[];
  status: 'active' | 'pending';
}

/** Derived: a requirement + its live status against the dossier. */
export interface ContractRequirementStatus extends ContractRequirement {
  title: string;
  status: ComplianceStatus;
  daysUntilDue?: number;
  docOnFile: boolean;
  /** True when this requirement blocks the contract. */
  blocking: boolean;
}

export interface ContractCompliance {
  contract: DeliveryContract;
  requirements: ContractRequirementStatus[];
  verdict: DossierVerdict;
  /** False when any required item is overdue or missing. */
  canRun: boolean;
  blockers: string[];
}

/* ------------------------------- helpers --------------------------------- */

/** ISO date `n` days from today at UTC midnight — keeps the demo evergreen. */
export function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

/** Derive a compliance status from due date + proof. Pure — mirrors the web. */
export function deriveStatus(dueInDays: number | undefined, docOnFile: boolean): ComplianceStatus {
  if (dueInDays === undefined) return docOnFile ? 'active' : 'info_needed';
  return dueInDays <= 0 ? 'overdue' : dueInDays <= 30 ? 'due_soon' : 'active';
}

/** Overall dossier verdict. Pure — mirrors the web. */
export function dossierVerdict(items: ComplianceItem[]): DossierVerdict {
  if (items.some((i) => i.status === 'overdue')) return 'at_risk';
  if (items.some((i) => i.status === 'due_soon' || i.status === 'info_needed')) return 'attention';
  return 'legal';
}

/**
 * Crosses a contract's requirements against the driver's dossier.
 * A required item that is overdue or missing blocks the contract.
 */
export function buildContractCompliance(
  contract: DeliveryContract,
  dossier: ComplianceDossier,
): ContractCompliance {
  const byId = new Map(dossier.items.map((i) => [i.id, i]));
  const requirements: ContractRequirementStatus[] = contract.requirements.map((r) => {
    const item = byId.get(r.itemId);
    const status: ComplianceStatus = item?.status ?? 'info_needed';
    const blocking = r.required && (status === 'overdue' || status === 'info_needed');
    return {
      ...r,
      title: item?.title ?? r.itemId,
      status,
      daysUntilDue: item?.daysUntilDue,
      docOnFile: item?.docOnFile ?? false,
      blocking,
    };
  });
  const blockers = requirements
    .filter((r) => r.blocking)
    .map((r) => `${r.title} — ${r.spec}`);
  const verdict: DossierVerdict = blockers.length
    ? 'at_risk'
    : requirements.some((r) => r.status === 'due_soon')
      ? 'attention'
      : 'legal';
  return { contract, requirements, verdict, canRun: blockers.length === 0, blockers };
}

/* -------------------------------- seeds ---------------------------------- */

export interface DossierSeed {
  id: string;
  category: ComplianceCategory;
  title: string;
  issuer: string;
  frequency: string;
  /** Days until the due date. Absent = standing item that never expires. */
  dueInDays?: number;
  docOnFile: boolean;
  nextAction: string;
}

/**
 * The driver/carrier's own file. Values reflect what retail final-mile
 * contracts actually ask for (COI limits, cargo, WC, DOT physical, MVR,
 * background, drug consortium, ELD).
 */
const DOSSIER_SEEDS: DossierSeed[] = [
  { id: 'authority', category: 'credential', title: 'Operating authority (MC/DOT)', issuer: 'FMCSA', frequency: 'Biennial update', dueInDays: 380, docOnFile: true, nextAction: 'File the biennial update before the window opens.' },
  { id: 'liability_auto', category: 'credential', title: 'Commercial auto liability ≥ $1M CSL', issuer: 'Your insurer', frequency: 'Annual renewal', dueInDays: 14, docOnFile: true, nextAction: 'Renew the policy and file the new COI with the retailer.' },
  { id: 'gen_liability', category: 'credential', title: 'General liability ≥ $1M / $2M agg', issuer: 'Your insurer', frequency: 'Annual renewal', dueInDays: 200, docOnFile: true, nextAction: 'Confirm the GL limits meet each contract minimum.' },
  { id: 'cargo', category: 'credential', title: 'Motor truck cargo ≥ $100K', issuer: 'Your insurer', frequency: 'Annual renewal', dueInDays: 180, docOnFile: true, nextAction: 'Match cargo limit to the highest-value goods hauled.' },
  { id: 'workers_comp', category: 'credential', title: "Workers' compensation (statutory)", issuer: 'Your insurer / state', frequency: 'Annual renewal', dueInDays: 240, docOnFile: true, nextAction: 'Keep proof of WC on file; most retailers require it.' },
  { id: 'add_insured', category: 'credential', title: 'Additional-insured endorsement', issuer: 'Your insurer', frequency: 'Per contract', dueInDays: -4, docOnFile: true, nextAction: 'COI lapsed — file a new certificate naming the retailer additional insured.' },
  { id: 'dot_insp', category: 'credential', title: 'Annual DOT inspection', issuer: 'FMCSA / state', frequency: 'Every 12 months', dueInDays: 8, docOnFile: true, nextAction: 'Schedule the annual inspection and keep the report on file.' },
  { id: 'cdl', category: 'credential', title: "Valid CDL / driver's license", issuer: 'State DMV', frequency: 'Per expiry', dueInDays: 500, docOnFile: true, nextAction: 'Renew the license before it lapses.' },
  { id: 'med_card', category: 'credential', title: "DOT medical examiner's certificate", issuer: 'Certified examiner', frequency: 'Up to 24 months', dueInDays: 22, docOnFile: true, nextAction: 'Book the DOT physical and file the new card.' },
  { id: 'mvr', category: 'credential', title: 'MVR review (driving record)', issuer: 'State DMV', frequency: 'Annual review', dueInDays: 45, docOnFile: true, nextAction: 'Pull and review the MVR; keep it clean.' },
  { id: 'background', category: 'program', title: 'Criminal background check', issuer: 'Retailer (e.g. First Advantage)', frequency: 'Per retailer · bi-annual', dueInDays: 300, docOnFile: true, nextAction: 'Re-run the background check before it expires.' },
  { id: 'drug_consortium', category: 'program', title: 'DOT drug & alcohol consortium', issuer: 'Consortium / Clearinghouse', frequency: 'Standing', docOnFile: true, nextAction: 'Keep consortium enrollment and random-test pool current.' },
  { id: 'eld', category: 'program', title: 'ELD / HOS provider + GPS', issuer: 'FMCSA-registered', frequency: 'Standing', docOnFile: true, nextAction: 'None — keep ELD registration and tracking current.' },
  { id: 'safety_rating', category: 'program', title: 'FMCSA safety rating / CSA', issuer: 'FMCSA', frequency: 'Continuous', docOnFile: true, nextAction: 'Watch CSA BASICs stay under the intervention thresholds.' },
  { id: 'w9', category: 'filing', title: 'W-9', issuer: 'IRS', frequency: 'Standing', docOnFile: true, nextAction: 'Keep a current W-9 on file for settlements.' },
  { id: 'ifta', category: 'filing', title: 'IFTA quarterly fuel tax', issuer: 'State / FMCSA', frequency: 'Quarterly return', dueInDays: 57, docOnFile: true, nextAction: 'File the quarterly IFTA return.' },
  { id: 'ucr', category: 'filing', title: 'Unified Carrier Registration (UCR)', issuer: 'UCR · your state', frequency: 'Annual', dueInDays: 45, docOnFile: true, nextAction: 'Renew your UCR registration.' },
  { id: 'hvut', category: 'filing', title: 'HVUT Form 2290', issuer: 'IRS', frequency: 'Annual · due ~August', dueInDays: 350, docOnFile: true, nextAction: 'Pay and file the next Form 2290.' },
  { id: 'boc3', category: 'program', title: 'BOC-3 process agent', issuer: 'FMCSA', frequency: 'Standing', docOnFile: true, nextAction: "None — keep your agent's contact current." },
];

/** Deterministic driver dossier for the demo (relative to today). */
export function buildDossier(): ComplianceDossier {
  const items: ComplianceItem[] = DOSSIER_SEEDS.map((s) => ({
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

/* ----- white-glove service steps (the on-site standard these retailers set) ----- */

const SERVICE_BASE: ServiceStep[] = [
  { id: 'appt', label: 'Appointment window confirmed with customer' },
  { id: 'precall', label: '24-hour pre-arrival confirmation' },
  { id: 'callahead', label: 'Day-of call-ahead (30 min out)' },
  { id: 'crew', label: 'Two-person crew on site' },
  { id: 'protect', label: 'Floor & wall protection placed' },
  { id: 'place', label: 'Room-of-choice placement' },
  { id: 'assemble', label: 'Assembly / setup complete' },
  { id: 'debris', label: 'Packaging debris removed' },
  { id: 'inspect', label: 'Damage inspection with customer' },
  { id: 'pod', label: 'Customer signature captured (POD)' },
  { id: 'photo', label: 'Timestamped delivery photos' },
];

/** The three seeded major-company contracts (public requirements, 2026). */
export const DELIVERY_CONTRACTS: DeliveryContract[] = [
  {
    id: 'contract_ashley',
    counterparty: 'Ashley Furniture',
    party: 'shipper',
    program: 'furniture',
    lane: 'Southeast · home delivery',
    dot: 'DOT 546240 · MC-270480',
    requiresAdditionalInsured: true,
    status: 'active',
    requirements: [
      { itemId: 'cdl', spec: "Valid license · 1 yr experience · 21+", required: true },
      { itemId: 'med_card', spec: 'Current DOT physical', required: true },
      { itemId: 'drug_consortium', spec: 'DOT drug & alcohol screen', required: true },
      { itemId: 'background', spec: 'Pass background check', required: true },
      { itemId: 'mvr', spec: 'Clean driving record (3 yr)', required: true },
      { itemId: 'liability_auto', spec: 'Auto liability ≥ $1M CSL', required: true },
      { itemId: 'gen_liability', spec: 'General liability ≥ $1M', required: true },
      { itemId: 'cargo', spec: 'Cargo ≥ $100K', required: true },
      { itemId: 'workers_comp', spec: "Workers' comp on file", required: true },
      { itemId: 'add_insured', spec: 'Named additional insured', required: true },
    ],
    serviceSteps: [
      ...SERVICE_BASE,
      { id: 'haul_away', label: 'Old furniture hauled away' },
    ],
  },
  {
    id: 'contract_lowes',
    counterparty: "Lowe's",
    party: 'shipper',
    program: 'home_improvement',
    lane: 'Southeast · appliance & building materials',
    dot: 'Lowe\'s Companies, Inc. · Mooresville, NC',
    requiresAdditionalInsured: true,
    status: 'active',
    requirements: [
      { itemId: 'background', spec: 'First Advantage background + badge', required: true },
      { itemId: 'mvr', spec: 'Clean MVR', required: true },
      { itemId: 'drug_consortium', spec: 'DOT drug & alcohol screen', required: true },
      { itemId: 'liability_auto', spec: 'Auto liability ≥ $1M BI/PD CSL', required: true },
      { itemId: 'gen_liability', spec: 'GL primary & non-contributory ≥ $1M', required: true },
      { itemId: 'cargo', spec: 'Cargo ≥ $100K', required: true },
      { itemId: 'workers_comp', spec: "Workers' comp (statutory)", required: true },
      { itemId: 'add_insured', spec: 'AI, ongoing + completed ops, waiver of subrogation (CG 20 15/26)', required: true },
      { itemId: 'eld', spec: 'ELD + real-time GPS / TMS', required: true },
    ],
    serviceSteps: [
      ...SERVICE_BASE,
      { id: 'install', label: 'Appliance hookup + function check' },
      { id: 'haul_away', label: 'Old appliance hauled away / recycled' },
    ],
  },
  {
    id: 'contract_hhgregg',
    counterparty: 'HHGregg',
    party: 'shipper',
    program: 'electronics',
    lane: 'Midwest · appliance & electronics',
    requiresAdditionalInsured: true,
    status: 'pending',
    requirements: [
      { itemId: 'background', spec: 'Pass background check', required: true },
      { itemId: 'mvr', spec: 'Clean driving record', required: true },
      { itemId: 'liability_auto', spec: 'Auto liability ≥ $1M CSL', required: true },
      { itemId: 'gen_liability', spec: 'General liability ≥ $1M', required: true },
      { itemId: 'cargo', spec: 'Cargo ≥ $100K', required: true },
      { itemId: 'workers_comp', spec: "Workers' comp on file", required: true },
      { itemId: 'add_insured', spec: 'Named additional insured', required: true },
    ],
    serviceSteps: [
      ...SERVICE_BASE,
      { id: 'install', label: 'Appliance install + function check' },
      { id: 'demo', label: 'Customer walkthrough / demo' },
      { id: 'haul_away', label: 'Old unit hauled away' },
    ],
  },
];

/** Which contract the demo driver is currently running under. */
export const DEMO_ACTIVE_CONTRACT_ID = 'contract_ashley';

export const PROGRAM_LABEL: Record<RetailProgram, string> = {
  furniture: 'Furniture · white-glove',
  appliance: 'Appliance · install',
  home_improvement: 'Home improvement',
  electronics: 'Electronics · install',
};

export const STATUS_LABEL: Record<ComplianceStatus, string> = {
  active: 'On file',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  info_needed: 'Missing',
};

export const VERDICT_LABEL: Record<DossierVerdict, string> = {
  legal: 'Compliant',
  attention: 'Attention',
  at_risk: 'At risk',
};
