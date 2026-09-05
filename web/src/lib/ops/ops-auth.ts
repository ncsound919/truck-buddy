import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * Server-side Supabase auth for the Ops console. Access to /ops is gated by
 * (a) an authenticated Supabase user and (b) that user's email being in the
 * OPS_ADMIN_EMAILS allowlist (comma-separated). Reuses the shared server
 * client (lib/supabase/server.ts).
 */
export { getSupabaseServer };

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
