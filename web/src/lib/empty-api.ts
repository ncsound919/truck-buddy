import type {
  ComplianceDossier,
  ContractReceipt,
  DataSeam,
  DispatchMessage,
  Load,
  OperatingProfile,
  Organization,
  OrgMember,
  OrgMembership,
  PortalToday,
  RateContract,
  TruckDoc,
  VehicleDetail,
} from '@/lib/domain';
import { EMPTY_HEALTH } from '@/lib/live-api';

/**
 * Honest empty seam for a request with no signed-in user (or an unconfigured
 * project). It returns NO fabricated business, identity or load data — every
 * read is empty and every write fails loudly. The portal middleware already
 * redirects anonymous visitors to /auth, so this is the last line of defence,
 * not a demo mode.
 */

const EMPTY_MEMBERSHIP: OrgMembership = {
  org: { id: 'none', name: 'No account', kind: 'independent', tier: 'basic', activeSeats: 0, seatLimit: 0 },
  member: { userId: '', name: '', email: '', role: 'driver', equipment: 'dry_van', joinedAt: new Date(0).toISOString() },
};

const UNSET_PROFILE: OperatingProfile = { role: 'independent', equipment: 'dry_van', authority: 'own', set: false };

const notSignedIn = () => Promise.reject(new Error('Not signed in.'));

export class EmptyPortalApi implements DataSeam {
  getToday(): Promise<PortalToday> {
    return Promise.resolve({
      load: undefined,
      nextStopLabel: '',
      driver: { name: '', tier: 'basic', truck: { plate: '', make: '', model: '', year: 0 }, mc: '' },
      earnings: { weekGross: 0, weekMiles: 0, ratePerMile: 0, thisLoadPayout: 0 },
      health: EMPTY_HEALTH,
      documents: [],
      messages: [],
    });
  }
  getLoads(): Promise<Load[]> { return Promise.resolve([]); }
  getDocuments(): Promise<TruckDoc[]> { return Promise.resolve([]); }
  getOpenLoads(): Promise<Load[]> { return Promise.resolve([]); }
  getBoardSources() { return Promise.resolve([]); }
  acceptLoad(): Promise<Load> { return notSignedIn(); }
  uploadDocument(): Promise<TruckDoc> { return notSignedIn(); }
  getVehicleDetail(): Promise<VehicleDetail> {
    return Promise.resolve({ plate: '', make: '', model: '', year: 0, vin: '', odometerMi: 0, nextServiceMi: 0, health: EMPTY_HEALTH, faultHistory: [], maintenance: [], samples: [] });
  }
  getMessages(): Promise<DispatchMessage[]> { return Promise.resolve([]); }
  sendDispatchMessage(): Promise<DispatchMessage> { return notSignedIn(); }
  getOperatingProfile(): Promise<OperatingProfile> { return Promise.resolve({ ...UNSET_PROFILE }); }
  setOperatingProfile(): Promise<OperatingProfile> { return notSignedIn(); }
  getOrganizations(): Promise<Organization[]> { return Promise.resolve([]); }
  getMembership(): Promise<OrgMembership> { return Promise.resolve(EMPTY_MEMBERSHIP); }
  switchOrganization(): Promise<OrgMembership> { return notSignedIn(); }
  getOrgMembers(): Promise<OrgMember[]> { return Promise.resolve([]); }
  inviteMember(): Promise<OrgMember> { return notSignedIn(); }
  setMemberRole(): Promise<OrgMember[]> { return notSignedIn(); }
  getCompliance(): Promise<ComplianceDossier> {
    return Promise.resolve({ asOf: new Date().toISOString(), verdict: 'at_risk', items: [], docsOnFile: [] });
  }
  getContractLeads() { return Promise.resolve([]); }
  getRateContracts(): Promise<RateContract[]> { return Promise.resolve([]); }
  getContractReceipts(): Promise<ContractReceipt[]> { return Promise.resolve([]); }
  sendPacket() { return notSignedIn(); }
  sendForSignature(): Promise<RateContract> { return notSignedIn(); }
  signContract(): Promise<RateContract> { return notSignedIn(); }
}
