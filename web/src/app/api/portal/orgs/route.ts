import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

export async function GET() {
  const [orgs, membership] = await Promise.all([
    portalApi.getOrganizations(),
    portalApi.getMembership(),
  ]);
  return NextResponse.json({ orgs, membership });
}

export async function POST(req: Request) {
  let orgId: string;
  try {
    const body = (await req.json()) as { orgId?: string };
    orgId = body.orgId ?? '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const membership = await portalApi.switchOrganization(orgId);
    return NextResponse.json({ membership });
  } catch {
    return NextResponse.json({ error: 'org_membership_not_found' }, { status: 404 });
  }
}
