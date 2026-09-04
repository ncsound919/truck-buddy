import type { AuthorityId, EquipmentId, OperatingProfile, RoleId } from './domain';

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
  own: "I run my own operating authority",
  carrier: 'I lease under a carrier',
  employer: 'My employer runs it (company driver)',
};

/** Independent drivers source their own work on the board. */
export function huntsOwnWork(p: OperatingProfile): boolean {
  return p.role === 'independent' || p.role === 'leased';
}

/** Only true independents with their own authority chase factoring. */
export function canFactor(p: OperatingProfile): boolean {
  return p.role === 'independent' && p.authority === 'own';
}

export function perspectiveLabel(p: OperatingProfile): string {
  return `${ROLE_LABEL[p.role]} · ${EQUIPMENT_LABEL[p.equipment]}`;
}

/** Which posted-equipment ids this driver can actually pull. */
export function compatibleEquipments(e: EquipmentId): EquipmentId[] {
  switch (e) {
    case 'box_truck':
      return ['box_truck'];
    case 'hotshot':
      return ['box_truck', 'hotshot', 'flatbed'];
    case 'dry_van':
      return ['dry_van', 'box_truck'];
    case 'reefer':
      return ['reefer', 'dry_van'];
    case 'flatbed':
      return ['flatbed'];
    case 'tanker':
      return ['tanker', 'dry_van'];
  }
}

/** Owner-operators with their own authority drive compliance + contracting. */
export function runsOwnAuthority(p: OperatingProfile): boolean {
  return canFactor(p);
}
