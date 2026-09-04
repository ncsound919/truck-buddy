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
import { buildLeadSeeds, packetDraft, seedRateContracts } from '@/lib/contracts';
import { contractSendSeam } from '@/lib/contract-send';

/**
 * Deterministic demo fixtures + in-memory mock data seam. Swap the seam for an
 * HTTP implementation later; the UI only depends on the `DataSeam` interface.
 */

const DRIVER: DriverProfile = {
  name: 'Terrence Brooks',
  tier: 'pro',
  truck: { plate: 'NC-7A2K19', make: 'Freightliner', model: 'Cascadia', year: 2023 },
  mc: 'MC-482119',
};

const OPEN_LOADS: Load[] = [
  {
    id: 'load_882114',
    ref: 'BOL-882114',
    origin: 'Charlotte, NC',
    destination: 'Raleigh, NC',
    distanceMi: 165,
    weightLb: 18750,
    equipment: 'Dry Van 53ft',
    payout: 980,
    pickupAt: 'Tomorrow 07:00',
    deliverBy: 'Tomorrow 14:00',
    status: 'open',
    shipper: 'Raleigh Freight Co.',
    postedBy: 'Raleigh Freight Co.',
    source: 'Raleigh Freight Board',
  },
  {
    id: 'load_882431',
    ref: 'BOL-882431',
    origin: 'Greensboro, NC',
    destination: 'Richmond, VA',
    distanceMi: 240,
    weightLb: 31000,
    equipment: 'Refrigerated 53ft',
    payout: 1480,
    pickupAt: 'Fri 06:30',
    deliverBy: 'Fri 16:00',
    status: 'open',
    shipper: 'Piedmont Cold',
    postedBy: 'Haley Logistics',
    source: 'Haley Logistics Board',
  },
  {
    id: 'load_882703',
    ref: 'BOL-882703',
    origin: 'Atlanta, GA',
    destination: 'Knoxville, TN',
    distanceMi: 210,
    weightLb: 22500,
    equipment: 'Flatbed',
    payout: 1190,
    pickupAt: 'Sat 08:00',
    deliverBy: 'Sat 18:00',
    status: 'open',
    shipper: 'Peach Steel',
    postedBy: 'Carolina Carrier Co-op',
    source: 'Carolina Co-op Board',
  },
  {
    id: 'load_882941',
    ref: 'BOL-882941',
    origin: 'Columbia, SC',
    destination: 'Norfolk, VA',
    distanceMi: 390,
    weightLb: 26500,
    equipment: 'Dry Van 53ft',
    payout: 2210,
    pickupAt: 'Today 16:00',
    deliverBy: 'Tomorrow 11:00',
    status: 'open',
    shipper: 'Midlands Produce',
    postedBy: 'Haley Logistics',
    source: 'Haley Logistics Board',
  },
  {
    id: 'load_883052',
    ref: 'BOL-883052',
    origin: 'Charleston, SC',
    destination: 'Baltimore, MD',
    distanceMi: 520,
    weightLb: 41200,
    equipment: 'Refrigerated 53ft',
    payout: 3180,
    pickupAt: 'Sat 05:00',
    deliverBy: 'Sat 22:00',
    status: 'open',
    shipper: 'Harbor Cold',
    postedBy: 'Raleigh Freight Co.',
    source: 'Raleigh Freight Board',
  },
  {
    id: 'load_883117',
    ref: 'BOL-883117',
    origin: 'Wilmington, NC',
    destination: 'Greenville, SC',
    distanceMi: 245,
    weightLb: 12000,
    equipment: 'Dry Van 53ft',
    payout: 1050,
    pickupAt: 'Sun 09:00',
    deliverBy: 'Sun 20:00',
    status: 'open',
    shipper: 'Port Logistics',
    postedBy: 'Carolina Carrier Co-op',
    source: 'Carolina Co-op Board',
  },
  {
    id: 'load_883230',
    ref: 'BOL-883230',
    origin: 'Raleigh, NC',
    destination: 'Durham, NC',
    distanceMi: 26,
    weightLb: 3200,
    equipment: 'Box Truck 26ft',
    payout: 180,
    pickupAt: 'Today 11:00',
    deliverBy: 'Today 15:00',
    status: 'open',
    shipper: 'Triangle Furniture',
    postedBy: 'Haley Logistics',
    source: 'Haley Logistics Board',
  },
  {
    id: 'load_883411',
    ref: 'BOL-883411',
    origin: 'Greensboro, NC',
    destination: 'Winston-Salem, NC',
    distanceMi: 34,
    weightLb: 4100,
    equipment: 'Box Truck 26ft',
    payout: 210,
    pickupAt: 'Tomorrow 08:00',
    deliverBy: 'Tomorrow 13:00',
    status: 'open',
    shipper: 'Triad Wholesale',
    postedBy: 'Raleigh Freight Co.',
    source: 'Raleigh Freight Board',
  },
];

