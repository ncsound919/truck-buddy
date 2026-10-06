'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { getSupabaseServer } from '@/lib/supabase/server';

export type AuthState = { error?: string; notice?: string } | null;

/**
 * Absolute origin for auth redirect links. Derived from the incoming request so
 * it is correct on Vercel without relying on a NEXT_PUBLIC_SITE_URL env var
 * (whose absence previously sent production confirmation links to
 * http://localhost:3005). Falls back to the env var, then to localhost.
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}


/** Create a new account. Profile row is backfilled by the DB trigger (schema.sql). */
export async function signUpAction(_prev: AuthState, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('name') || '').trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  const sb = await getSupabaseServer();
  const origin = await siteOrigin();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    // PKCE: the confirmation link carries ?code=, which only /auth/callback can
    // exchange. Sending it to /account (middleware-protected) dropped the code
    // and the account could never be confirmed.
    options: { data: { full_name: fullName || null }, emailRedirectTo: `${origin}/auth/callback?next=/account` },
  });
  if (error) return { error: error.message };

  // If email confirmation is required, tell the user; otherwise proceed to /account.
  if (data.session) {
    revalidatePath('/');
    redirect('/account');
  }
  return { notice: 'Check your email to confirm your account before signing in.' };
}

export async function signInAction(_prev: AuthState, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const sb = await getSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message };
  }
  revalidatePath('/');
  redirect('/portal');
}

export async function signOutAction() {
  const sb = await getSupabaseServer();
  await sb.auth.signOut();
  revalidatePath('/');
  redirect('/');
}
