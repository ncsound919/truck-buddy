import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';
import { requirePortalUser } from '@/lib/portal-guard';

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  return NextResponse.json({ documents: await portalApi.getDocuments() });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let body: { kind?: string; loadRef?: string };
  try {
    body = (await req.json()) as { kind?: string; loadRef?: string };
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { kind, loadRef } = body;
  if (!kind || !loadRef) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
  }
  const doc = await portalApi.uploadDocument(kind as never, loadRef);
  return NextResponse.json({ document: doc });
}
