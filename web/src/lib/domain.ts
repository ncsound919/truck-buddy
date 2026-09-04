/**
 * Truck Buddy web portal — domain model + data-access seam.
 *
 * The web hub (desktop logistics work) and the driver app (on-road flow) will
 * eventually share one real backend. Until then this mirrors the app's own
 * mock-first approach (src/services/truck-buddy-api.ts) with deterministic
 * fixtures so every module is fully runnable offline.
 */

export type LoadStatus = 'open' | 'accepted' | 'in_progress' | 'delivered';

export interface Load {
  id: string;
  ref: string;
  origin: string;
  destination: string;
  distanceMi: number;
  weightLb: number;
  equipment: string;
  /** Optional until a loader tags it; matching falls back to `equipment`. */
  equipmentType?: LoadEquipment;
  payout: number;
  pickupAt: string;
  deliverBy: string;
  status: LoadStatus;
  shipper: string;
  postedBy: string;
  /** Board/source this load was aggregated from (e.g. a partner board name). */
  source: string;
  /** Optional coordinates so distance can be computed from real geodesic math. */
  originCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
  /** Set server-side the moment the driver accepts — the audit trail anchor. */
  acceptedAt?: string;
}

/** Free FMCSA-style carrier vetting shown before/at acceptance. */
export type VettingStatus = 'verified' | 'warning' | 'unverified';
export type VettingKind = 'carrier' | 'broker' | 'shipper';

export interface VettingResult {
  /** Company / DOT number the record was looked up by. */
  query: string;
  dotNumber?: string;
  kind: VettingKind;
  status: VettingStatus;
  authorityActive?: boolean;
  insuranceActive?: boolean;
  reasons: string[];
  /** Source of the record (e.g. 'FMCSA snapshot (keyless)' vs 'demo'). */
  sourceLabel: string;
}

export type DocKind = 'BOL' | 'Invoice' | 'DeliveryReceipt';

/** How the driver works + what they run. Drives which perspective they see. */
export type RoleId = 'independent' | 'leased' | 'company';
export type EquipmentId = 'box_truck' | 'hotshot' | 'dry_van' | 'reefer' | 'flatbed' | 'tanker';
export type AuthorityId = 'own' | 'carrier' | 'employer';

export interface OperatingProfile {
  role: RoleId;
  equipment: EquipmentId;
  authority: AuthorityId;
  /** Marked true once the driver has completed setup. */
  set: boolean;
}

/** Which equipment a load needs (ids for matching; `equipment` is the label). */
export type LoadEquipment = EquipmentId;

/* --------------------------- Enterprise / accounts --------------------------- */
/** What kind of business an account (organization) is. */
export type OrgKind = 'independent' | 'fleet' | 'carrier' | 'shipper' | 'broker';
export type OrgRole = 'owner' | 'admin' | 'dispatcher' | 'driver' | 'accountant';

export interface Organization {
  id: string;
  name: string;
  kind: OrgKind;
  /** Billing tier for the org (Fleet/Enterprise = 'enterprise'). */
  tier: 'basic' | 'pro' | 'enterprise';
  activeSeats: number;
  seatLimit: number;
}

export interface OrgMember {
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
  /** Matches the driver-perspective equipment they pull. */
  equipment: EquipmentId;
  joinedAt: string;
}

/** The current user's place within an organization (RBAC anchor). */
export interface OrgMembership {
  org: Organization;
  member: OrgMember;
}
export type DocStatus = 'pending' | 'verified' | 'error';

export interface TruckDoc {
  id: string;
  kind: DocKind;
  loadRef: string;
  bolNumber: string;
  shipper: string;
  consignee: string;
  weightLb: number;
  amount: number;
  status: DocStatus;
  createdAt: string;
  fileName?: string;
}

export interface HealthMetrics {
  coolantTempF: number;
  batteryVoltage: number;
  fuelPct: number;
  rpm: number;
}

export interface TruckHealth {
  metrics: HealthMetrics;
  faultCodes: string[];
  updatedAt: string;
}

export interface DispatchMessage {
  id: string;
  from: string;
  text: string;
  at: string;
  unread: boolean;
  /** Which side of the thread authored it. */
  sender: 'dispatch' | 'me';
}

export interface VehicleDetail {
  plate: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  odometerMi: number;
  nextServiceMi: number;
  health: TruckHealth;
  faultHistory: { id: string; code: string; label: string; at: string; cleared: boolean }[];
  maintenance: { item: string; dueAtMi: number; dueText: string }[];
  /** OBD snapshots over time — feeds the (rule-based) predictive model. */
  samples: { at: string; coolantTempF: number; batteryVoltage: number; fuelPct: number }[];
}

export interface Earnings {
  weekGross: number;
  weekMiles: number;
  ratePerMile: number;
  thisLoadPayout: number;
}

export interface DriverProfile {
  name: string;
  tier: 'basic' | 'pro' | 'fleet';
  truck: { plate: string; make: string; model: string; year: number };
  mc: string;
}

export interface PortalToday {
  load?: Load;
  nextStopLabel: string;
  driver: DriverProfile;
  earnings: Earnings;
  health: TruckHealth;
  documents: TruckDoc[];
  messages: DispatchMessage[];
}

/** A partner freight board we aggregate into the single load feed. */
export interface BoardSource {
  id: string;
  name: string;
  count: number;
}

export type DataSeam = {
  getToday(): Promise<PortalToday>;
  getLoads(): Promise<Load[]>;
  getDocuments(): Promise<TruckDoc[]>;
  getOpenLoads(): Promise<Load[]>;
  getBoardSources(): Promise<BoardSource[]>;
  acceptLoad(id: string): Promise<Load>;
  uploadDocument(kind: DocKind, loadRef: string): Promise<TruckDoc>;
  getVehicleDetail(): Promise<VehicleDetail>;
  getMessages(): Promise<DispatchMessage[]>;
  sendDispatchMessage(text: string): Promise<DispatchMessage>;
  getOperatingProfile(): Promise<OperatingProfile>;
  setOperatingProfile(profile: OperatingProfile): Promise<OperatingProfile>;
  getOrganizations(): Promise<Organization[]>;
  getMembership(): Promise<OrgMembership>;
  switchOrganization(orgId: string): Promise<OrgMembership>;
  getOrgMembers(orgId: string): Promise<OrgMember[]>;
  inviteMember(input: { name: string; email: string; role: OrgRole; equipment: EquipmentId }): Promise<OrgMember>;
  setMemberRole(memberId: string, role: OrgRole): Promise<OrgMember[]>;
  getCompliance(): Promise<ComplianceDossier>;
  getContractLeads(): Promise<ContractLead[]>;
  getRateContracts(): Promise<RateContract[]>;
  getContractReceipts(): Promise<ContractReceipt[]>;
  sendPacket(leadId: string): Promise<PacketSendResult>;
  sendForSignature(id: string): Promise<RateContract>;
  signContract(id: string): Promise<RateContract>;
};

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
