import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';
import { requirePortalUser } from '@/lib/portal-guard';

/**
 * Portal contracts — reads and the funnel mutations.
 * GET  /api/portal/contracts -> { leads, rateContracts, receipts }
 * POST /api/portal/contracts -> send_packet { leadId } | send_for_signature { id } | sign { id }
 *
 * The authoritative store is the shared server module instance, so a mutation here
 * is visible on the next server render.
 */
export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const [leads, rateContracts, receipts] = await Promise.all([
    portalApi.getContractLeads(),
    portalApi.getRateContracts(),
    portalApi.getContractReceipts(),
  ]);
  return NextResponse.json({ leads, rateContracts, receipts });
}

const ERROR_STATUS: Record<string, number> = {
  lead_not_found: 404,
  contract_not_found: 404,
  lead_not_verified: 409,
  packet_incomplete: 409,
  contract_already_signed: 409,
};

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let body: { action?: string; leadId?: string; id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    if (body.action === 'send_packet') {
      if (!body.leadId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
      const result = await portalApi.sendPacket(body.leadId);
      return NextResponse.json({ lead: result.lead, receipt: result.receipt });
    }
    if (body.action === 'send_for_signature') {
      if (!body.id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
      const contract = await portalApi.sendForSignature(body.id);
      return NextResponse.json({ contract });
    }
    if (body.action === 'sign') {
      if (!body.id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
      const contract = await portalApi.signContract(body.id);
      return NextResponse.json({ contract });
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  } catch (e) {
    const err = e instanceof Error ? e.message : 'unknown';
    const status = ERROR_STATUS[err] ?? 500;
    return NextResponse.json({ error: err }, { status });
  }
}
