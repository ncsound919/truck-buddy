import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  BoardSource,
  ComplianceDossier,
  ContractLead,
  ContractReceipt,
  DataSeam,
  DispatchMessage,
  DocKind,
  EquipmentId,
  Load,
  LoadStatus,
  OperatingProfile,
  Organization,
  OrgMember,
  OrgMembership,
  OrgRole,
  PacketSendResult,
  PortalToday,
  RateContract,
  TruckDoc,
  VehicleDetail,
} from '@/lib/domain';
import { portalApi as mockApi } from '@/lib/mock-api';

/**
 * Live portal seam for the loads / documents / dispatch slice.
 *
 * Every method here hits the shared Supabase project under the request's own
 * session, so RLS enforces per-user isolation. Surfaces not yet migrated
 * (vehicle, organizations, compliance, contracts) delegate to the mock seam and
 * are labelled as demo in their own pages.
 */

export interface LoadRow {
  id: string;
  ref: string;
  origin: string;
  destination: string;
  distance_mi: number;
  weight_lb: number;
  equipment: string;
  equipment_type: string | null;
  payout: number | string;
  pickup_at: string | null;
  deliver_by: string | null;
  status: LoadStatus;
  shipper: string;
  posted_by: string | null;
  source: string;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface DocRow {
  id: string;
  kind: DocKind;
  load_ref: string;
  bol_number: string;
  shipper: string;
  consignee: string;
  weight_lb: number;
  amount: number | string;
  status: TruckDoc['status'];
  file_name: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  sender: 'dispatch' | 'me';
  from_label: string;
  body: string;
  unread: boolean;
  created_at: string;
}

const DAY_MS = 86_400_000;

/** "Today 07:00" / "Tomorrow 14:00" / "Fri 06:30" — a pickup/delivery window. */
export function formatWindow(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(now)) / DAY_MS);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  if (diffDays === -1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
}

/** "06:35" if today, else "Sep 4 06:35". */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return time;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

export function rowToLoad(r: LoadRow): Load {
  return {
    id: r.id,
    ref: r.ref,
    origin: r.origin,
    destination: r.destination,
    distanceMi: r.distance_mi,
    weightLb: r.weight_lb,
    equipment: r.equipment,
    equipmentType: (r.equipment_type ?? undefined) as EquipmentId | undefined,
    payout: Number(r.payout),
    pickupAt: formatWindow(r.pickup_at),
    deliverBy: formatWindow(r.deliver_by),
    status: r.status,
    shipper: r.shipper,
    postedBy: r.posted_by ?? r.shipper,
    source: r.source,
    originCoords:
      r.origin_lat != null && r.origin_lng != null ? { lat: r.origin_lat, lng: r.origin_lng } : undefined,
    destCoords:
      r.dest_lat != null && r.dest_lng != null ? { lat: r.dest_lat, lng: r.dest_lng } : undefined,
    acceptedAt: r.accepted_at ?? undefined,
  };
}

export function rowToDoc(r: DocRow): TruckDoc {
  return {
    id: r.id,
    kind: r.kind,
    loadRef: r.load_ref,
    bolNumber: r.bol_number,
    shipper: r.shipper,
    consignee: r.consignee,
    weightLb: r.weight_lb,
    amount: Number(r.amount),
    status: r.status,
    createdAt: r.created_at,
    fileName: r.file_name ?? undefined,
  };
}

export function rowToMessage(r: MessageRow): DispatchMessage {
  return {
    id: r.id,
    from: r.from_label || (r.sender === 'me' ? 'You' : 'Dispatch'),
    text: r.body,
    at: formatClock(r.created_at),
    unread: r.unread,
    sender: r.sender,
  };
}

const UNSET_PROFILE: OperatingProfile = {
  role: 'independent',
  equipment: 'dry_van',
  authority: 'own',
  set: false,
};

export class LivePortalApi implements DataSeam {
  constructor(
    private readonly sb: SupabaseClient,
    private readonly user: { id: string; name: string | null },
  ) {}

  /* ------------------------------- Loads ------------------------------- */

