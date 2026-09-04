import { NextResponse } from 'next/server';

import { insert, opsConfigured } from '@/lib/ops/admin-client';

export async function POST(req: Request) {
  if (!opsConfigured()) return NextResponse.json({ ok: false, error: 'ops_not_configured' }, { status: 503 });
  let body: { company?: string; contact_name?: string; contact_email?: string; source?: string; value_usd?: number | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  if (!body.company?.trim()) {
    return NextResponse.json({ ok: false, error: 'company_required' }, { status: 400 });
  }
  const { data, error } = await insert('tb_crm_leads', {
    company: body.company.trim(),
    contact_name: body.contact_name?.trim() || null,
    contact_email: body.contact_email?.trim() || null,
    source: body.source?.trim() || null,
    value_usd: body.value_usd && body.value_usd > 0 ? body.value_usd : null,
    status: 'new',
  });
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true, lead: data?.[0] });
}
