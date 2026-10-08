/**
 * Portal org provisioning decisions.
 *
 * Security property: a user is placed into an *existing* organization ONLY when
 * a server-side `PORTAL_ORG_MAP` entry maps them there by email. A client-supplied
 * display name must never select an org — otherwise a new signup whose name equals
 * a victim org's name would be provisioned into it (tenant takeover). With no
 * mapping, the user always gets a fresh personal org.
 */

export interface OrgMapping {
  org: string;
  role: string;
}

export type OrgPlan =
  | { action: 'join'; orgName: string; role: string }
  | { action: 'create'; orgName: string; role: string };

export function planMembership(input: {
  mapped?: OrgMapping;
  userName?: string | null;
  userId: string;
}): OrgPlan {
  if (input.mapped?.org) {
    return { action: 'join', orgName: input.mapped.org, role: input.mapped.role || 'owner' };
  }
  const base = (input.userName || '').trim() || 'Independent';
  return { action: 'create', orgName: base, role: 'owner' };
}

/** Make a personal-org name unique when a same-named org already exists. */
export function personalOrgName(base: string, userId: string, nameTaken: boolean): string {
  const clean = (base || '').trim() || 'Independent';
  if (!nameTaken) return clean;
  return `${clean} · ${userId.slice(0, 8)}`;
}
