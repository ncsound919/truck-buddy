import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Ops console data client.
 *
 * Uses the Supabase SERVICE ROLE key so Ops tables (RLS enabled, NO
 * anon/authenticated policies) are reachable only from the server. This module
 * must never be imported by client components — it holds the service secret.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

export interface OpsRow<T = Record<string, unknown>> {
  data: T[] | null;
  error: string | null;
}

export interface QueryOpts {
  order?: { col: string; ascending?: boolean };
  limit?: number;
  eq?: [string, unknown];
  gte?: [string, string];
  lt?: [string, string];
  ilike?: [string, string];
}

function admin(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** True only when the service credential is configured (the real seam). */
export function opsConfigured(): boolean {
  return Boolean(url && serviceKey);
}

export async function select<T>(table: string, cols = '*', opts?: QueryOpts): Promise<OpsRow<T>> {
  const sb = admin();
  if (!sb) return { data: null, error: 'ops_not_configured' };
  try {
    let q = sb.from(table as never).select(cols);
    if (opts?.eq) q = (q as any).eq(opts.eq[0], opts.eq[1]);
    if (opts?.gte) q = (q as any).gte(opts.gte[0], opts.gte[1]);
    if (opts?.lt) q = (q as any).lt(opts.lt[0], opts.lt[1]);
    if (opts?.ilike) q = (q as any).ilike(opts.ilike[0], `%${opts.ilike[1]}%`);
    if (opts?.order) q = (q as any).order(opts.order.col, { ascending: opts.order.ascending ?? false });
    if (opts?.limit) q = (q as any).limit(opts.limit);
    const { data, error } = await q;
    if (error) return { data: null, error: error.message };
    return { data: data as T[], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'select_failed' };
  }
}

export async function insert<T>(table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<OpsRow<T>> {
  const sb = admin();
  if (!sb) return { data: null, error: 'ops_not_configured' };
  try {
    const { data, error } = await sb.from(table as never).insert(rows as never).select();
    if (error) return { data: null, error: error.message };
    return { data: data as T[], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'insert_failed' };
  }
}

export async function update(table: string, patch: Record<string, unknown>, eq: [string, unknown]): Promise<OpsRow> {
  const sb = admin();
  if (!sb) return { data: null, error: 'ops_not_configured' };
  try {
    const { data, error } = await sb.from(table as never).update(patch as never).eq(eq[0], eq[1] as never).select();
    if (error) return { data: null, error: error.message };
    return { data: data as never[], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'update_failed' };
  }
}

export async function del(table: string, eq: [string, unknown]): Promise<{ error: string | null }> {
  const sb = admin();
  if (!sb) return { error: 'ops_not_configured' };
  try {
    const { error } = await sb.from(table as never).delete().eq(eq[0], eq[1] as never);
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'delete_failed' };
  }
}

/* ------------------------------ Domain types ------------------------------ */

export interface Pageview {
  id: string;
  path: string;
  session_id: string | null;
  referrer: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  is_bot: boolean;
  happened_at: string;
}

export interface TrackEvent {
  id: string;
  name: string;
  session_id: string | null;
  page_path: string | null;
  properties: Record<string, unknown> | null;
  happened_at: string;
}

export interface CrmLead {
  id: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: string | null;
  status: string;
  owner: string | null;
  notes: string | null;
  value_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface SeoPage {
  id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number | null;
  status_code: number | null;
  crawlable: boolean | null;
  checked_at: string;
}

/* ------------------------- Dashboard aggregates ------------------------- */

export async function analyticsSummary(rangeDays = 7): Promise<{
  configured: boolean;
  totalPageviews: number;
  uniqueSessions: number;
  totalEvents: number;
  botPct: number;
  topPaths: { path: string; count: number }[];
  daily: { day: string; count: number }[];
}> {
  const configured = opsConfigured();
  const empty = { configured, totalPageviews: 0, uniqueSessions: 0, totalEvents: 0, botPct: 0, topPaths: [], daily: [] };
  if (!configured) return empty;

  const from = new Date();
  from.setDate(from.getDate() - rangeDays);
  const fromIso = from.toISOString();

  const [pv, ev] = await Promise.all([
    select<Pageview>('tb_pageviews', '*', { gte: ['happened_at', fromIso], order: { col: 'happened_at', ascending: false }, limit: 20000 }),
    select<TrackEvent>('tb_events', 'id', { gte: ['happened_at', fromIso] }),
  ]);

  const views = (pv.data ?? []).filter((r) => !r.is_bot);
  const allViews = pv.data ?? [];
  const botCount = allViews.filter((r) => r.is_bot).length;
  const sessionSet = new Set(allViews.filter((r) => r.session_id).map((r) => r.session_id));
  const pathCount = new Map<string, number>();
  const dayCount = new Map<string, number>();
  for (const v of views) {
    pathCount.set(v.path, (pathCount.get(v.path) ?? 0) + 1);
    const day = (v.happened_at || '').slice(0, 10);
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
  }
  const topPaths = [...pathCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count }));
  const daily = [...dayCount.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({ day, count }));

  return {
    configured: true,
    totalPageviews: views.length,
    uniqueSessions: sessionSet.size,
    totalEvents: (ev.data ?? []).length,
    botPct: allViews.length ? Math.round((botCount / allViews.length) * 100) : 0,
    topPaths,
    daily,
  };
}
