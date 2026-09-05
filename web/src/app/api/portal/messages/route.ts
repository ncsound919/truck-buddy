import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';
import { requirePortalUser } from '@/lib/portal-guard';

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  return NextResponse.json({ messages: await portalApi.getMessages() });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let text: string;
  try {
    const body = (await req.json()) as { text?: string };
    text = body.text?.trim() ?? '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 422 });
  const message = await portalApi.sendDispatchMessage(text);
  return NextResponse.json({ message });
}