/** Partner boards we aggregate from (mock). Real adapters plug into the seam. */
const BOARD_SOURCES = [
  { id: 'haley', name: 'Haley Logistics Board' },
  { id: 'raleigh', name: 'Raleigh Freight Board' },
  { id: 'carolina', name: 'Carolina Co-op Board' },
];

/** Approx origin/destination coords per load so distance is computed, not canned. */
const LANE_GEO: Record<string, { o: { lat: number; lng: number }; d: { lat: number; lng: number } }> = {
  'BOL-882114': { o: { lat: 35.227, lng: -80.843 }, d: { lat: 35.78, lng: -78.639 } }, // Charlotte->Raleigh
  'BOL-882431': { o: { lat: 36.073, lng: -79.792 }, d: { lat: 37.541, lng: -77.436 } }, // Greensboro->Richmond
  'BOL-882703': { o: { lat: 33.749, lng: -84.388 }, d: { lat: 35.961, lng: -83.921 } }, // Atlanta->Knoxville
  'BOL-882941': { o: { lat: 34.0, lng: -81.035 }, d: { lat: 36.851, lng: -76.285 } }, // Columbia->Norfolk
  'BOL-883052': { o: { lat: 32.776, lng: -79.931 }, d: { lat: 39.29, lng: -76.612 } }, // Charleston->Baltimore
  'BOL-883117': { o: { lat: 34.226, lng: -77.945 }, d: { lat: 34.853, lng: -82.394 } }, // Wilmington->Greenville
  'BOL-883230': { o: { lat: 35.78, lng: -78.639 }, d: { lat: 35.994, lng: -78.899 } }, // Raleigh->Durham
  'BOL-883411': { o: { lat: 36.073, lng: -79.792 }, d: { lat: 36.0999, lng: -80.2442 } }, // Greensboro->Winston-Salem
};

for (const l of OPEN_LOADS) {
  const g = LANE_GEO[l.ref];
  if (g) {
    l.originCoords = g.o;
    l.destCoords = g.d;
  }
}

/** Assign each load an equipment type id (drives matching against the profile). */
const LOAD_EQUIPMENT: Record<string, EquipmentId> = {
  'BOL-882114': 'dry_van',
  'BOL-882431': 'reefer',
  'BOL-882703': 'flatbed',
  'BOL-882941': 'dry_van',
  'BOL-883052': 'reefer',
  'BOL-883117': 'dry_van',
  'BOL-883230': 'box_truck',
  'BOL-883411': 'box_truck',
  'BOL-881220': 'dry_van',
};
for (const l of OPEN_LOADS) {
  l.equipmentType = LOAD_EQUIPMENT[l.ref] ?? 'dry_van';
}

/** Default operating profile — a new driver starts unset. */
const PROFILE: OperatingProfile = {
  role: 'independent',
  equipment: 'dry_van',
  authority: 'own',
  set: true,
};

/* ------------------------- Enterprise accounts (mock) ------------------------- */
const CURRENT_USER = 'driver_terrence';
const JOINED = '2026-01-12T00:00:00Z';

const ORGS: Organization[] = [
  { id: 'org_brooks', name: 'Brooks Logistics LLC', kind: 'independent', tier: 'pro', activeSeats: 1, seatLimit: 1 },
  { id: 'org_haley', name: 'Haley Logistics', kind: 'carrier', tier: 'enterprise', activeSeats: 3, seatLimit: 40 },
  { id: 'org_acme', name: 'ACME Distribution', kind: 'shipper', tier: 'enterprise', activeSeats: 2, seatLimit: 25 },
];

