import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Shared server-side Supabase client for the Truck Buddy web app. Sessions live
 * in HTTP-only cookies managed by @supabase/ssr. Used by both the customer
 * portal/auth and the Ops console. Server-only module (holds the anon key but
 * never the service role — service-role access lives in lib/ops/admin-client).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — safe to ignore when middleware refreshes.
        }
      },
    },
  });
}

/** The currently signed-in Supabase user, or null. */
export async function getSessionUser(): Promise<{ id: string; email: string | null; name: string | null } | null> {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      null,
  };
}
