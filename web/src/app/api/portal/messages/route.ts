import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

export async function GET() {
  return NextResponse.json({ messages: await portalApi.getMessages() });
}

export async function POST(req: Request) {
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
