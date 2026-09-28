import { NextResponse } from 'next/server';

import { getPortalApi } from '@/lib/portal-api';
import { requirePortalUser } from '@/lib/portal-guard';

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const api = await getPortalApi();
  return NextResponse.json({ documents: await api.getDocuments() });
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
  const api = await getPortalApi();
  const doc = await api.uploadDocument(kind as never, loadRef);
  return NextResponse.json({ document: doc });
}
