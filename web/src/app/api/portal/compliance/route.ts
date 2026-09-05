import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';
import { requirePortalUser } from '@/lib/portal-guard';

/**
 * Portal compliance dossier.
 * GET /api/portal/compliance -> { dossier }
 */
export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const dossier = await portalApi.getCompliance();
  return NextResponse.json({ dossier });
}
