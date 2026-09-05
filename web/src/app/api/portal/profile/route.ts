import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';
import { requirePortalUser } from '@/lib/portal-guard';

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  return NextResponse.json({ profile: await portalApi.getOperatingProfile() });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let profile: Parameters<typeof portalApi.setOperatingProfile>[0];
  try {
    const body = (await req.json()) as { profile?: typeof profile };
    if (!body.profile?.role || !body.profile?.equipment || !body.profile?.authority) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
    }
    profile = body.profile;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const saved = await portalApi.setOperatingProfile(profile);
  return NextResponse.json({ profile: saved });
}
