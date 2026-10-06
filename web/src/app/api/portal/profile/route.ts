import { NextResponse } from 'next/server';

import { getPortalApi } from '@/lib/portal-api';
import { requirePortalUser } from '@/lib/portal-guard';
import { getSessionUser, getSupabaseServer } from '@/lib/supabase/server';
import type { OperatingProfile } from '@/lib/domain';

/**
 * Portal operating profile — persisted in the shared `public.profiles.metadata`
 * bag so the cab app, web portal and social app all read the same driver
 * identity (`auth.users.id`). A driver with no saved profile gets the unset
 * default (never demo data).
 */
const KEY = 'operatingProfile';

async function defaultProfile(): Promise<OperatingProfile> {
  const api = await getPortalApi();
  return api.getOperatingProfile();
}

async function readProfile(userId: string) {
  const sb = await getSupabaseServer();
  const { data } = await sb.from('profiles').select('metadata').eq('id', userId).maybeSingle();
  const stored = (data?.metadata as Record<string, unknown> | null)?.[KEY];
  return stored ? (stored as Awaited<ReturnType<typeof defaultProfile>>) : defaultProfile();
}

export async function GET() {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ profile: await readProfile(user.id) });
}

export async function POST(req: Request) {
  const denied = await requirePortalUser();
  if (denied) return denied;
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let profile: OperatingProfile;
  try {
    const body = (await req.json()) as { profile?: typeof profile };
    if (!body.profile?.role || !body.profile?.equipment || !body.profile?.authority) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 422 });
    }
    profile = body.profile;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const sb = await getSupabaseServer();
  const { data: existing } = await sb.from('profiles').select('metadata').eq('id', user.id).maybeSingle();
  const metadata = {
    ...((existing?.metadata as Record<string, unknown>) ?? {}),
    [KEY]: { ...profile, set: true },
  };

  const { error } = await sb
    .from('profiles')
    .upsert({ id: user.id, email: user.email ?? '', metadata }, { onConflict: 'id' });
  if (error) {
    return NextResponse.json({ error: 'save_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: { ...profile, set: true } });
}
