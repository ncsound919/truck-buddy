import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';
import { requirePortalUser } from '@/lib/portal-guard';
import type { EquipmentId, OrgRole } from '@/lib/domain';

export async function GET(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const orgId = new URL(req.url).searchParams.get('orgId') ?? undefined;
  const active = await portalApi.getMembership();
  const members = await portalApi.getOrgMembers(orgId ?? active.org.id);
  return NextResponse.json({ members, activeRole: active.member.role });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let body: { name?: string; email?: string; role?: OrgRole; equipment?: EquipmentId };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!body.name || !body.email || !body.role || !body.equipment) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
  }
  try {
    const member = await portalApi.inviteMember({
      name: body.name,
      email: body.email,
      role: body.role,
      equipment: body.equipment,
    });
    return NextResponse.json({ member });
  } catch {
    return NextResponse.json({ error: 'seat_limit_reached' }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let body: { memberId?: string; role?: OrgRole };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!body.memberId || !body.role) return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
  try {
    const members = await portalApi.setMemberRole(body.memberId, body.role);
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: 'member_not_found' }, { status: 404 });
  }
}
