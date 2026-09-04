import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side Supabase auth for the Ops console. Sessions live in HTTP-only
 * cookies managed by @supabase/ssr. Access to /ops is gated by (a) an
 * authenticated Supabase user and (b) that user's email being in the
 * OPS_ADMIN_EMAILS allowlist (comma-separated) OR matching a profile marked
 * admin. This module is server-only.
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
          // Called from a Server Component — safe to ignore when middleware refreshes sessions.
        }
      },
    },
  });
}

/** The allowlisted admin emails (e.g. "you@example.com,ops@truckbuddy.online"). */
export function adminEmails(): string[] {
  return (process.env.OPS_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = adminEmails();
  if (!list.length) return false; // fail closed: no allowlist → no admin
  return list.includes(email.toLowerCase());
}

export async function getOpsUser(): Promise<{ email: string | null; admin: boolean } | null> {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const email = user.email ?? null;
  return { email, admin: isAdminEmail(email) };
}
