import Constants from 'expo-constants';

/**
 * Shared-data client (cab app -> shared Supabase project).
 *
 * The cab, the web portal and the social app all read the same project. This
 * module is the cab's read path to the shared tables over PostgREST with the
 * anon key from `app.json` `extra` — no session required for the public road
 * advisories (`road_reports` has a scoped anon-read policy; everything else
 * stays authenticated-only).
 *
 * When the project URL/key are absent, calls resolve to an empty list and the
 * app keeps running on its offline demo data.
 */

export interface SharedRoadReport {
  id: string;
  reportType: string;
  title: string;
  body: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  upvoteCount: number;
  createdAt: string;
  expiresAt: string | null;
}

interface SharedConfig {
  base: string;
  anonKey: string;
  enabled: boolean;
}

function config(): SharedConfig {
  // Expo SDK 57 exposes the static app config on `expoConfig`; `expo` is not a
  // field of the native constants (reading it always yielded undefined, which
  // silently disabled this whole read path).
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const base = extra?.supabaseUrl?.replace(/\/$/, '') ?? '';
  const anonKey = extra?.supabaseAnonKey ?? '';
  return { base, anonKey, enabled: Boolean(base && anonKey) };
}

export function sharedDataEnabled(): boolean {
  return config().enabled;
}

interface RoadReportRow {
  id: string;
  report_type: string;
  title: string;
  body: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  upvote_count: number | null;
  created_at: string;
  expires_at: string | null;
}

/** Active road advisories shared by the portal + social app. */
export async function getRoadReports(limit = 20): Promise<SharedRoadReport[]> {
  const { base, anonKey, enabled } = config();
  if (!enabled) return [];

  const query = new URLSearchParams({
    select: 'id,report_type,title,body,latitude,longitude,location_name,upvote_count,created_at,expires_at',
    is_removed: 'eq.false',
    order: 'created_at.desc',
    limit: String(limit),
  });

  // Never let a slow/unreachable board stall the driver flow: bounded timeout,
  // and any failure degrades to the offline demo data (empty list).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let rows: RoadReportRow[];
  try {
    const res = await fetch(`${base}/rest/v1/road_reports?${query.toString()}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`road_reports_${res.status}`);
    rows = (await res.json()) as RoadReportRow[];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }

  return rows.map((r) => ({
    id: r.id,
    reportType: r.report_type,
    title: r.title,
    body: r.body,
    latitude: r.latitude,
    longitude: r.longitude,
    locationName: r.location_name,
    upvoteCount: r.upvote_count ?? 0,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}
