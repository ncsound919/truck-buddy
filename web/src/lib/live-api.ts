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

/**
 * Live portal seam.
 *
 * Every method hits the shared Supabase project under the request's own session,
 * so RLS enforces per-user isolation. There is NO demo/fabricated fallback: a
 * surface with no data yet returns an honest empty value, and a surface with no
 * backing table returns an empty result rather than invented rows.
 */

/** Honest empty health snapshot (no telemetry connected yet). */
export const EMPTY_HEALTH: TruckHealth = {
  metrics: { coolantTempF: 0, batteryVoltage: 0, fuelPct: 0, rpm: 0 },
  faultCodes: [],
  updatedAt: '',
};


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
    private readonly user: { id: string; name: string | null; email: string | null },
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
    const [loads, documents, messages, membership] = await Promise.all([
      this.getLoads(),
      this.getDocuments(),
      this.getMessages(),
      this.getMembership(),
    ]);
    const load = loads.find((l) => l.status === 'accepted' || l.status === 'in_progress') ?? loads[0];

    // Real earnings: summed from this driver's own loads in the last 7 days.
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = loads.filter((l) => Date.parse(l.acceptedAt ?? '') >= weekAgo);
    const weekGross = week.reduce((s, l) => s + (l.payout || 0), 0);
    const weekMiles = week.reduce((s, l) => s + (l.distanceMi || 0), 0);

    return {
      load,
      nextStopLabel: load ? `${load.destination} · ${load.equipment}` : '',
      driver: {
        name: this.user.name ?? '',
        tier: membership.org.tier === 'enterprise' ? 'fleet' : membership.org.tier === 'pro' ? 'pro' : 'basic',
        truck: { plate: '', make: '', model: '', year: 0 },
        mc: '',
      },
      earnings: {
        weekGross,
        weekMiles,
        ratePerMile: weekMiles ? Math.round((weekGross / weekMiles) * 100) / 100 : 0,
        thisLoadPayout: load?.payout ?? 0,
      },
      health: EMPTY_HEALTH,
      documents,
      messages,
    };
  }

  /* ------------------------------ Account ------------------------------- */

  async getOrganizations(): Promise<Organization[]> {
    const rows = await this.membershipRows();
    return rows.map((r) => mapOrg(firstOrg(r)));
  }

  async getMembership(): Promise<OrgMembership> {
    const rows = await this.membershipRows();
    const preferred = await this.preferredOrgId();
    const row = (preferred && rows.find((r) => r.org_id === preferred)) || rows[0];
    if (!row) return this.personalMembership();
    return {
      org: mapOrg(firstOrg(row)),
      member: {
        userId: row.user_id,
        name: this.user.name ?? '',
        email: this.user.email ?? '',
        role: row.role as OrgRole,
        equipment: (row.equipment as EquipmentId) ?? 'dry_van',
        joinedAt: row.joined_at ?? new Date(0).toISOString(),
      },
    };
  }

  async switchOrganization(orgId: string): Promise<OrgMembership> {
    const { data } = await this.sb.from('profiles').select('metadata').eq('id', this.user.id).maybeSingle();
    const metadata = {
      ...((data?.metadata as Record<string, unknown> | null) ?? {}),
      activeOrgId: orgId,
    };
    await this.sb.from('profiles').upsert({ id: this.user.id, metadata }, { onConflict: 'id' });
    return this.getMembership();
  }

  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await this.sb
      .from('org_memberships')
      .select('user_id,role,equipment,joined_at,is_active')
      .eq('org_id', orgId)
      .eq('is_active', true);
    if (error) throw error;
    const rows = (data ?? []) as { user_id: string; role: string; equipment: string; joined_at: string | null }[];
    // Profiles carry only the columns the authenticated role may read (no email).
    const ids = rows.map((r) => r.user_id);
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await this.sb.from('profiles').select('id,full_name,username').in('id', ids);
      for (const p of (profs ?? []) as { id: string; full_name: string | null; username: string | null }[]) {
        names.set(p.id, p.full_name || p.username || '');
      }
    }
    return rows.map((r) => ({
      userId: r.user_id,
      name: names.get(r.user_id) ?? (r.user_id === this.user.id ? this.user.name ?? '' : ''),
      email: r.user_id === this.user.id ? this.user.email ?? '' : '',
      role: r.role as OrgRole,
      equipment: (r.equipment as EquipmentId) ?? 'dry_van',
      joinedAt: r.joined_at ?? new Date(0).toISOString(),
    }));
  }

  async inviteMember(): Promise<OrgMember> {
    throw new Error('Invites are not enabled yet — a teammate joins by signing in with their email.');
  }

  async setMemberRole(memberId: string, role: OrgRole): Promise<OrgMember[]> {
    const { data: row } = await this.sb.from('org_memberships').select('org_id').eq('id', memberId).maybeSingle();
    const { error } = await this.sb.from('org_memberships').update({ role }).eq('id', memberId);
    if (error) throw error;
    return row?.org_id ? this.getOrgMembers(row.org_id) : [];
  }

  /* ---------------------- Surfaces with no backend yet ------------------- */
  /* These return honest empties so the UI shows "nothing yet", never invented
     rows. They become real as each backend slice lands. */

  getVehicleDetail(): Promise<VehicleDetail> {
    return Promise.resolve({
      plate: '',
      make: '',
      model: '',
      year: 0,
      vin: '',
      odometerMi: 0,
      nextServiceMi: 0,
      health: EMPTY_HEALTH,
      faultHistory: [],
      maintenance: [],
      samples: [],
    });
  }

  getCompliance(): Promise<ComplianceDossier> {
    return Promise.resolve({
      asOf: new Date().toISOString(),
      verdict: 'at_risk',
      items: [],
      docsOnFile: [],
    });
  }

  getContractLeads(): Promise<ContractLead[]> {
    return Promise.resolve([]);
  }

  getRateContracts(): Promise<RateContract[]> {
    return Promise.resolve([]);
  }

  getContractReceipts(): Promise<ContractReceipt[]> {
    return Promise.resolve([]);
  }

  sendPacket(): Promise<PacketSendResult> {
    return Promise.reject(new Error('Sending carrier packets is not enabled yet.'));
  }

  sendForSignature(): Promise<RateContract> {
    return Promise.reject(new Error('Sending contracts for signature is not enabled yet.'));
  }

  signContract(): Promise<RateContract> {
    return Promise.reject(new Error('Contract signing is not enabled yet.'));
  }

  /* ------------------------------- helpers ------------------------------ */

  private async membershipRows(): Promise<MembershipRow[]> {
    const { data, error } = await this.sb
      .from('org_memberships')
      .select('org_id,user_id,role,equipment,is_active,joined_at,organizations(id,name,kind,tier,active_seats,seat_limit)')
      .eq('user_id', this.user.id)
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []) as MembershipRow[];
  }

  private async preferredOrgId(): Promise<string | null> {
    const { data } = await this.sb.from('profiles').select('metadata').eq('id', this.user.id).maybeSingle();
    const meta = data?.metadata as { activeOrgId?: string } | null;
    return meta?.activeOrgId ?? null;
  }

  private personalMembership(): OrgMembership {
    const name = this.user.name || this.user.email || 'Independent';
    return {
      org: { id: `personal:${this.user.id}`, name: `${name} (independent)`, kind: 'independent', tier: 'basic', activeSeats: 1, seatLimit: 1 },
      member: {
        userId: this.user.id,
        name: this.user.name ?? '',
        email: this.user.email ?? '',
        role: 'owner',
        equipment: 'dry_van',
        joinedAt: new Date(0).toISOString(),
      },
    };
  }
}

interface OrgRow {
  id: string;
  name: string;
  kind: string;
  tier: string;
  active_seats: number;
  seat_limit: number;
}

interface MembershipRow {
  org_id: string;
  user_id: string;
  role: string;
  equipment: string | null;
  is_active: boolean;
  joined_at: string | null;
  organizations: OrgRow | OrgRow[] | null;
}

function firstOrg(r: MembershipRow): OrgRow {
  const o = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
  return o ?? { id: r.org_id, name: 'Account', kind: 'independent', tier: 'basic', active_seats: 1, seat_limit: 1 };
}

function mapOrg(r: OrgRow): Organization {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind as OrgKind,
    tier: (r.tier as Organization['tier']) ?? 'basic',
    activeSeats: r.active_seats,
    seatLimit: r.seat_limit,
  };
}

