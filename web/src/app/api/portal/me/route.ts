import { NextResponse } from 'next/server';

import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/ops/ops-auth';
import { insert, opsConfigured, select, update } from '@/lib/ops/admin-client';
import { planMembership, personalOrgName } from '@/lib/portal-org';

/**
 * The signed-in portal user, with admin resolution and first-login provisioning.
 *
 * Admin is (a) the OPS_ADMIN_EMAILS allowlist or (b) profiles.role = 'admin'.
 *
 * Provisioning (service role, because the self-escalation trigger correctly
 * blocks a user from promoting themselves):
 *  - ensure the `profiles` row exists and, for an allowlisted email, role='admin';
 *  - ensure the user belongs to an organization. A `PORTAL_ORG_MAP` entry
 *    (JSON: { "email": { "org": "PRL Logistical Solutions", "role": "owner" } })
 *    places them in that org; otherwise they get their own account org.
 */
const ORG_MAP: Record<string, { org: string; role: string; kind?: string }> = (() => {
  try {
    return JSON.parse(process.env.PORTAL_ORG_MAP || '{}');
  } catch {
    return {};
  }
})();

async function ensureOrg(userId: string, email: string | null, name: string, admin: boolean): Promise<void> {
  const existing = await select<{ id: string }>('org_memberships', 'id', { eq: ['user_id', userId], limit: 1 });
  if (existing.data?.length) return;

  const map = email ? ORG_MAP[email.toLowerCase()] : undefined;
  const kind = map?.kind || 'independent';
  const plan = planMembership({
    mapped: map?.org ? { org: map.org, role: map.role } : undefined,
    userName: name,
    userId,
  });

  let orgId: string | undefined;
  if (plan.action === 'join') {
    // Only reached with an explicit server-side PORTAL_ORG_MAP entry.
    const found = await select<{ id: string }>('organizations', 'id', { eq: ['name', plan.orgName], limit: 1 });
    orgId = found.data?.[0]?.id;
    if (!orgId) {
      const created = await insert<{ id: string }>('organizations', {
        name: plan.orgName,
        kind,
        tier: 'basic',
        active_seats: 1,
        seat_limit: 1,
      });
      orgId = created.data?.[0]?.id;
    }
  } else {
    // Personal org. Never reuse an existing org that happens to share the name:
    // disambiguate so a client-supplied name cannot select someone else's org.
    const taken = await select<{ id: string }>('organizations', 'id', { eq: ['name', plan.orgName], limit: 1 });
    const orgName = personalOrgName(plan.orgName, userId, Boolean(taken.data?.length));
    const created = await insert<{ id: string }>('organizations', {
      name: orgName,
      kind,
      tier: 'basic',
      active_seats: 1,
      seat_limit: 1,
    });
    orgId = created.data?.[0]?.id;
  }

  if (orgId) {
    await insert('org_memberships', {
      org_id: orgId,
      user_id: userId,
      role: plan.role,
      equipment: 'dry_van',
      is_active: true,
    });
  }
}

export async function GET() {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const email = user.email ?? null;
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (email ? email.split('@')[0] : '');
  const allowlisted = isAdminEmail(email);

  let role: string | null = null;
  if (opsConfigured()) {
    const existing = await select<{ id: string; role: string | null }>('profiles', 'id,role', {
      eq: ['id', user.id],
      limit: 1,
    });
    if (!existing.data?.length) {
      await insert('profiles', {
        id: user.id,
        email: user.email ?? '',
        full_name: name || null,
        role: allowlisted ? 'admin' : 'driver',
      });
      role = allowlisted ? 'admin' : 'driver';
    } else {
      role = existing.data[0].role;
      if (allowlisted && role !== 'admin') {
        await update('profiles', { role: 'admin' }, ['id', user.id]);
        role = 'admin';
      }
    }
    try {
      await ensureOrg(user.id, email, name, allowlisted || role === 'admin');
    } catch {
      // Provisioning must never break the session read.
    }
  }

  return NextResponse.json({
    user: { id: user.id, email, name, role, admin: allowlisted || role === 'admin' },
  });
}
