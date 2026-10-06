import { NextResponse } from 'next/server';

import { getPortalApi } from '@/lib/portal-api';
import { requirePortalUser } from '@/lib/portal-guard';

/**
 * Portal compliance dossier.
 * GET /api/portal/compliance -> { dossier }
 */
export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const api = await getPortalApi();
  const dossier = await api.getCompliance();
  return NextResponse.json({ dossier });
}
