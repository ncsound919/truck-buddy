import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface DispatchSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  email: string;
}

const STORAGE_KEY = 'tb.dispatch_session.v1';

function supabaseConfig(): { url: string; anonKey: string } | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const url = typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '';
  const anonKey = typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '';
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : null;
}

async function tokenRequest(body: Record<string, string>): Promise<DispatchSession> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error('Truck Buddy is not configured (missing supabaseUrl/supabaseAnonKey).');

  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=${body.grant_type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.access_token !== 'string') {
    throw new Error(typeof data.error_description === 'string' ? data.error_description : 'Sign-in failed');
  }
  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : '',
    expiresAt: Date.now() + (typeof data.expires_in === 'number' ? data.expires_in : 3600) * 1000 - 30_000,
    email: typeof data.user?.email === 'string' ? data.user.email : '',
  };
}

export async function signInForDispatch(email: string, password: string): Promise<DispatchSession> {
  const session = await tokenRequest({ grant_type: 'password', email, password });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function signOutDispatch(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadDispatchSession(): Promise<DispatchSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DispatchSession) : null;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

/** A valid access token, refreshing when expired. Null when signed out. */
export async function getDispatchAccessToken(): Promise<string | null> {
  const session = await loadDispatchSession();
  if (!session) return null;
  if (session.expiresAt > Date.now()) return session.accessToken;
  if (!session.refreshToken) return null;
  // Serialize refresh: concurrent callers must not each rotate the refresh
  // token (all but one would fail and sign the driver out).
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshed = await tokenRequest({ grant_type: 'refresh_token', refresh_token: session.refreshToken });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
      return refreshed.accessToken;
    } catch {
      await signOutDispatch();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
