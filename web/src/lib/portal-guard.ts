import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/supabase/server';

/**
 * Portal API guard. Every /api/portal/* handler calls this first: no valid
 * session → 401, nothing else runs. Returns null when the caller may proceed.
 */
export async function requirePortalUser(): Promise<NextResponse | null> {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
