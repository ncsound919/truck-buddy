import type { DataSeam } from '@/lib/domain';
import { EmptyPortalApi } from '@/lib/empty-api';
import { LivePortalApi } from '@/lib/live-api';
import { getSessionUser, getSupabaseServer } from '@/lib/supabase/server';

/**
 * Request-scoped portal seam.
 *
 * A signed-in request always gets the live, RLS-scoped implementation bound to
 * the caller's session. Anonymous or unconfigured requests get an honest EMPTY
 * seam — never the old in-memory demo fixtures, which is what used to surface as
 * a fake business and a fake driver name to real users.
 */

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
  );
}

/**
 * The live loads / documents / dispatch tables are applied (migration
 * 20260928130000), so the seam is always live when a user is present. Kept as a
 * named export for older callers.
 */
export function liveSliceEnabled(): boolean {
  return true;
}

const empty = new EmptyPortalApi();

export async function getPortalApi(): Promise<DataSeam> {
  if (!supabaseConfigured()) return empty;
  const user = await getSessionUser();
  if (!user) return empty;
  const sb = await getSupabaseServer();
  return new LivePortalApi(sb, { id: user.id, name: user.name, email: user.email });
}
