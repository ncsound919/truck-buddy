import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

/**
 * Portal compliance dossier.
 * GET /api/portal/compliance -> { dossier }
 */
export async function GET() {
  const dossier = await portalApi.getCompliance();
  return NextResponse.json({ dossier });
}
