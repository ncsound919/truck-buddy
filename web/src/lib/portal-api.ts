import type { DataSeam } from '@/lib/domain';
import { LivePortalApi } from '@/lib/live-api';
import { portalApi as mockApi } from '@/lib/mock-api';
import { getSessionUser, getSupabaseServer } from '@/lib/supabase/server';

/**
 * Request-scoped portal seam.
 *
 * When the shared Supabase project is configured (every real deployment) this
 * returns the live, RLS-scoped implementation bound to the caller's session.
 * Only an unconfigured or anonymous request falls back to the in-memory demo
 * seam — so a production misconfiguration surfaces as demo data rather than
 * silently leaking another user's rows.
 */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
  );
}

/**
 * Feature gate for the real loads / documents / dispatch storage.
 *
 * Off by default so this code can ship before the tables exist — otherwise the
 * portal would 5xx the moment it ran a query against a missing table. Turn it on
 * (Vercel → project env `PORTAL_LIVE_SLICE=1`) only after migration
 * `20260928130000_portal_loads_documents_dispatch.sql` is applied and verified.
 */
export function liveSliceEnabled(): boolean {
  return process.env.PORTAL_LIVE_SLICE === '1';
}

export async function getPortalApi(): Promise<DataSeam> {
  if (!supabaseConfigured() || !liveSliceEnabled()) return mockApi;
  const user = await getSessionUser();
  if (!user) return mockApi;
  const sb = await getSupabaseServer();
  return new LivePortalApi(sb, { id: user.id, name: user.name });
}
