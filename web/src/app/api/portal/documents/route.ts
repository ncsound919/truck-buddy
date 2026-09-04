import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

export async function GET() {
  return NextResponse.json({ documents: await portalApi.getDocuments() });
}

export async function POST(req: Request) {
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
