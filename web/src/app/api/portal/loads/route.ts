import { NextResponse } from 'next/server';

import { getPortalApi } from '@/lib/portal-api';
import { requirePortalUser } from '@/lib/portal-guard';

/**
 * Portal loads — reads and the one mutation (accept) that drives shared state.
 * GET  /api/portal/loads          -> { loads, open, sources }
 * POST /api/portal/loads          -> accept { id }
 *
 * Reads/writes run through the live Supabase seam (RLS-scoped to the caller)
 * when configured, and the accept mutation is an atomic server-side RPC.
 */
export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const api = await getPortalApi();
  const [loads, open, sources] = await Promise.all([
    api.getLoads(),
    api.getOpenLoads(),
    api.getBoardSources(),
  ]);
  return NextResponse.json({
    loads,
    open,
    sources: sources.map((s) => s.name),
  });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  let id: string;
  try {
    const body = (await req.json()) as { id?: string };
    id = body.id ?? '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const api = await getPortalApi();
    const load = await api.acceptLoad(id);
    return NextResponse.json({ load });
  } catch {
    return NextResponse.json({ error: 'load_unavailable' }, { status: 409 });
  }
}
