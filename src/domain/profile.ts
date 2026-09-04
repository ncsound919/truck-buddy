/**
 * Operating profile — mirrors the web portal's multi-perspective model so the
 * app and site share the same vocabulary for "how the driver works".
 * Kept in sync with: web/src/lib/perspective.ts
 */

export type RoleId = 'independent' | 'leased' | 'company';
export type EquipmentId =
  | 'box_truck'
  | 'hotshot'
  | 'dry_van'
  | 'reefer'
  | 'flatbed'
  | 'tanker';
export type AuthorityId = 'own' | 'carrier' | 'employer';

export interface OperatingProfile {
  role: RoleId;
  equipment: EquipmentId;
  authority: AuthorityId;
  /** True once the driver has completed work-setup. */
  set: boolean;
}

export const DEFAULT_PROFILE: OperatingProfile = {
  role: 'independent',
  equipment: 'dry_van',
  authority: 'own',
  set: true,
};

export const ROLE_LABEL: Record<RoleId, string> = {
  independent: 'Independent owner-operator',
  leased: 'Leased to a carrier',
  company: 'Company / fleet driver',
};

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  box_truck: 'Box truck',
  hotshot: 'Hotshot / straight truck',
  dry_van: 'Dry van (Class 8)',
  reefer: 'Refrigerated (Class 8)',
  flatbed: 'Flatbed (Class 8)',
  tanker: 'Tanker',
};

export const AUTHORITY_LABEL: Record<AuthorityId, string> = {
  own: 'I run my own operating authority',
  carrier: 'I lease under a carrier',
  employer: 'My employer runs it (company driver)',
};

/** Concise "perspective" string, e.g. "Company driver · Box truck". */
export function profileLabel(p: OperatingProfile): string {
  const role = ROLE_LABEL[p.role].split(' (')[0];
  return `${role} · ${EQUIPMENT_LABEL[p.equipment]}`;
}

export const ROLES = Object.entries(ROLE_LABEL) as [RoleId, string][];
export const EQUIPMENT = Object.entries(EQUIPMENT_LABEL) as [EquipmentId, string][];
export const AUTHORITY = Object.entries(AUTHORITY_LABEL) as [AuthorityId, string][];