  async getLoads(): Promise<Load[]> {
    const { data, error } = await this.sb
      .from('loads')
      .select('*')
      .eq('accepted_by', this.user.id)
      .order('accepted_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as LoadRow[]).map(rowToLoad);
  }

  async getOpenLoads(): Promise<Load[]> {
    const { data, error } = await this.sb
      .from('loads')
      .select('*')
      .eq('status', 'open')
      .is('accepted_by', null)
      .order('payout', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as LoadRow[]).map(rowToLoad);
  }

  async getBoardSources(): Promise<BoardSource[]> {
    const open = await this.getOpenLoads();
    const counts = new Map<string, number>();
    for (const l of open) counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async acceptLoad(id: string): Promise<Load> {
    const { data, error } = await this.sb.rpc('accept_load', { p_load_id: id });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as LoadRow | undefined;
    if (!row) throw new Error('load_not_available');
    return rowToLoad(row);
  }

  /* ----------------------------- Documents ----------------------------- */

  async getDocuments(): Promise<TruckDoc[]> {
    const { data, error } = await this.sb
      .from('documents')
      .select('*')
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as DocRow[]).map(rowToDoc);
  }

  async uploadDocument(kind: DocKind, loadRef: string): Promise<TruckDoc> {
    const { data, error } = await this.sb
      .from('documents')
      .insert({
        kind,
        load_ref: loadRef,
        bol_number: loadRef,
        shipper: this.user.name ?? 'Driver',
        consignee: 'Pending',
        status: 'pending',
        file_name: `${kind.toLowerCase()}-${loadRef.toLowerCase()}.jpg`,
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToDoc(data as DocRow);
  }

  /* ------------------------------ Dispatch ----------------------------- */

  async getMessages(): Promise<DispatchMessage[]> {
    const { data, error } = await this.sb
      .from('dispatch_messages')
      .select('*')
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as MessageRow[]).map(rowToMessage);
  }

  async sendDispatchMessage(text: string): Promise<DispatchMessage> {
    const { data, error } = await this.sb
      .from('dispatch_messages')
      .insert({ sender: 'me', from_label: 'You', body: text, unread: false })
      .select('*')
      .single();
    if (error) throw error;
    return rowToMessage(data as MessageRow);
  }

  /* --------------------------- Operating profile ----------------------- */

  async getOperatingProfile(): Promise<OperatingProfile> {
    const { data } = await this.sb
      .from('profiles')
      .select('metadata')
      .eq('id', this.user.id)
      .maybeSingle();
    const stored = (data?.metadata as { operatingProfile?: OperatingProfile } | null)?.operatingProfile;
    return stored ? { ...stored, set: true } : { ...UNSET_PROFILE };
  }

  async setOperatingProfile(profile: OperatingProfile): Promise<OperatingProfile> {
    const { data } = await this.sb
      .from('profiles')
      .select('metadata')
      .eq('id', this.user.id)
      .maybeSingle();
    const metadata = {
      ...((data?.metadata as Record<string, unknown> | null) ?? {}),
      operatingProfile: { ...profile, set: true },
    };
    const { error } = await this.sb
      .from('profiles')
      .upsert({ id: this.user.id, metadata }, { onConflict: 'id' });
    if (error) throw error;
    return { ...profile, set: true };
  }

  /* ------------------------------- Today -------------------------------- */

  async getToday(): Promise<PortalToday> {
    const [loads, documents, messages, demo] = await Promise.all([
      this.getLoads(),
      this.getDocuments(),
      this.getMessages(),
      mockApi.getToday(),
    ]);
    const load = loads.find((l) => l.status === 'accepted' || l.status === 'in_progress') ?? loads[0];
    return {
      load,
      nextStopLabel: load ? `${load.destination} · ${load.equipment}` : '',
      driver: { ...demo.driver, name: this.user.name ?? demo.driver.name },
      // Earnings + vehicle health are not part of this slice yet — kept from
      // the demo seam and labelled as sample data in their UI.
      earnings: demo.earnings,
      health: demo.health,
      documents,
      messages,
    };
  }

  /* ------------------- Not-yet-migrated surfaces (demo) ----------------- */

  getVehicleDetail(): Promise<VehicleDetail> {
    return mockApi.getVehicleDetail();
  }

  getOrganizations(): Promise<Organization[]> {
    return mockApi.getOrganizations();
  }

  getMembership(): Promise<OrgMembership> {
    return mockApi.getMembership();
  }

  switchOrganization(orgId: string): Promise<OrgMembership> {
    return mockApi.switchOrganization(orgId);
  }

  getOrgMembers(orgId: string): Promise<OrgMember[]> {
    return mockApi.getOrgMembers(orgId);
  }

  inviteMember(input: { name: string; email: string; role: OrgRole; equipment: EquipmentId }): Promise<OrgMember> {
    return mockApi.inviteMember(input);
  }

  setMemberRole(memberId: string, role: OrgRole): Promise<OrgMember[]> {
    return mockApi.setMemberRole(memberId, role);
  }

  getCompliance(): Promise<ComplianceDossier> {
    return mockApi.getCompliance();
  }

  getContractLeads(): Promise<ContractLead[]> {
    return mockApi.getContractLeads();
  }

  getRateContracts(): Promise<RateContract[]> {
    return mockApi.getRateContracts();
  }

  getContractReceipts(): Promise<ContractReceipt[]> {
    return mockApi.getContractReceipts();
  }

  sendPacket(leadId: string): Promise<PacketSendResult> {
    return mockApi.sendPacket(leadId);
  }

  sendForSignature(id: string): Promise<RateContract> {
    return mockApi.sendForSignature(id);
  }

  signContract(id: string): Promise<RateContract> {
    return mockApi.signContract(id);
  }
}