const MEMBERS: Record<string, OrgMember[]> = {
  org_brooks: [
    { userId: CURRENT_USER, name: 'Terrence Brooks', email: 'terrence@brooksllc.app', role: 'owner', equipment: 'dry_van', joinedAt: JOINED },
  ],
  org_haley: [
    { userId: CURRENT_USER, name: 'Terrence Brooks', email: 'terrence@haleylogistics.app', role: 'driver', equipment: 'dry_van', joinedAt: JOINED },
    { userId: 'u_maya', name: 'Maya Reyes', email: 'maya@haleylogistics.app', role: 'dispatcher', equipment: 'dry_van', joinedAt: '2025-08-03T00:00:00Z' },
    { userId: 'u_dana', name: 'Dana Cole', email: 'dana@haleylogistics.app', role: 'accountant', equipment: 'dry_van', joinedAt: '2025-06-20T00:00:00Z' },
  ],
  org_acme: [
    { userId: CURRENT_USER, name: 'Terrence Brooks', email: 'terrence@acme.co', role: 'admin', equipment: 'dry_van', joinedAt: '2026-02-01T00:00:00Z' },
    { userId: 'u_pat', name: 'Pat Nguyen', email: 'pat@acme.co', role: 'dispatcher', equipment: 'dry_van', joinedAt: '2025-11-10T00:00:00Z' },
  ],
};

let ACTIVE_ORG_ID = 'org_brooks';

function orgById(id: string): Organization | undefined {
  return ORGS.find((o) => o.id === id);
}
function currentMember(orgId: string): OrgMember | undefined {
  return MEMBERS[orgId]?.find((m) => m.userId === CURRENT_USER);
}

const TODAY_LOAD: Load = {
  id: 'load_881220',
  ref: 'BOL-881220',
  origin: 'Raleigh, NC',
  destination: 'ACME Distribution, Charlotte, NC',
  distanceMi: 112,
  weightLb: 18750,
  equipment: 'Dry Van 53ft',
  equipmentType: 'dry_van',
  payout: 760,
  pickupAt: 'Today 06:40',
  deliverBy: 'Today 12:30',
  status: 'in_progress',
  shipper: 'Raleigh Freight Co.',
  postedBy: 'Raleigh Freight Co.',
  source: 'Raleigh Freight Board',
  acceptedAt: '2026-09-04T05:20:00Z',
};

/**
 * Role- and equipment-specific workloads. Replaces the single "one demo driver"
 * active load: a box-truck independent does NOT run a Class-8 dry-van load.
 */
interface Seed {
  ref: string;
  origin: string;
  destination: string;
  distanceMi: number;
  weightLb: number;
  equipment: string;
  equipmentType: EquipmentId;
  payout: number;
  pickupAt: string;
  deliverBy: string;
  o: [number, number];
  d: [number, number];
  shipper: string;
  source: string;
}

