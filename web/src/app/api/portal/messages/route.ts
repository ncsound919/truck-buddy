import { NextResponse } from 'next/server';

import { getPortalApi } from '@/lib/portal-api';
import { requirePortalUser } from '@/lib/portal-guard';

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const api = await getPortalApi();
  return NextResponse.json({ messages: await api.getMessages() });
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
  const api = await getPortalApi();
  const message = await api.sendDispatchMessage(text);
  return NextResponse.json({ message });
}
