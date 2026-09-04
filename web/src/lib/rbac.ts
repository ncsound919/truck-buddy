import type { AuthorityId, EquipmentId, OrgKind, OrgMember, OrgRole, RoleId } from './domain';

/** RBAC model: org members have a role; roles grant permissions. */
export type Permission = 'manage_team' | 'invite' | 'view_finance' | 'dispatch' | 'admin';

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  accountant: 'Accountant',
};

export const KIND_LABEL: Record<OrgKind, string> = {
  independent: 'Owner-operator',
  fleet: 'Fleet',
  carrier: 'Carrier',
  shipper: 'Shipper',
  broker: 'Broker',
};

/** Permission matrix. Owners/admins manage team; accountant sees finance. */
const ROLES: Record<OrgRole, Permission[]> = {
  owner: ['manage_team', 'invite', 'view_finance', 'dispatch', 'admin'],
  admin: ['manage_team', 'invite', 'view_finance', 'dispatch', 'admin'],
  dispatcher: ['dispatch'],
  accountant: ['view_finance'],
  driver: [],
};

export function can(role: OrgRole, permission: Permission): boolean {
  return ROLES[role].includes(permission);
}

export function isManager(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * A membership inside an org maps to the driver-perspective OperatingProfile so
 * switching orgs genuinely re-perspectives the portal (owner-operator view vs
 * company/leased driver view), reusing the existing perspective gating.
 */
export function membershipPerspective(orgKind: OrgKind, memberRole: OrgRole): { role: RoleId; authority: AuthorityId } {
  if (orgKind === 'independent') {
    return { role: 'independent', authority: 'own' };
  }
  if (memberRole === 'driver') {
    return orgKind === 'fleet'
      ? { role: 'company', authority: 'employer' }
      : { role: 'leased', authority: 'carrier' };
  }
  // Operators (owner/admin/dispatcher/accountant) of a fleet/carrier manage it.
  return { role: 'leased', authority: 'carrier' };
}

export function memberEquipment(member?: OrgMember): EquipmentId {
  return member?.equipment ?? 'dry_van';
}