const ACTIVE_SEED: Record<EquipmentId, Seed> = {
  dry_van: {
    ref: 'BOL-881220',
    origin: 'Raleigh, NC',
    destination: 'ACME Distribution, Charlotte, NC',
    distanceMi: 112,
    weightLb: 18750,
    equipment: 'Dry Van 53ft',
    equipmentType: 'dry_van',
    payout: 760,
    pickupAt: 'Today 06:40',
    deliverBy: 'Today 12:30',
    o: [35.78, -78.639],
    d: [35.227, -80.843],
    shipper: 'Raleigh Freight Co.',
    source: 'Raleigh Freight Board',
  },
  box_truck: {
    ref: 'BOL-BX2031',
    origin: 'Raleigh, NC',
    destination: 'Cary, NC',
    distanceMi: 16,
    weightLb: 2800,
    equipment: 'Box Truck 26ft',
    equipmentType: 'box_truck',
    payout: 130,
    pickupAt: 'Today 09:00',
    deliverBy: 'Today 13:00',
    o: [35.78, -78.639],
    d: [35.791, -78.781],
    shipper: 'Triangle Furniture',
    source: 'Haley Logistics Board',
  },
  hotshot: {
    ref: 'BOL-HS118',
    origin: 'Charlotte, NC',
    destination: 'Columbia, SC',
    distanceMi: 100,
    weightLb: 9000,
    equipment: 'Hotshot / Flatbed',
    equipmentType: 'hotshot',
    payout: 720,
    pickupAt: 'Today 10:00',
    deliverBy: 'Today 16:00',
    o: [35.227, -80.843],
    d: [34.0, -81.035],
    shipper: 'Midlands Produce',
    source: 'Haley Logistics Board',
  },
  reefer: {
    ref: 'BOL-8R110',
    origin: 'Greensboro, NC',
    destination: 'Columbia, SC',
    distanceMi: 190,
    weightLb: 29500,
    equipment: 'Refrigerated 53ft',
    equipmentType: 'reefer',
    payout: 1180,
    pickupAt: 'Today 07:00',
    deliverBy: 'Today 16:00',
    o: [36.073, -79.792],
    d: [34.0, -81.035],
    shipper: 'Piedmont Cold',
    source: 'Haley Logistics Board',
  },
  flatbed: {
    ref: 'BOL-8F305',
    origin: 'Charlotte, NC',
    destination: 'Wilmington, NC',
    distanceMi: 200,
    weightLb: 24000,
    equipment: 'Flatbed',
    equipmentType: 'flatbed',
    payout: 1250,
    pickupAt: 'Today 08:00',
    deliverBy: 'Today 18:00',
    o: [35.227, -80.843],
    d: [34.226, -77.945],
    shipper: 'Peach Steel',
    source: 'Carolina Co-op Board',
  },
  tanker: {
    ref: 'BOL-TK77',
    origin: 'Greensboro, NC',
    destination: 'Charlotte, NC',
    distanceMi: 90,
    weightLb: 40000,
    equipment: 'Tanker',
    equipmentType: 'tanker',
    payout: 820,
    pickupAt: 'Today 12:00',
    deliverBy: 'Today 17:00',
    o: [36.073, -79.792],
    d: [35.227, -80.843],
    shipper: 'Piedmont Fuel',
    source: 'Raleigh Freight Board',
  },
};

/** Build a Load from a seed, in the right role/source context. */
function makeFromSeed(seed: Seed, p: OperatingProfile): Load {
  const company = p.role === 'company';
  return {
    id: `load_${seed.ref.toLowerCase()}`,
    ref: seed.ref,
    origin: seed.origin,
    destination: seed.destination,
    distanceMi: seed.distanceMi,
    weightLb: seed.weightLb,
    equipment: seed.equipment,
    equipmentType: seed.equipmentType,
    payout: seed.payout,
    pickupAt: seed.pickupAt,
    deliverBy: seed.deliverBy,
    status: 'in_progress',
    shipper: seed.shipper,
    postedBy: company ? 'Your carrier' : seed.shipper,
    source: company ? 'Assigned · Dispatch' : seed.source,
    originCoords: { lat: seed.o[0], lng: seed.o[1] },
    destCoords: { lat: seed.d[0], lng: seed.d[1] },
    acceptedAt: company ? undefined : new Date().toISOString(),
  };
}

/** Today's active workload for a driver's operating profile. */
function defaultWorkload(p: OperatingProfile): Load[] {
  const seed = ACTIVE_SEED[p.equipment];
  const active = seed ? makeFromSeed(seed, p) : clone(TODAY_LOAD);
  if (p.role === 'company') {
    // Company drivers get one assigned run from dispatch (no board acceptance).
    return [active];
  }
  // Independents: today's haul (accepted from the board) — the open board adds
  // more they can take next, handled in getLoads below.
  return [active];
}

const DOCUMENTS: TruckDoc[] = [
  {
    id: 'doc_1',
    kind: 'BOL',
    loadRef: 'BOL-881220',
    bolNumber: 'BOL-881220',
    shipper: 'Raleigh Freight Co.',
    consignee: 'ACME Distribution Center',
    weightLb: 18750,
    amount: 760,
    status: 'verified',
    createdAt: '2026-09-04T06:41:00Z',
    fileName: 'bol-881220.jpg',
  },
  {
    id: 'doc_2',
    kind: 'DeliveryReceipt',
    loadRef: 'BOL-881220',
    bolNumber: 'BOL-881220',
    shipper: 'Raleigh Freight Co.',
    consignee: 'ACME Distribution Center',
    weightLb: 18750,
    amount: 0,
    status: 'pending',
    createdAt: '',
  },
  {
    id: 'doc_3',
    kind: 'Invoice',
    loadRef: 'BOL-882114',
    bolNumber: 'BOL-882114',
    shipper: 'Raleigh Freight Co.',
    consignee: 'Piedmont Cold',
    weightLb: 31000,
    amount: 1480,
    status: 'verified',
    createdAt: '2026-09-03T14:12:00Z',
    fileName: 'invoice-882114.pdf',
  },
];

