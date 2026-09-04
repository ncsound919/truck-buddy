import { NextResponse } from 'next/server';

import { portalApi } from '@/lib/mock-api';

/**
 * Portal loads — reads and the one mutation (accept) that drives shared state.
 * GET  /api/portal/loads          -> { loads, open, sources }
 * POST /api/portal/loads          -> accept { id }
 *
 * The authoritative store is a single server module instance shared by server
 * components and these handlers, so an accept here is visible on the next
 * server render (and, via the same base URL, to the mobile app client).
 */
export async function GET() {
  const [loads, open, sources] = await Promise.all([
    portalApi.getLoads(),
    portalApi.getOpenLoads(),
    portalApi.getBoardSources(),
  ]);
  return NextResponse.json({
    loads,
    open,
    sources: sources.map((s) => s.name),
  });
}

export async function POST(req: Request) {
  let id: string;
  try {
    const body = (await req.json()) as { id?: string };
    id = body.id ?? '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const load = await portalApi.acceptLoad(id);
    return NextResponse.json({ load });
  } catch {
    return NextResponse.json({ error: 'load_not_found' }, { status: 404 });
  }
}
