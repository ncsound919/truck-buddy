import { NextResponse } from 'next/server';

import { getPortalApi } from '@/lib/portal-api';
import { requirePortalUser } from '@/lib/portal-guard';

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const api = await getPortalApi();
  const [orgs, membership] = await Promise.all([
    api.getOrganizations(),
    api.getMembership(),
  ]);
  return NextResponse.json({ orgs, membership });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let orgId: string;
  try {
    const body = (await req.json()) as { orgId?: string };
    orgId = body.orgId ?? '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const api = await getPortalApi();
    const membership = await api.switchOrganization(orgId);
    return NextResponse.json({ membership });
  } catch {
    return NextResponse.json({ error: 'org_membership_not_found' }, { status: 404 });
  }
}