const EARNINGS: Earnings = {
  weekGross: 6240,
  weekMiles: 3120,
  ratePerMile: 2.0,
  thisLoadPayout: 760,
};

const HEALTH: TruckHealth = {
  metrics: { coolantTempF: 192, batteryVoltage: 13.8, fuelPct: 76, rpm: 1420 },
  faultCodes: [],
  updatedAt: '2026-09-04T06:30:00Z',
};

const MESSAGES: DispatchMessage[] = [
  {
    id: 'msg_1',
    from: 'Dispatch · Raleigh',
    text: 'ACME has a 15-min window at the dock. Keep an eye on the clock.',
    at: '06:35',
    unread: true,
    sender: 'dispatch',
  },
  {
    id: 'msg_2',
    from: 'Haley Logistics',
    text: 'Route for Fri added — Richmond drop, check the load board.',
    at: 'Yesterday',
    unread: false,
    sender: 'dispatch',
  },
];

const VEHICLE: VehicleDetail = {
  plate: DRIVER.truck.plate,
  make: DRIVER.truck.make,
  model: DRIVER.truck.model,
  year: DRIVER.truck.year,
  vin: '3AKJHHDR8LSLA9381',
  odometerMi: 214300,
  nextServiceMi: 218000,
  health: HEALTH,
  faultHistory: [
    { id: 'f1', code: 'SPN 158', label: 'Battery voltage low (active)', at: '2026-09-04T06:30:00Z', cleared: false },
    { id: 'f2', code: 'SPN 3031', label: 'DPF soot load high (intermittent)', at: '2026-08-28T11:02:00Z', cleared: true },
  ],
  maintenance: [
    { item: 'Oil & filter change', dueAtMi: 218000, dueText: 'In 3,700 mi' },
    { item: 'Fuel filter replacement', dueAtMi: 219000, dueText: 'In 4,700 mi' },
    { item: 'DEF top-up check', dueAtMi: 216000, dueText: 'Done recently' },
  ],
  samples: [
    { at: '2026-08-05T06:00:00Z', coolantTempF: 190, batteryVoltage: 14.2, fuelPct: 88 },
    { at: '2026-08-12T06:00:00Z', coolantTempF: 191, batteryVoltage: 14.0, fuelPct: 84 },
    { at: '2026-08-19T06:00:00Z', coolantTempF: 190, batteryVoltage: 13.6, fuelPct: 80 },
    { at: '2026-08-26T06:00:00Z', coolantTempF: 191, batteryVoltage: 13.2, fuelPct: 78 },
    { at: '2026-09-04T06:00:00Z', coolantTempF: 192, batteryVoltage: 12.9, fuelPct: 76 },
  ],
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

class MockPortalApi implements DataSeam {
  private openLoads: Load[] = clone(OPEN_LOADS);

  async getToday(): Promise<PortalToday> {
    await delay(140);
    const profile = await this.getOperatingProfile();
    const work = defaultWorkload(profile);
    const load = work[0];
    return {
      load: load ? clone(load) : undefined,
      nextStopLabel: load ? `${load.destination} · ${load.equipment}` : '',
      driver: DRIVER,
      earnings: EARNINGS,
      health: HEALTH,
      documents: clone(DOCUMENTS),
      messages: clone(MESSAGES),
    };
  }

  async getLoads(): Promise<Load[]> {
    await delay(120);
    const profile = await this.getOperatingProfile();
    const base = defaultWorkload(profile).map(clone);
    if (profile.role === 'company') return base;
    // Independents also see loads they accepted from the open board.
    const accepted = this.openLoads.filter((l) => l.status === 'accepted').map(clone);
    return [...base, ...accepted];
  }

  async getOpenLoads(): Promise<Load[]> {
    await delay(120);
    return this.openLoads.filter((l) => l.status === 'open').map(clone);
  }

  async getBoardSources(): Promise<BoardSource[]> {
    await delay(80);
    return BOARD_SOURCES.map((s) => ({
      ...s,
      count: this.openLoads.filter((l) => l.source === s.name && l.status === 'open').length,
    }));
  }

  async getDocuments(): Promise<TruckDoc[]> {
    await delay(100);
    return clone(DOCUMENTS);
  }

  async acceptLoad(id: string): Promise<Load> {
    await delay(400);
    const load = this.openLoads.find((l) => l.id === id);
    if (!load) throw new Error('load_not_found');
    load.status = 'accepted';
    load.acceptedAt = new Date().toISOString();
    return clone(load);
  }

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

  async getVehicleDetail(): Promise<VehicleDetail> {
    await delay(120);
    return clone(VEHICLE);
  }

  async getMessages(): Promise<DispatchMessage[]> {
    await delay(100);
    return clone(MESSAGES);
  }

  async sendDispatchMessage(text: string): Promise<DispatchMessage> {
    await delay(300);
    const msg: DispatchMessage = {
      id: `msg_${Math.random().toString(36).slice(2, 8)}`,
      from: 'You',
      text,
      at: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      unread: false,
      sender: 'me',
    };
    MESSAGES.unshift(msg);
    return clone(msg);
  }

  async getOperatingProfile(): Promise<OperatingProfile> {
    await delay(80);
    return clone(PROFILE);
  }

  async setOperatingProfile(profile: OperatingProfile): Promise<OperatingProfile> {
    await delay(150);
    Object.assign(PROFILE, clone(profile), { set: true });
    return clone(PROFILE);
  }

  async getOrganizations(): Promise<Organization[]> {
    await delay(80);
    return ORGS.map((o) => ({ ...o, activeSeats: MEMBERS[o.id]?.length ?? o.activeSeats }));
  }

  async getMembership(): Promise<OrgMembership> {
    await delay(80);
    const org = orgById(ACTIVE_ORG_ID)!;
    const member = currentMember(org.id)!;
    return { org, member: clone(member) };
  }

  async switchOrganization(orgId: string): Promise<OrgMembership> {
    await delay(160);
    const org = orgById(orgId);
    const member = org ? currentMember(orgId) : undefined;
    if (!org || !member) throw new Error('org_membership_not_found');
    ACTIVE_ORG_ID = org.id;
    const { role, authority } = membershipPerspective(org.kind, member.role);
    Object.assign(PROFILE, { role, authority, equipment: member.equipment, set: true });
    return { org, member: clone(member) };
  }

  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    await delay(100);
    return (MEMBERS[orgId] ?? []).map(clone);
  }

  async inviteMember(input: {
    name: string;
    email: string;
    role: OrgRole;
    equipment: EquipmentId;
  }): Promise<OrgMember> {
    await delay(200);
    const org = orgById(ACTIVE_ORG_ID)!;
    if ((MEMBERS[org.id]?.length ?? 0) >= org.seatLimit) throw new Error('seat_limit_reached');
    const member: OrgMember = {
      userId: `u_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      email: input.email,
      role: input.role,
      equipment: input.equipment,
      joinedAt: new Date().toISOString(),
    };
    (MEMBERS[org.id] = MEMBERS[org.id] ?? []).push(member);
    return clone(member);
  }

  async setMemberRole(memberId: string, role: OrgRole): Promise<OrgMember[]> {
    await delay(140);
    const list = MEMBERS[ACTIVE_ORG_ID] ?? [];
    const idx = list.findIndex((m) => m.userId === memberId);
    if (idx === -1) throw new Error('member_not_found');
    // Owner cannot be demoted by anyone else, and cannot self-demote out.
    if (list[idx].role === 'owner' && (role !== 'owner' || memberId === CURRENT_USER)) {
      throw new Error('owner_immutable');
    }
    list[idx] = { ...list[idx], role };
    return list.map(clone);
  }

  async uploadDocument(kind: DocKind, loadRef: string): Promise<TruckDoc> {
    await delay(600);
    const doc: TruckDoc = {
      id: `doc_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      loadRef,
      bolNumber: loadRef,
      shipper: DRIVER.name,
      consignee: 'Pending',
      weightLb: 0,
      amount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      fileName: `${kind.toLowerCase()}-${loadRef.toLowerCase()}.jpg`,
    };
    DOCUMENTS.unshift(doc);
    return clone(doc);
  }
}

/** Single API seam for the whole portal — swap for HTTP later. */
export const portalApi: DataSeam = new MockPortalApi();
